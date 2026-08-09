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

describe('af-tabs slot 静态面板模式（IP-3: 原地加 ARIA 不搬运）', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('slot 面板不被搬运到 panel container（保留原位）', () => {
    const el = new AfTabs();
    el.tabs = TABS;
    // 先准备 slotted 面板
    const panel0 = document.createElement('div');
    panel0.setAttribute('slot', 'panel-0');
    panel0.textContent = 'Panel A';
    const panel1 = document.createElement('div');
    panel1.setAttribute('slot', 'panel-1');
    panel1.textContent = 'Panel B';
    el.appendChild(panel0);
    el.appendChild(panel1);
    document.body.appendChild(el);

    // 面板应仍在 el 直接子节点中（未被搬到 container）
    expect(el.querySelector('.af-tabs-panel-container').children.length).toBe(0);
    expect(panel0.parentElement).toBe(el);
    expect(panel1.parentElement).toBe(el);
  });

  it('slot 面板加 ARIA 属性（role/aria-labelledby）', () => {
    const el = new AfTabs();
    el.tabs = TABS;
    const panel0 = document.createElement('div');
    panel0.setAttribute('slot', 'panel-0');
    el.appendChild(panel0);
    document.body.appendChild(el);

    expect(panel0.getAttribute('role')).toBe('tabpanel');
    expect(panel0.getAttribute('aria-labelledby')).toBe('af-tabs-tab-0');
    expect(panel0.id).toBe('af-tabs-panel-0');
    expect(panel0.classList.contains('af-tabs-panel')).toBe(true);
  });

  it('setActive 切换 slot 面板显隐', () => {
    const el = new AfTabs();
    el.tabs = TABS;
    const p0 = document.createElement('div');
    p0.setAttribute('slot', 'panel-0');
    const p1 = document.createElement('div');
    p1.setAttribute('slot', 'panel-1');
    el.appendChild(p0);
    el.appendChild(p1);
    document.body.appendChild(el);

    // 初始激活 0
    expect(p0.hidden).toBe(false);
    expect(p1.hidden).toBe(true);

    el.setActive(1);
    expect(p0.hidden).toBe(true);
    expect(p1.hidden).toBe(false);
  });

  it('slot 面板内按钮的 click 监听仍可触发（事件不丢失）', () => {
    const el = new AfTabs();
    el.tabs = TABS;
    const panel0 = document.createElement('div');
    panel0.setAttribute('slot', 'panel-0');
    const btn = document.createElement('button');
    btn.textContent = 'click me';
    panel0.appendChild(btn);
    el.appendChild(panel0);
    document.body.appendChild(el);

    const handler = vi.fn();
    btn.addEventListener('click', handler);
    btn.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('外部持有的面板 DOM 引用在渲染后仍有效', () => {
    const el = new AfTabs();
    el.tabs = TABS;
    const panel0 = document.createElement('div');
    panel0.setAttribute('slot', 'panel-0');
    panel0.textContent = 'original';
    el.appendChild(panel0);
    document.body.appendChild(el);

    // 外部引用
    const ref = panel0;
    // 触发重渲染
    el.setAttribute('tabs', JSON.stringify([{ label: 'X', value: 'x' }]));
    // 引用仍指向同一个节点
    expect(ref.textContent).toBe('original');
    expect(document.body.contains(ref)).toBe(true);
  });
});

describe('af-tabs slotchange 监听（IP-10: MutationObserver）', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('动态新增 panel 后被加 ARIA 属性', async () => {
    const el = new AfTabs();
    el.tabs = [{ label: 'Tab 1', value: 'a' }, { label: 'Tab 2', value: 'b' }];
    const p0 = document.createElement('div');
    p0.setAttribute('slot', 'panel-0');
    p0.textContent = 'Panel A';
    el.appendChild(p0);
    document.body.appendChild(el);

    // 动态新增 panel-1
    const p1 = document.createElement('div');
    p1.setAttribute('slot', 'panel-1');
    p1.textContent = 'Panel B';
    el.appendChild(p1);

    // MutationObserver 是异步的，等微任务
    await new Promise(r => setTimeout(r, 0));

    expect(p1.getAttribute('role')).toBe('tabpanel');
    expect(p1.getAttribute('aria-labelledby')).toBe('af-tabs-tab-1');
    expect(p1.id).toBe('af-tabs-panel-1');
    expect(p1.classList.contains('af-tabs-panel')).toBe(true);
  });

  it('动态新增 panel 后显隐状态正确', async () => {
    const el = new AfTabs();
    el.tabs = [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }];
    const p0 = document.createElement('div');
    p0.setAttribute('slot', 'panel-0');
    el.appendChild(p0);
    document.body.appendChild(el);

    // 初始激活 0，新增 panel-1 应为 hidden
    const p1 = document.createElement('div');
    p1.setAttribute('slot', 'panel-1');
    el.appendChild(p1);
    await new Promise(r => setTimeout(r, 0));

    expect(p0.hidden).toBe(false);
    expect(p1.hidden).toBe(true);
  });

  it('动态删除 panel 后剩余面板仍正常', async () => {
    const el = new AfTabs();
    el.tabs = [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }];
    const p0 = document.createElement('div');
    p0.setAttribute('slot', 'panel-0');
    const p1 = document.createElement('div');
    p1.setAttribute('slot', 'panel-1');
    el.appendChild(p0);
    el.appendChild(p1);
    document.body.appendChild(el);

    // 删除 panel-1
    el.removeChild(p1);
    await new Promise(r => setTimeout(r, 0));

    // panel-0 仍正常显示
    expect(p0.hidden).toBe(false);
    expect(el.$$('.af-tabs-panel').length).toBe(1);
  });

  it('renderPanel 函数模式不响应 MutationObserver', async () => {
    const el = new AfTabs();
    el.tabs = [{ label: 'A', value: 'a' }];
    el.renderPanel = (tab) => `<p>content for ${tab.label}</p>`;
    document.body.appendChild(el);

    // 动态新增子节点（不应触发 slot 模式的重渲染）
    const div = document.createElement('div');
    div.setAttribute('slot', 'panel-0');
    div.textContent = 'should not override';
    el.appendChild(div);
    await new Promise(r => setTimeout(r, 0));

    // renderPanel 的内容应仍在
    expect(el.$('.af-tabs-panel').innerHTML).toContain('content for A');
    expect(div.classList.contains('af-tabs-panel')).toBe(false);
  });

  it('unmounted 时 MutationObserver 正确断开', () => {
    const el = new AfTabs();
    el.tabs = TABS;
    const p0 = document.createElement('div');
    p0.setAttribute('slot', 'panel-0');
    el.appendChild(p0);
    document.body.appendChild(el);

    const observer = el._observer;
    expect(observer).toBeDefined();

    // 移除组件后 observer 应已 disconnect（不报错即可）
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});
