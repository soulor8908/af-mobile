import { describe, it, expect, vi } from 'vitest';
import { signal } from '../src/lib/state.js';

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
