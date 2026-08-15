import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AfCountdown } from '../src/components/af-countdown.js';
customElements.define('af-countdown-test', AfCountdown);

function makeCountdown(props = {}) {
  const el = new AfCountdown();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-countdown', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });
  afterEach(() => { vi.useRealTimers(); });

  it('渲染 mm:ss 格式', () => {
    const el = makeCountdown({ time: 65, autostart: false });
    expect(el.$('[data-role="countdown"]').textContent).toBe('01:05');
  });

  it('autostart 默认开始倒计时', () => {
    const el = makeCountdown({ time: 3 });
    expect(el.$('[data-role="countdown"]').textContent).toBe('00:03');
    vi.advanceTimersByTime(1000);
    expect(el.$('[data-role="countdown"]').textContent).toBe('00:02');
  });

  it('autostart=false 不自动开始', () => {
    const el = makeCountdown({ time: 3, autostart: false });
    vi.advanceTimersByTime(3000);
    expect(el.$('[data-role="countdown"]').textContent).toBe('00:03');
  });

  it('到 0 派发 af-countdown:end 并停止', () => {
    const el = makeCountdown({ time: 2 });
    const end = vi.fn();
    const change = vi.fn();
    el.addEventListener('af-countdown:end', end);
    el.addEventListener('af-countdown:change', change);
    vi.advanceTimersByTime(2000);
    expect(el.$('[data-role="countdown"]').textContent).toBe('00:00');
    expect(change).toHaveBeenCalled();
    expect(end).toHaveBeenCalledTimes(1);
    // 到 0 后不再 tick
    vi.advanceTimersByTime(2000);
    expect(el.$('[data-role="countdown"]').textContent).toBe('00:00');
  });

  it('pause 保留剩余时间', () => {
    const el = makeCountdown({ time: 5 });
    vi.advanceTimersByTime(2000);
    el.pause();
    vi.advanceTimersByTime(5000);
    expect(el.$('[data-role="countdown"]').textContent).toBe('00:03');
  });

  it('reset 回到 time 初始值', () => {
    const el = makeCountdown({ time: 10 });
    vi.advanceTimersByTime(4000);
    el.reset();
    expect(el.$('[data-role="countdown"]').textContent).toBe('00:10');
  });

  it('unmounted 清理定时器', () => {
    const el = makeCountdown({ time: 5 });
    document.body.removeChild(el);
    vi.advanceTimersByTime(5000); // 不抛错即可
    expect(() => vi.runAllTimers()).not.toThrow();
  });
});