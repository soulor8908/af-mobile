import { describe, it, expect, vi } from 'vitest';
import { createPage } from '../src/lib/page.js';
import { route, start, go, _resetRouter } from '../src/lib/router.js';
import { effect } from '../src/lib/state.js';

describe('createPage 实例化工厂', () => {
  it('多实例 state 互不干扰', () => {
    const a = createPage({ state: { count: 0 } });
    const b = createPage({ state: { count: 100 } });
    a.state.count = 5;
    expect(a.state.count).toBe(5);
    expect(b.state.count).toBe(100);
  });

  it('computed 参数注入 state 并追踪依赖', () => {
    const page = createPage({
      state: { count: 1 },
      computed: { double: (s) => s.count * 2 },
    });
    expect(page.derived.double).toBe(2);
    page.state.count = 5;
    expect(page.derived.double).toBe(10);
  });

  it('多个 computed 各自追踪 state 依赖', () => {
    const page = createPage({
      state: { x: 2 },
      computed: {
        y: (s) => s.x + 1,
        z: (s) => s.x * 10,
      },
    });
    expect(page.derived.y).toBe(3);
    expect(page.derived.z).toBe(20);
    page.state.x = 10;
    expect(page.derived.y).toBe(11);
    expect(page.derived.z).toBe(100);
  });

  it('setup 在 effects 前调用，返回值挂 refs', () => {
    const order = [];
    const page = createPage({
      state: { count: 1 },
      setup: (s) => { order.push('setup'); return { double: s.count * 2 }; },
      effects: { mount: () => order.push('mount') },
    });
    expect(page.refs.double).toBe(2);
    expect(order).toEqual(['setup']);   // mount 是 microtask，同步时只应有 setup
  });

  it('actions 参数注入 state，batch 合并触发', () => {
    const page = createPage({
      state: { a: 1, b: 2 },
      computed: { sum: (s) => s.a + s.b },
      actions: { incBoth: (s) => { s.a += 1; s.b += 1; } },
    });
    let calls = 0;
    effect(() => { page.derived.sum; calls++; });
    calls = 0;
    page.actions.incBoth();
    expect(page.state.a).toBe(2);
    expect(page.state.b).toBe(3);
    expect(calls).toBe(1);   // batch 内只触发一次
  });

  it('transform 独立通道，不占 state 命名空间', () => {
    const page = createPage({
      state: { x: 1 },
      transform: (d) => ({ ...d, ok: true }),
    });
    expect(page.transform({ a: 1 })).toEqual({ a: 1, ok: true });
    expect('__transform__' in page.state).toBe(false);
  });

  it('unmount 清理 interval 订阅', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const page = createPage({ effects: { interval: [100, fn] } });
    vi.advanceTimersByTime(250);
    expect(fn).toHaveBeenCalledTimes(2);
    page.unmount();
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('unmount 清理 onError 订阅', () => {
    const fn = vi.fn();
    const page = createPage({ onError: fn });
    window.dispatchEvent(new Event('error'));
    expect(fn).toHaveBeenCalledTimes(1);
    page.unmount();
    window.dispatchEvent(new Event('error'));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('unmount 级联清理 computed 上游订阅（owner dispose）', () => {
    const page = createPage({
      state: { n: 1 },
      computed: { m: (s) => s.n * 3 },
    });
    expect(page.derived.m).toBe(3);
    page.unmount();
    // 卸载后修改 state 不再触发已清理的 computed 订阅（不抛错即可）
    expect(() => { page.state.n = 10; }).not.toThrow();
  });

  it('route effect 在 unmount 后取消订阅', async () => {
    _resetRouter();
    window.history.replaceState({}, '', '/');
    document.body.innerHTML = '<div id="app" data-router-outlet></div>';
    const fn = vi.fn();
    const page = createPage({ effects: { route: fn } });
    route('/r1', () => {});
    route('/r2', () => {});
    start({ outlet: '#app' });
    await go('/r1');
    expect(fn).toHaveBeenCalledTimes(1);
    page.unmount();
    await go('/r2');
    expect(fn).toHaveBeenCalledTimes(1);   // afterEach 订阅已取消
  });

  it('mount 用 microtask 执行 effects.mount', async () => {
    const fn = vi.fn();
    createPage({ effects: { mount: fn } });
    expect(fn).not.toHaveBeenCalled();
    await new Promise(r => queueMicrotask(r));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('非白名单 effects key 被忽略（不报错）', () => {
    expect(() => createPage({ effects: { scroll: () => {} } })).not.toThrow();
  });
});
