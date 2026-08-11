import { describe, it, expect, vi, beforeEach } from 'vitest';
import { definePage, state, derived, actions, clearPageState, getTransition, getKeepAlive, _resetPage } from '../src/lib/page.js';
import { effect } from '../src/lib/state.js';

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
