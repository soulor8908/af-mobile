import { describe, it, expect, vi } from 'vitest';
import { signal, effect, computed } from '../src/lib/state.js';

describe('signal 基础', () => {
  it('读取初始值', () => {
    const s = signal(42);
    expect(s()).toBe(42);
  });

  it('set 更新值后读取新值', () => {
    const s = signal(0);
    s.set(1);
    expect(s()).toBe(1);
  });

  it('set 支持函数式更新', () => {
    const s = signal(10);
    s.set(v => v + 5);
    expect(s()).toBe(15);
  });

  it('set 相同值不触发通知（Object.is）', () => {
    const s = signal(1);
    const fn = vi.fn();
    s.on(fn);
    s.set(1);
    expect(fn).not.toHaveBeenCalled();
  });

  it('on 订阅收到新值', () => {
    const s = signal(0);
    const fn = vi.fn();
    s.on(fn);
    s.set(99);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('on 返回取消函数', () => {
    const s = signal(0);
    const fn = vi.fn();
    const stop = s.on(fn);
    stop();
    s.set(1);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('effect 自动依赖追踪', () => {
  it('effect 首次执行立即运行', () => {
    const fn = vi.fn();
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('effect 读取 signal 后，signal.set 触发 effect 重跑', () => {
    const s = signal(0);
    const fn = vi.fn(() => { s(); });
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    s.set(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('effect 未读取的 signal.set 不触发重跑', () => {
    const a = signal(0);
    const b = signal(0);
    const fn = vi.fn(() => { a(); });
    effect(fn);
    b.set(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('effect 返回取消函数，调用后不再响应 signal 变化', () => {
    const s = signal(0);
    const fn = vi.fn(() => { s(); });
    const stop = effect(fn);
    s.set(1);
    expect(fn).toHaveBeenCalledTimes(2);
    stop();
    s.set(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('effect 重跑前清理旧依赖（依赖切换场景）', () => {
    const a = signal(1);
    const b = signal(100);
    let log = [];
    effect(() => { log.push(a() > 0 ? b() : -1); });
    expect(log).toEqual([100]);
    b.set(200);           // 仍依赖 b
    expect(log).toEqual([100, 200]);
    a.set(-1);            // 切换到不依赖 b
    expect(log).toEqual([100, 200, -1]);
    b.set(300);           // 不应触发（已不依赖 b）
    expect(log).toEqual([100, 200, -1]);
    a.set(1);             // 切回依赖 b
    expect(log).toEqual([100, 200, -1, 300]);
  });
});

describe('computed 派生信号', () => {
  it('惰性求值：创建时不执行 fn', () => {
    const fn = vi.fn(() => 1);
    const c = computed(fn);
    expect(fn).not.toHaveBeenCalled();
  });

  it('首次读取时执行 fn 并缓存', () => {
    const a = signal(2);
    const fn = vi.fn(() => a() * 10);
    const c = computed(fn);
    expect(c()).toBe(20);
    expect(c()).toBe(20);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('依赖 signal 变化后，下次读取重新计算', () => {
    const a = signal(1);
    const c = computed(() => a() + 1);
    expect(c()).toBe(2);
    a.set(10);
    expect(c()).toBe(11);
  });

  it('依赖未变化时不重复计算', () => {
    const a = signal(1);
    const fn = vi.fn(() => a());
    const c = computed(fn);
    c(); c(); c();
    expect(fn).toHaveBeenCalledTimes(1);
    a.set(2);
    c(); c();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('computed 依赖 computed', () => {
    const a = signal(2);
    const b = computed(() => a() * 3);
    const d = computed(() => b() + 1);
    expect(d()).toBe(7);
    a.set(4);
    expect(d()).toBe(13);
  });

  it('computed.on 订阅派生信号变化', () => {
    const a = signal(1);
    const c = computed(() => a() * 2);
    const fn = vi.fn();
    c.on(fn);
    a.set(5);
    expect(fn).toHaveBeenCalled();
  });
});

import { batch } from '../src/lib/state.js';

describe('batch 批量更新', () => {
  it('batch 内多次 set 只触发一次 effect', () => {
    const a = signal(1);
    const b = signal(2);
    const fn = vi.fn(() => { a(); b(); });
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    batch(() => {
      a.set(10);
      b.set(20);
    });
    expect(fn).toHaveBeenCalledTimes(2);  // 只多 1 次
  });

  it('batch 内 set 同一 signal 多次只通知一次', () => {
    const s = signal(0);
    const fn = vi.fn(() => { s(); });
    effect(fn);
    batch(() => {
      s.set(1);
      s.set(2);
      s.set(3);
    });
    expect(fn).toHaveBeenCalledTimes(2);  // 首次 + batch 结束 1 次
  });

  it('嵌套 batch 不重复通知', () => {
    const s = signal(0);
    const fn = vi.fn(() => { s(); });
    effect(fn);
    batch(() => {
      s.set(1);
      batch(() => {
        s.set(2);
      });
      // 内层 batch 应不触发通知（外层未结束）
    });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('batch 外的 set 立即通知', () => {
    const s = signal(0);
    const fn = vi.fn(() => { s(); });
    effect(fn);
    s.set(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
