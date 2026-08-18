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

  it('duration 默认 2500ms', () => {
    const el = makeToast();
    expect(el.duration).toBe(2500);
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

  it('show(msg, {type}) 渲染对应类型类名', () => {
    const el = makeToast();
    el.show('成功', { type: 'success' });
    expect(el.$('.toast-success')).not.toBeNull();
    el.dismiss();
    el.show('失败', { type: 'error' });
    expect(el.$('.toast-error')).not.toBeNull();
    el.dismiss();
    el.show('警告', { type: 'warning' });
    expect(el.$('.toast-warning')).not.toBeNull();
    el.dismiss();
  });

  it('show(msg, {type, duration}) 对象形式同时生效', () => {
    vi.useFakeTimers();
    const el = makeToast();
    el.show('带时长', { type: 'success', duration: 500 });
    expect(el.$('.toast-success')).not.toBeNull();
    vi.advanceTimersByTime(499);
    expect(el.$('.toast')).not.toBeNull();
    vi.advanceTimersByTime(2);
    vi.advanceTimersByTime(200);
    expect(el.$('.toast')).toBeNull();
    vi.useRealTimers();
  });

  it('duration: 0 表示常驻，不自动消失（loading 场景）', () => {
    vi.useFakeTimers();
    const el = makeToast();
    el.show('加载中…', { type: 'loading', duration: 0 });
    expect(el.$('.toast-loading')).not.toBeNull();
    // 即使推进很久，toast 仍存在
    vi.advanceTimersByTime(60000);
    expect(el.$('.toast-loading')).not.toBeNull();
    // 仍可手动 dismiss
    el.dismiss();
    vi.advanceTimersByTime(200);
    expect(el.$('.toast')).toBeNull();
    vi.useRealTimers();
  });

  it('closeOnClick 默认关闭：不拦截点击，pointer-events 为 none', () => {
    const el = makeToast();
    el.show('已保存', 2000);
    expect(el.$('.toast').style.getPropertyValue('--toast-pointer-events')).toBe('none');
  });

  it('closeOnClick: 点击 toast 主体即关闭', () => {
    vi.useFakeTimers();
    const el = makeToast();
    el.show('加载中…', { type: 'loading', duration: 0, closeOnClick: true });
    const toast = el.$('.toast');
    expect(toast.style.getPropertyValue('--toast-pointer-events')).toBe('auto');
    // 点击 toast 冒泡到宿主 → dismiss
    toast.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    vi.advanceTimersByTime(200);
    expect(el.$('.toast')).toBeNull();
    vi.useRealTimers();
  });

  it('XSS：type 含 HTML 被转义，不注入额外节点', () => {
    const el = makeToast();
    el.show('hi', { type: '<img src=x onerror=alert(1)>' });
    expect(el.$('.toast').querySelector('img[onerror]')).toBeNull();
    expect(el.$('.toast').className).toContain('toast-&lt;img');
  });

  it('unmounted：清理 timer + 重置单例', () => {
    vi.useFakeTimers();
    const el = makeToast();
    el.show('hi', 999999);
    expect(() => document.body.removeChild(el)).not.toThrow();
    vi.useRealTimers();
  });
});

describe('af-toast dismiss 分支（补充）', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('dismiss 无 .toast 元素时立即清空并派发', () => {
    const el = makeToast();
    el.show('hi', 999999);
    // 模拟 .toast 已被外部移除（但 _message 仍在）
    el.innerHTML = '';
    const handler = vi.fn();
    el.addEventListener('af-toast:dismiss', handler);
    el.dismiss();
    expect(el.$('.toast')).toBeNull();
    expect(el._message).toBe('');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ message: 'hi' });
  });
});
