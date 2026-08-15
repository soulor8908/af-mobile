import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfPullRefresh } from '../src/components/af-pull-refresh.js';
customElements.define('af-pull-refresh-test', AfPullRefresh);

function makePullRefresh(children = []) {
  const el = new AfPullRefresh();
  for (const c of children) el.appendChild(c);
  document.body.appendChild(el);
  return el;
}

function touch(el, type, clientY) {
  const event = new TouchEvent(type, {
    touches: [{ clientY, clientX: 0 }].map((t) => new Touch({ target: el, identifier: 0, ...t })),
    bubbles: true,
    cancelable: true,
  });
  el.dispatchEvent(event);
  return event;
}

describe('af-pull-refresh', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('渲染 indicator + content 容器', () => {
    const el = makePullRefresh();
    expect(el.$('[data-role="indicator"]')).not.toBeNull();
    expect(el.$('[data-role="content"]')).not.toBeNull();
  });

  it('indicator 默认 hidden', () => {
    const el = makePullRefresh();
    expect(el.$('[data-role="indicator"]').hidden).toBe(true);
  });

  it('slotted 子节点被搬入 content 容器', () => {
    const child = document.createElement('div');
    child.className = 'list';
    child.textContent = '列表内容';
    const el = makePullRefresh([child]);
    expect(el.$('[data-role="content"]').contains(child)).toBe(true);
  });

  it('下拉超过阈值后松手派发 af-pull-refresh:refresh', () => {
    const el = makePullRefresh();
    const handler = vi.fn();
    el.addEventListener('af-pull-refresh:refresh', handler);
    // 0.5 阻尼：300-100=200px 拉动 → damped=100*0.5+(200-100)*0.2=70px > 60 阈值
    touch(el, 'touchstart', 100);
    touch(el, 'touchmove', 300);
    touch(el, 'touchend', 300);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(el.refreshing).toBe(true);
  });

  it('下拉未超过阈值后松手收起不派发事件', () => {
    const el = makePullRefresh();
    const handler = vi.fn();
    el.addEventListener('af-pull-refresh:refresh', handler);
    // 0.5 阻尼：130-100=30px → damped=30*0.5=15px < 60 阈值
    touch(el, 'touchstart', 100);
    touch(el, 'touchmove', 130);
    touch(el, 'touchend', 130);
    expect(handler).not.toHaveBeenCalled();
    expect(el.refreshing).toBe(false);
  });

  it('endRefresh 收起指示器并清除 refreshing', () => {
    const el = makePullRefresh();
    el.refreshing = true;
    el.endRefresh();
    expect(el.refreshing).toBe(false);
    expect(el.$('[data-role="indicator"]').hidden).toBe(true);
  });

  it('refreshing=true 时显示加载指示器（spinner）', () => {
    const el = makePullRefresh();
    // 0.5 阻尼：300-100=200px → damped=70px > 60 阈值 → 触发 _startRefresh 显示 spinner
    touch(el, 'touchstart', 100);
    touch(el, 'touchmove', 300);
    touch(el, 'touchend', 300);
    expect(el.$('[data-role="indicator"]').querySelector('.spinner')).not.toBeNull();
  });

  it('content 容器有内容时 scrollTop>0 不启动下拉', () => {
    const el = makePullRefresh();
    const content = el.$('[data-role="content"]');
    // 模拟有滚动位置
    Object.defineProperty(content, 'scrollTop', { value: 10, configurable: true });
    const handler = vi.fn();
    el.addEventListener('af-pull-refresh:refresh', handler);
    touch(el, 'touchstart', 100);
    touch(el, 'touchmove', 200);
    touch(el, 'touchend', 200);
    // scrollTop>0 时 _pulling 不会被设为 true，touchend 不会触发 refresh
    expect(handler).not.toHaveBeenCalled();
  });

  it('内联 style 为空（遵守 wc-light-no-style，仅 setProperty 设 CSS 变量）', () => {
    const el = makePullRefresh();
    expect(el.style.cssText).toBe('');
  });

  it('unmounted 不报错', () => {
    const el = makePullRefresh();
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});
