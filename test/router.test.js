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
