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
