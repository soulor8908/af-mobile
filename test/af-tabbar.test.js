import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfTabbar } from '../src/components/af-tabbar.js';
customElements.define('af-tabbar-test', AfTabbar);

function makeTabbar(props = {}) {
  const el = new AfTabbar();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

const TABS = [
  { label: '首页', value: 'home', icon: '⌂' },
  { label: '发现', value: 'discover' },
  { label: '我的', value: 'me', badge: '5' },
];

describe('af-tabbar', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('渲染 tabbar 与 tab-item', () => {
    const el = makeTabbar({ tabs: TABS });
    expect(el.$('.tabbar').getAttribute('role')).toBe('tablist');
    expect(el.$$('.tab-item').length).toBe(3);
  });

  it('badge 渲染为 .badge 元素', () => {
    const el = makeTabbar({ tabs: TABS });
    expect(el.$$('.badge').length).toBe(1);
    expect(el.$$('.badge')[0].textContent).toBe('5');
  });

  it('icon 与 label 渲染到对应 data-role', () => {
    const el = makeTabbar({ tabs: TABS });
    expect(el.$$('.tab-item')[0].querySelector('[data-role="icon"]').textContent).toBe('⌂');
    expect(el.$$('.tab-item')[0].querySelector('[data-role="label"]').textContent).toBe('首页');
  });

  it('点击 tab-item 切换激活态并派发 af-tabbar:change', () => {
    const el = makeTabbar({ tabs: TABS });
    const handler = vi.fn();
    el.addEventListener('af-tabbar:change', handler);
    el.$$('.tab-item')[1].click();
    expect(el.activeIndex).toBe(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: { index: 1, value: 'discover' } }));
  });

  it('setActive 更新 aria-selected 与 tabindex', () => {
    const el = makeTabbar({ tabs: TABS });
    el.setActive(2);
    const items = el.$$('.tab-item');
    expect(items[2].getAttribute('aria-selected')).toBe('true');
    expect(items[2].getAttribute('tabindex')).toBe('0');
    expect(items[0].getAttribute('aria-selected')).toBe('false');
    expect(items[0].getAttribute('tabindex')).toBe('-1');
  });

  it('setActive silent=true 不派发事件', () => {
    const el = makeTabbar({ tabs: TABS });
    const handler = vi.fn();
    el.addEventListener('af-tabbar:change', handler);
    el.setActive(1, true);
    expect(handler).not.toHaveBeenCalled();
  });

  it('键盘导航 ArrowRight 切换激活', () => {
    const el = makeTabbar({ tabs: TABS, activeIndex: 0 });
    const items = el.$$('.tab-item');
    items[0].focus();
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    items[0].dispatchEvent(event);
    expect(el.activeIndex).toBe(1);
  });

  it('键盘导航 Home 跳到首项', () => {
    const el = makeTabbar({ tabs: TABS, activeIndex: 2 });
    const items = el.$$('.tab-item');
    items[2].focus();
    const event = new KeyboardEvent('keydown', { key: 'Home', bubbles: true });
    items[2].dispatchEvent(event);
    expect(el.activeIndex).toBe(0);
  });

  it('fixed=true 默认开启', () => {
    const el = makeTabbar({ tabs: TABS });
    expect(el.fixed).toBe(true);
    expect(el.$('.tabbar').classList.contains('tabbar-fixed')).toBe(true);
  });

  it('内联 style 为空（遵守 wc-light-no-style）', () => {
    const el = makeTabbar({ tabs: TABS });
    expect(el.style.cssText).toBe('');
  });

  it('unmounted 不报错', () => {
    const el = makeTabbar({ tabs: TABS });
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});

describe('af-tabbar 属性变更（补充分支）', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('tabs 属性变化重渲染 tab-item', () => {
    const el = makeTabbar({ tabs: TABS });
    el.tabs = [{ label: '新', value: 'n' }];
    expect(el.$$('.tab-item').length).toBe(1);
    expect(el.$$('.tab-item')[0].querySelector('[data-role="label"]').textContent).toBe('新');
  });

  it('fixed 属性变化切换 tabbar-fixed 类', () => {
    const el = makeTabbar({ tabs: TABS, fixed: true });
    expect(el.$('.tabbar').classList.contains('tabbar-fixed')).toBe(true);
    el.fixed = false;
    expect(el.$('.tabbar').classList.contains('tabbar-fixed')).toBe(false);
  });
});
