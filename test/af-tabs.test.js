import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfTabs } from '../src/components/af-tabs.js';
customElements.define('af-tabs', AfTabs);

const TABS = [
  { label: 'Tab 1', value: 'a' },
  { label: 'Tab 2', value: 'b' },
  { label: 'Tab 3', value: 'c', disabled: true },
];

function makeTabs(props = {}) {
  const el = new AfTabs();
  el.tabs = TABS;
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-tabs', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('渲染 tablist + 3 个 tab-item', () => {
    const el = makeTabs();
    expect(el.$('.tabbar').getAttribute('role')).toBe('tablist');
    expect(el.$$('.tab-item').length).toBe(3);
  });

  it('setActive 切换激活 + ARIA', () => {
    const el = makeTabs();
    el.setActive(1);
    const tabs = el.$$('.tab-item');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
    expect(tabs[1].getAttribute('tabindex')).toBe('0');
    expect(tabs[0].getAttribute('tabindex')).toBe('-1');
  });

  it('点击 tab 触发 af-tabs:change + setActive', () => {
    const el = makeTabs();
    const handler = vi.fn();
    el.addEventListener('af-tabs:change', handler);
    el.$$('.tab-item')[1].click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ index: 1, value: 'b' });
  });

  it('disabled tab 不可选中', () => {
    const el = makeTabs();
    const handler = vi.fn();
    el.addEventListener('af-tabs:change', handler);
    el.$$('.tab-item')[2].click(); // disabled
    expect(handler).not.toHaveBeenCalled();
  });

  it('键盘 ArrowRight 在可选项之间循环', () => {
    const el = makeTabs();
    el.setActive(0);
    const tabbar = el.$('.tabbar');
    tabbar.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(el.activeIndex).toBe(1); // 0 → 1（跳过 disabled 的 2）
  });

  it('Home / End 跳到首/末项', () => {
    const el = makeTabs();
    el.setActive(1);
    el.$('.tabbar').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(el.activeIndex).toBe(0);
    el.$('.tabbar').dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(el.activeIndex).toBe(1); // 末可选项是 1（2 disabled）
  });

  it('renderPanel 函数驱动 panel 渲染', () => {
    const el = makeTabs();
    el.renderPanel = (tab, i) => `<p>Content ${i}</p>`;
    const panels = el.$$('.af-tabs-panel');
    expect(panels.length).toBe(3);
    expect(panels[0].innerHTML).toContain('Content 0');
    expect(panels[0].getAttribute('role')).toBe('tabpanel');
  });

  it('setActive 隐藏非激活 panel', () => {
    const el = makeTabs();
    el.renderPanel = (tab, i) => `<p>P${i}</p>`;
    el.setActive(1);
    const panels = el.$$('.af-tabs-panel');
    expect(panels[0].hidden).toBe(true);
    expect(panels[1].hidden).toBe(false);
  });

  it('onAttributeChange：tabs 属性变化触发重渲染', () => {
    const el = makeTabs();
    el.setAttribute('tabs', JSON.stringify([{ label: 'X', value: 'x' }]));
    expect(el.$$('.tab-item').length).toBe(1);
  });

  it('onAttributeChange：active-index 属性变化触发切换', () => {
    const el = makeTabs();
    el.setAttribute('active-index', '1');
    expect(el.activeIndex).toBe(1);
  });

  it('fixed=true 添加 tabbar-fixed class', () => {
    const el = makeTabs({ fixed: true });
    expect(el.$('.tabbar').classList.contains('tabbar-fixed')).toBe(true);
  });
});
