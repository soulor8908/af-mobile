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

  it('show 渲染 .toast + 自动消失（含退场动画）', () => {
    vi.useFakeTimers();
    const el = makeToast();
    el.show('已保存', 2000);
    expect(el.$('.toast').textContent).toBe('已保存');
    expect(el.$('.toast').getAttribute('aria-live')).toBe('polite');
    vi.advanceTimersByTime(2000);
    // 退场动画期间 .toast 仍在（opacity:0）
    expect(el.$('.toast')).not.toBeNull();
    vi.advanceTimersByTime(200);
    expect(el.$('.toast')).toBeNull();
    vi.useRealTimers();
  });

  it('单例：新 toast 替换旧 toast', () => {
    vi.useFakeTimers();
    const a = makeToast();
    const b = makeToast();
    a.show('A');
    b.show('B');
    // a 进入退场动画（.toast 仍在但 opacity:0）；b 立即显示
    expect(b.$('.toast').textContent).toBe('B');
    vi.advanceTimersByTime(200);
    expect(a.$('.toast')).toBeNull();
    vi.useRealTimers();
  });

  it('dismiss 派发 af-toast:dismiss（退场动画后触发）', () => {
    vi.useFakeTimers();
    const el = makeToast();
    const handler = vi.fn();
    el.addEventListener('af-toast:dismiss', handler);
    el.show('hi', 999999);
    el.dismiss();
    // 退场动画期间未触发
    expect(handler).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ message: 'hi' });
    vi.useRealTimers();
  });

  it('duration 默认 2000ms', () => {
    const el = makeToast();
    expect(el.duration).toBe(2000);
  });

  it('XSS：message 含 HTML 被转义，不执行脚本', () => {
    const el = makeToast();
    el.show('<img src=x onerror=alert(1)>', 999999);
    expect(el.$('.toast').querySelector('img[onerror]')).toBeNull();
    expect(el.$('.toast').textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('show(message, duration) 第二参覆盖默认', () => {
    vi.useFakeTimers();
    const el = makeToast();
    el.show('hi', 500);
    vi.advanceTimersByTime(499);
    expect(el.$('.toast')).not.toBeNull();
    vi.advanceTimersByTime(2);
    // 退场动画开始
    expect(el.$('.toast')).not.toBeNull();
    vi.advanceTimersByTime(200);
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
