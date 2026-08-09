import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfToast } from '../src/components/af-toast.js';
customElements.define('af-toast', AfToast);

function makeToast() {
  const el = new AfToast();
  document.body.appendChild(el);
  return el;
}

describe('af-toast', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('show 渲染 .toast + 自动消失', () => {
    vi.useFakeTimers();
    const el = makeToast();
    el.show('已保存', 2000);
    expect(el.$('.toast').textContent).toBe('已保存');
    expect(el.$('.toast').getAttribute('aria-live')).toBe('polite');
    vi.advanceTimersByTime(2000);
    expect(el.$('.toast')).toBeNull();
    vi.useRealTimers();
  });

  it('单例：新 toast 替换旧 toast', () => {
    vi.useFakeTimers();
    const a = makeToast();
    const b = makeToast();
    a.show('A');
    b.show('B');
    // a 应被清空
    expect(a.$('.toast')).toBeNull();
    expect(b.$('.toast').textContent).toBe('B');
    vi.useRealTimers();
  });

  it('dismiss 派发 af-toast:dismiss', () => {
    const el = makeToast();
    const handler = vi.fn();
    el.addEventListener('af-toast:dismiss', handler);
    el.show('hi', 999999);
    el.dismiss();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ message: 'hi' });
  });

  it('duration 默认 2000ms', () => {
    const el = makeToast();
    expect(el.duration).toBe(2000);
  });

  it('show(message, duration) 第二参覆盖默认', () => {
    vi.useFakeTimers();
    const el = makeToast();
    el.show('hi', 500);
    vi.advanceTimersByTime(499);
    expect(el.$('.toast')).not.toBeNull();
    vi.advanceTimersByTime(2);
    expect(el.$('.toast')).toBeNull();
    vi.useRealTimers();
  });

  it('unmounted：清理 timer + 重置单例', () => {
    vi.useFakeTimers();
    const el = makeToast();
    el.show('hi', 999999);
    expect(() => document.body.removeChild(el)).not.toThrow();
    vi.useRealTimers();
  });
});
