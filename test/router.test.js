import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  route, go, current, start, notFound,
  beforeEach as routerBeforeEach,
  afterEach as routerAfterEach,
  back, forward, _resetRouter,
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
