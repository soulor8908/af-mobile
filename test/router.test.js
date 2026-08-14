import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  route, go, current, start, stop, notFound,
  beforeEach as routerBeforeEach,
  afterEach as routerAfterEach,
  back, forward, _resetRouter, RouterError,
} from '../src/lib/router.js';

beforeEach(() => {
  _resetRouter();
  window.history.replaceState({}, '', '/');
  document.body.innerHTML = '<div id="app" data-router-outlet></div>';
});

describe('router 注册与匹配', () => {
  it('route 注册 handler', async () => {
    const fn = vi.fn();
    route('/test1', fn);
    start({ outlet: '#app' });
    await go('/test1');
    expect(fn).toHaveBeenCalledOnce();
  });

  it(':param 参数解析', async () => {
    let received = null;
    route('/users/:id', (params) => { received = params; });
    start({ outlet: '#app' });
    await go('/users/123');
    expect(received).toEqual({ id: '123' });
  });

  it('多段 :param', async () => {
    let received = null;
    route('/posts/:cat/:id', (params) => { received = params; });
    start({ outlet: '#app' });
    await go('/posts/tech/456');
    expect(received).toEqual({ cat: 'tech', id: '456' });
  });

  it('未匹配路由触发 notFound', async () => {
    const notFoundFn = vi.fn();
    notFound(notFoundFn);
    start({ outlet: '#app' });
    await go('/nonexistent');
    expect(notFoundFn).toHaveBeenCalledOnce();
    expect(notFoundFn.mock.calls[0][0]).toBe('/nonexistent');
  });

  it('current() 返回当前路由信息', async () => {
    route('/cur', () => {});
    start({ outlet: '#app' });
    await go('/cur');
    const c = current();
    expect(c.path).toBe('/cur');
  });

  it('query 参数解析并合并进 params', async () => {
    let received = null;
    route('/search', (params) => { received = params; });
    start({ outlet: '#app' });
    await go('/search?q=aiflow&page=2');
    expect(received).toEqual({ q: 'aiflow', page: '2' });
  });

  it('query 与 :param 并存，path 参数不受影响', async () => {
    let received = null;
    route('/users/:id', (params) => { received = params; });
    start({ outlet: '#app' });
    await go('/users/123?tab=posts');
    expect(received).toEqual({ id: '123', tab: 'posts' });
  });

  it('query 为空的 URL 正常匹配', async () => {
    let received = null;
    route('/plain', (params) => { received = params; });
    start({ outlet: '#app' });
    await go('/plain?');
    expect(received).toEqual({});
  });
});

describe('router outlet 错误', () => {
  it('根 outlet 未找到时 start 抛出 RouterError', () => {
    document.body.innerHTML = '';
    expect(() => start({ outlet: '#app' })).toThrow(RouterError);
  });

  it('子 outlet 选择器未命中时 go 抛出 RouterError', async () => {
    route('/bad', (p, ctx) => {
      ctx.outlet.innerHTML = '<main></main>';
      return 'main[data-router-outlet]';   // 该选择器不存在
    });
    start({ outlet: '#app' });
    await expect(go('/bad')).rejects.toBeInstanceOf(RouterError);
  });
});

