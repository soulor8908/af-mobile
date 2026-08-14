import { describe, it, expect, vi, beforeEach } from 'vitest';
import { definePage, createPage, state, derived, actions, clearPageState, getTransition, getKeepAlive, _resetPage, destroyPage } from '../packages/ui/src/lib/page.js';
import { route, start, go, _resetRouter } from '../packages/ui/src/lib/router.js';
import { effect } from '../packages/ui/src/lib/state.js';

beforeEach(() => { _resetPage(); });

describe('definePage state 原语', () => {
  it('声明字段后可读写', () => {
    definePage({ state: { tab: 'all', loading: false } });
    expect(state.tab).toBe('all');
    expect(state.loading).toBe(false);
    state.tab = 'mine';
    expect(state.tab).toBe('mine');
  });

  it('重复 definePage 同名字段更新值', () => {
    definePage({ state: { tab: 'a' } });
    definePage({ state: { tab: 'b' } });
    expect(state.tab).toBe('b');
  });
});

describe('definePage computed 原语', () => {
  it('自动追踪 state 依赖', () => {
    definePage({
      state: { count: 1 },
      computed: { doubled: () => state.count * 2 },
    });
    expect(derived.doubled).toBe(2);
    state.count = 5;
    expect(derived.doubled).toBe(10);
  });

  it('computed 链式依赖', () => {
    definePage({
      state: { x: 2 },
      computed: {
        y: () => state.x + 1,
        z: () => derived.y * 10,
      },
    });
    expect(derived.z).toBe(30);
    state.x = 10;
    expect(derived.z).toBe(110);
  });
});

describe('definePage actions 原语', () => {
  it('actions 修改 state 触发 computed 重算', () => {
    definePage({
      state: { list: [1, 2, 3] },
      computed: { total: () => state.list.reduce((s, i) => s + i, 0) },
      actions: { add: (n) => state.list = [...state.list, n] },
    });
    expect(derived.total).toBe(6);
    actions.add(4);
    expect(derived.total).toBe(10);
  });

  it('actions 多次赋值 batch 合并 effect 触发', () => {
    let callCount = 0;
    definePage({
      state: { a: 1, b: 2 },
      computed: { sum: () => state.a + state.b },
      actions: { incBoth: () => { state.a = state.a + 1; state.b = state.b + 1; } },
    });
    effect(() => { derived.sum; callCount++; });
    callCount = 0;
    actions.incBoth();
    expect(callCount).toBe(1); // batch 内 effect 只触发一次
  });
});

describe('definePage effects 原语', () => {
  it('mount 用 microtask 执行', async () => {
    const fn = vi.fn();
    definePage({ effects: { mount: fn } });
    expect(fn).not.toHaveBeenCalled();
    await new Promise(r => queueMicrotask(r));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('interval 周期触发并清理', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    definePage({ effects: { interval: [1000, fn] } });
    vi.advanceTimersByTime(3500);
    expect(fn).toHaveBeenCalledTimes(3);
    clearPageState();
    vi.advanceTimersByTime(5000);
    expect(fn).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it('非白名单 key 被忽略（不报错）', () => {
    expect(() => definePage({ effects: { scroll: () => {} } })).not.toThrow();
  });
});

describe('definePage onError 原语', () => {
  it('捕获 window error 事件', () => {
    const fn = vi.fn();
    definePage({ onError: fn });
    window.dispatchEvent(new Event('error'));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('definePage transition / keepAlive', () => {
  it('配置存取', () => {
    definePage({ transition: 'slide', keepAlive: true });
    expect(getTransition()).toBe('slide');
    expect(getKeepAlive()).toBe(true);
  });
});

describe('clearPageState 清理', () => {
  it('清理 interval 订阅', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    definePage({ effects: { interval: [100, fn] } });
    vi.advanceTimersByTime(250);
    expect(fn).toHaveBeenCalledTimes(2);
    clearPageState();
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('清理 onError 订阅', () => {
    const fn = vi.fn();
    definePage({ onError: fn });
    clearPageState();
    window.dispatchEvent(new Event('error'));
    expect(fn).not.toHaveBeenCalled();
  });
});

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
});

describe('destroyPage 全局销毁', () => {
  it('清空 state/computed/action 字段并清理 effect 订阅', () => {
    const intervalCb = vi.fn();
    definePage({
      state: { tab: 'x' },
      computed: { d: () => state.tab + '!' },
      actions: { go: () => {} },
      effects: { interval: [10, intervalCb] },
    });
    expect(state.tab).toBe('x');
    expect(derived.d).toBe('x!');
    expect(typeof actions.go).toBe('function');

    destroyPage();

    expect(state.tab).toBeUndefined();
    expect(derived.d).toBeUndefined();
    expect(actions.go).toBeUndefined();
    // interval 已清理，等待两个周期后不新增调用
    const before = intervalCb.mock.calls.length;
    return new Promise(r => setTimeout(() => {
      expect(intervalCb.mock.calls.length).toBe(before);
      r();
    }, 30));
  });

  it('销毁后可重新 definePage', () => {
    definePage({ state: { count: 1 } });
    destroyPage();
    definePage({ state: { count: 2 } });
    expect(state.count).toBe(2);
  });
});
