import { describe, it, expect, vi } from 'vitest';
import { signal, effect } from '../src/lib/state.js';

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