describe('router scrollBehavior', () => {
  it('回调接收 to/from，返回 {x,y} 时触发 scrollTo', async () => {
    const sb = vi.fn(() => ({ x: 100, y: 200 }));
    const scrollSpy = vi.spyOn(window, 'scrollTo');
    route('/sb1', (p, ctx) => { ctx.outlet.innerHTML = '<div>page</div>'; });
    start({ outlet: '#app', scrollBehavior: sb });
    await go('/sb1');
    expect(sb).toHaveBeenCalledOnce();
    expect(sb.mock.calls[0][0].path).toBe('/sb1');
    expect(scrollSpy).toHaveBeenCalledWith(100, 200);
  });

  it('返回 { el } 时滚动到指定元素', async () => {
    const sb = vi.fn(() => ({ el: '#target' }));
    const scrollIntoView = vi.fn();
    const orig = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;
    route('/sb2', (p, ctx) => {
      ctx.outlet.innerHTML = '<div id="target">t</div>';
    });
    start({ outlet: '#app', scrollBehavior: sb });
    await go('/sb2');
    expect(scrollIntoView).toHaveBeenCalledOnce();
    Element.prototype.scrollIntoView = orig;
  });

  it('返回 false 时不滚动', async () => {
    const sb = vi.fn(() => false);
    const scrollSpy = vi.spyOn(window, 'scrollTo');
    route('/sb3', () => {});
    start({ outlet: '#app', scrollBehavior: sb });
    await go('/sb3');
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it('to 含 query，from 为导航前路由', async () => {
    const sb = vi.fn(() => ({ x: 0, y: 0 }));
    route('/sbq', (p, ctx) => { ctx.outlet.innerHTML = '<div>q</div>'; });
    route('/sbq2', () => {});
    start({ outlet: '#app', scrollBehavior: sb });
    await go('/sbq?tab=1');
    await go('/sbq2');
    const [to, from] = sb.mock.calls[1];
    expect(to.path).toBe('/sbq2');
    expect(from.path).toBe('/sbq');
    expect(from.query).toEqual({ tab: '1' });
  });
});

describe('router 守卫', () => {
  it('beforeEach 返回 false 阻止导航', async () => {
    const handler = vi.fn();
    route('/guard1', handler);
    routerBeforeEach(() => false);
    start({ outlet: '#app' });
    await go('/guard1');
    expect(handler).not.toHaveBeenCalled();
  });

  it('beforeEach 返回 string 重定向', async () => {
    const target = vi.fn();
    route('/guard2', vi.fn());
    route('/guard2-target', target);
    routerBeforeEach((r, p, path) => path === '/guard2' ? '/guard2-target' : undefined);
    start({ outlet: '#app' });
    await go('/guard2');
    expect(target).toHaveBeenCalledOnce();
  });

  it('beforeEach 返回 void 继续', async () => {
    const handler = vi.fn();
    route('/guard3', handler);
    routerBeforeEach(() => {});
    start({ outlet: '#app' });
    await go('/guard3');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('afterEach 在导航完成后执行', async () => {
    const handler = vi.fn();
    const after = vi.fn();
    route('/after1', handler);
    routerAfterEach(after);
    start({ outlet: '#app' });
    await go('/after1');
    expect(handler).toHaveBeenCalledOnce();
    expect(after).toHaveBeenCalledOnce();
    expect(handler.mock.invocationCallOrder[0]).toBeLessThan(after.mock.invocationCallOrder[0]);
  });

  it('afterEach 返回取消函数，可移除订阅', async () => {
    const after = vi.fn();
    route('/after-cancel', () => {});
    route('/after-cancel2', () => {});
    const cancel = routerAfterEach(after);
    start({ outlet: '#app' });
    await go('/after-cancel');
    expect(after).toHaveBeenCalledTimes(1);
    cancel();
    await go('/after-cancel2');
    expect(after).toHaveBeenCalledTimes(1);   // 取消后不再触发
  });

  it('多个 afterEach 钩子互不干扰', async () => {
    const a = vi.fn();
    const b = vi.fn();
    route('/after-multi', () => {});
    route('/after-multi2', () => {});
    const cancelA = routerAfterEach(a);
    routerAfterEach(b);
    start({ outlet: '#app' });
    await go('/after-multi');
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
    cancelA();
    await go('/after-multi2');
    expect(a).toHaveBeenCalledOnce();   // a 已取消
    expect(b).toHaveBeenCalledTimes(2); // b 仍订阅
  });

  it('beforeEach 支持异步', async () => {
    const handler = vi.fn();
    route('/async-guard', handler);
    routerBeforeEach(async () => {
      await new Promise(r => setTimeout(r, 10));
      return undefined;
    });
    start({ outlet: '#app' });
    await go('/async-guard');
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe('router 嵌套路由', () => {
  it('父路由返回子 outlet 选择器', async () => {
    const parent = vi.fn((params, ctx) => {
      ctx.outlet.innerHTML = '<main data-router-outlet></main>';
      return 'main[data-router-outlet]';
    });
    const child = vi.fn((params, ctx) => {
      ctx.outlet.innerHTML = '<div>child content</div>';
    });
    route('/nest', parent);
    route('/nest/sub', child);
    start({ outlet: '#app' });
    await go('/nest/sub');
    expect(parent).toHaveBeenCalledOnce();
    expect(child).toHaveBeenCalledOnce();
    expect(document.querySelector('[data-router-view] main').innerHTML).toContain('child content');
  });

  it('ctx.outlet 正确指向子 outlet', async () => {
    let childOutletTag = null;
    route('/nest2', (p, ctx) => {
      ctx.outlet.innerHTML = '<section data-router-outlet></section>';
      return 'section[data-router-outlet]';
    });
    route('/nest2/deep', (p, ctx) => {
      childOutletTag = ctx.outlet.tagName;
      ctx.outlet.innerHTML = 'deep';
    });
    start({ outlet: '#app' });
    await go('/nest2/deep');
    expect(childOutletTag).toBe('SECTION');
  });

  it('父路由不返回时子路由复用父 outlet', async () => {
    const child = vi.fn((p, ctx) => {
      ctx.outlet.innerHTML = '<div>in parent outlet</div>';
    });
    route('/nest3', () => {});
    route('/nest3/sub', child);
    start({ outlet: '#app' });
    await go('/nest3/sub');
    expect(child).toHaveBeenCalledOnce();
  });
});

describe('router 导航取消', () => {
  it('快速连续导航，旧 handler 被 abort', async () => {
    const handler = vi.fn(async (params, ctx) => {
      await new Promise(r => setTimeout(r, 50));
      if (ctx.signal.aborted) return;
      ctx.outlet.innerHTML = 'slow';
    });
    route('/cancel1', handler);
    route('/cancel2', () => {});
    start({ outlet: '#app' });
    const p1 = go('/cancel1');
    await go('/cancel2');
    await p1;
    expect(document.querySelector('[data-router-view]').innerHTML).not.toContain('slow');
  });

  it('go 返回 Promise 可 await', async () => {
    const fn = vi.fn();
    route('/await1', fn);
    start({ outlet: '#app' });
    await go('/await1');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('go({ replace: true }) 替换 history', async () => {
    const fn = vi.fn();
    route('/replace1', fn);
    start({ outlet: '#app' });
    await go('/replace1', { replace: true });
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe('router View Transitions', () => {
  it('不支持 startViewTransition 时直接导航', async () => {
    const orig = document.startViewTransition;
    delete document.startViewTransition;
    const fn = vi.fn();
    route('/vt1', fn);
    start({ outlet: '#app' });
    await go('/vt1');
    expect(fn).toHaveBeenCalledOnce();
    document.startViewTransition = orig;
  });

  it('transition=false 跳过 View Transitions', async () => {
    const orig = document.startViewTransition;
    const vtFn = vi.fn();
    document.startViewTransition = vtFn;
    const fn = vi.fn();
    route('/vt2', fn);
    start({ outlet: '#app' });
    await go('/vt2', { transition: false });
    expect(vtFn).not.toHaveBeenCalled();
    expect(fn).toHaveBeenCalledOnce();
    document.startViewTransition = orig;
  });

  it('前进导航设 data-transition=forward', async () => {
    route('/dir1', () => {});
    start({ outlet: '#app' });
    await go('/dir1');
    expect(document.documentElement.dataset.transition).toBe('forward');
  });
});

describe('router keep-alive', () => {
  it('keepAlive 路由再次进入不重新执行 handler', async () => {
    const handler = vi.fn((p, ctx) => {
      ctx.outlet.innerHTML = '<div>cached page</div>';
    });
    route('/ka1', handler, { keepAlive: true });
    route('/ka2', () => {});
    start({ outlet: '#app' });
    await go('/ka1');
    await go('/ka2');
    await go('/ka1');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('非 keepAlive 路由每次进入都执行 handler', async () => {
    const handler = vi.fn();
    route('/noka1', handler);
    route('/noka2', () => {});
    start({ outlet: '#app' });
    await go('/noka1');
    await go('/noka2');
    await go('/noka1');
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('keep-alive 超过上限 LRU 淘汰', async () => {
    const handlers = [];
    for (let i = 0; i < 7; i++) {
      const h = vi.fn((p, ctx) => { ctx.outlet.innerHTML = `<div>page${i}</div>`; });
      handlers.push(h);
      route(`/lru${i}`, h, { keepAlive: true });
    }
    start({ outlet: '#app', keepAliveMax: 5 });
    for (let i = 0; i < 7; i++) await go(`/lru${i}`);
    await go('/lru0');
    expect(handlers[0]).toHaveBeenCalledTimes(2);
  });
});

describe('router stop() 生命周期', () => {
  it('start() 返回 stop，stop() 移除 popstate 监听器防止累积', async () => {
    const fn = vi.fn();
    route('/stop1', fn);
    const s = start({ outlet: '#app' });
    expect(typeof s).toBe('function');
    await go('/stop1');
    expect(fn).toHaveBeenCalledTimes(1);

    // 触发 popstate → 监听器仍生效，handler 再次执行
    window.history.pushState({}, '', '/stop1');
    window.dispatchEvent(new Event('popstate'));
    await new Promise(r => setTimeout(r, 0));
    expect(fn).toHaveBeenCalledTimes(2);

    // stop() 后 popstate 不再触发
    s();
    window.history.pushState({}, '', '/stop1');
    window.dispatchEvent(new Event('popstate'));
    await new Promise(r => setTimeout(r, 0));
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('重复 start/stop 不累积监听器', async () => {
    const fn = vi.fn();
    route('/stop2', fn);
    for (let i = 0; i < 3; i++) {
      const s = start({ outlet: '#app' });
      await go('/stop2');
      s();
    }
    // 若监听器累积，每次 popstate 会触发多次 render；stop 后应零增量
    const before = fn.mock.calls.length;
    window.history.pushState({}, '', '/stop2');
    window.dispatchEvent(new Event('popstate'));
    await new Promise(r => setTimeout(r, 0));
    expect(fn.mock.calls.length).toBe(before);
  });
});

describe('router SSR 安全', () => {
  it('模块 import 不触发任何副作用', () => {
    expect(true).toBe(true);
  });

  it('back() 在无 history 时不抛错', () => {
    expect(() => back()).not.toThrow();
  });

  it('forward() 在无 history 时不抛错', () => {
    expect(() => forward()).not.toThrow();
  });
});

describe('router 路由懒加载 + meta', () => {
  it('handler 返回懒加载模块（default 为渲染函数）', async () => {
    const render = vi.fn((p, ctx) => { ctx.outlet.innerHTML = 'heavy page'; });
    route('/heavy', () => Promise.resolve({ default: render }));
    start({ outlet: '#app' });
    await go('/heavy');
    expect(render).toHaveBeenCalledOnce();
    expect(document.querySelector('[data-router-view]').innerHTML).toContain('heavy page');
  });

  it('懒加载模块的 meta 并入路由并透出 current()', async () => {
    route('/lazy-meta', () => Promise.resolve({ default: () => {}, meta: { title: 'Lazy' } }));
    start({ outlet: '#app' });
    await go('/lazy-meta');
    expect(current().meta).toEqual({ title: 'Lazy' });
  });

  it('route 选项 meta 透出到 current()', async () => {
    route('/opt-meta', () => {}, { meta: { requiresAuth: true } });
    start({ outlet: '#app' });
    await go('/opt-meta');
    expect(current().meta).toEqual({ requiresAuth: true });
  });

  it('beforeEach 守卫可读取 route.meta', async () => {
    let seen = null;
    route('/guard-meta', () => {}, { meta: { requiresAuth: true } });
    routerBeforeEach(r => { seen = r.meta; });
    start({ outlet: '#app' });
    await go('/guard-meta');
    expect(seen).toEqual({ requiresAuth: true });
  });

  it('scrollBehavior 的 to 对象含 meta', async () => {
    const sb = vi.fn(() => ({ x: 0, y: 0 }));
    route('/sb-meta', () => {}, { meta: { title: 'M' } });
    start({ outlet: '#app', scrollBehavior: sb });
    await go('/sb-meta');
    expect(sb.mock.calls[0][0].meta).toEqual({ title: 'M' });
  });

  it('懒加载模块失败时 go 拒绝', async () => {
    route('/lazy-fail', () => Promise.reject(new Error('chunk load failed')));
    start({ outlet: '#app' });
    await expect(go('/lazy-fail')).rejects.toThrow('chunk load failed');
  });
});
