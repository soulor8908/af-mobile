import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfDropdown } from '../packages/ui/src/components/af-dropdown.js';
customElements.define('af-dropdown', AfDropdown);

const OPTIONS = [
  { label: 'Apple', value: 'a' },
  { label: 'Banana', value: 'b' },
  { label: 'Cherry', value: 'c', disabled: true },
];

function makeDropdown(props = {}) {
  const el = new AfDropdown();
  el.options = OPTIONS;
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-dropdown', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('渲染 trigger 按钮 + list', () => {
    const el = makeDropdown();
    expect(el.$('.af-dropdown-trigger')).not.toBeNull();
    expect(el.$('.list')).not.toBeNull();
    expect(el.$$('.list-item').length).toBe(3);
  });

  it('trigger role=combobox + aria-haspopup=listbox', () => {
    const el = makeDropdown();
    const t = el.$('.af-dropdown-trigger');
    expect(t.getAttribute('role')).toBe('combobox');
    expect(t.getAttribute('aria-haspopup')).toBe('listbox');
  });

  it('placeholder 默认值', () => {
    const el = makeDropdown({ value: '', placeholder: '请选择水果' });
    expect(el.$('.af-dropdown-trigger > .flex-1').textContent).toBe('请选择水果');
  });

  it('selectedLabel 反映当前选中项 label', () => {
    const el = makeDropdown({ value: 'b' });
    expect(el.selectedLabel).toBe('Banana');
    expect(el.$('.af-dropdown-trigger > .flex-1').textContent).toBe('Banana');
  });

  it('选中项显示 ✓', () => {
    const el = makeDropdown({ value: 'a' });
    const items = el.$$('.list-item');
    expect(items[0].getAttribute('aria-selected')).toBe('true');
    expect(items[0].querySelector('.text-brand')).not.toBeNull();
  });

  it('点击 trigger 调用 showPopover', () => {
    const el = makeDropdown();
    const list = el.$('.list');
    const spy = vi.spyOn(list, 'showPopover');
    el.$('.af-dropdown-trigger').click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('disabled=true 时 trigger 不响应点击', () => {
    const el = makeDropdown({ disabled: true });
    const list = el.$('.list');
    const spy = vi.spyOn(list, 'showPopover');
    el.$('.af-dropdown-trigger').click();
    expect(spy).not.toHaveBeenCalled();
  });

  it('点击选项派发 af-dropdown:select', () => {
    const el = makeDropdown();
    const handler = vi.fn();
    el.addEventListener('af-dropdown:select', handler);
    el.$$('.list-item')[1].click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ index: 1, value: 'b' });
    expect(el.value).toBe('b');
  });

  it('disabled 选项不可点击', () => {
    const el = makeDropdown();
    const handler = vi.fn();
    el.addEventListener('af-dropdown:select', handler);
    el.$$('.list-item')[2].click();
    expect(handler).not.toHaveBeenCalled();
  });

  it('list toggle 事件更新 aria-expanded', () => {
    const el = makeDropdown();
    const t = el.$('.af-dropdown-trigger');
    el.$('.list').dispatchEvent(new ToggleEvent({ newState: 'open', oldState: 'closed' }));
    expect(t.getAttribute('aria-expanded')).toBe('true');
    el.$('.list').dispatchEvent(new ToggleEvent({ newState: 'closed', oldState: 'open' }));
    expect(t.getAttribute('aria-expanded')).toBe('false');
  });

  it('open() / close() 委托 popover', () => {
    const el = makeDropdown();
    const list = el.$('.list');
    const showSpy = vi.spyOn(list, 'showPopover');
    const hideSpy = vi.spyOn(list, 'hidePopover');
    el.open(); el.close();
    expect(showSpy).toHaveBeenCalledTimes(1);
    expect(hideSpy).toHaveBeenCalledTimes(1);
  });

  it('onAttributeChange：value 变化更新 trigger 显示', () => {
    const el = makeDropdown();
    el.setAttribute('value', 'b');
    expect(el.$('.af-dropdown-trigger > .flex-1').textContent).toBe('Banana');
  });

  it('XSS：option.label 含 HTML 被转义，不执行脚本', () => {
    const el = makeDropdown({ options: [{ label: '<img src=x onerror=alert(1)>', value: 'x' }] });
    const item = el.$$('.list-item')[0];
    expect(item.querySelector('img[onerror]')).toBeNull();
    expect(item.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('close() 还原焦点到触发器（P2-8）', () => {
    const el = makeDropdown();
    const trigger = el.$('.af-dropdown-trigger');
    const focusSpy = vi.spyOn(trigger, 'focus');
    el.close();
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('toggle closed 还原焦点到触发器（light dismiss，P2-8）', () => {
    const el = makeDropdown();
    const trigger = el.$('.af-dropdown-trigger');
    const focusSpy = vi.spyOn(trigger, 'focus');
    el.$('.list').dispatchEvent(new ToggleEvent({ newState: 'closed', oldState: 'open' }));
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });
});

describe('af-dropdown 键盘导航与属性变更（补充分支）', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('keydown 非方向键不移动焦点', () => {
    const el = makeDropdown();
    const items = el.$$('.list-item');
    items[0].focus();
    el.$('.list').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(document.activeElement).toBe(items[0]);
  });

  it('keydown ArrowDown/ArrowUp 在选项间导航', () => {
    const el = makeDropdown();
    const items = el.$$('.list-item');
    items[0].focus();
    el.$('.list').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[1]);
    el.$('.list').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(items[0]);
  });

  it('空选项时 ArrowDown 安全返回', () => {
    const el = makeDropdown({ options: [] });
    expect(el.$$('.list-item').length).toBe(0);
    expect(() => el.$('.list').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))).not.toThrow();
  });

  it('options 属性变化重渲染列表', () => {
    const el = makeDropdown();
    el.options = [{ label: 'X', value: 'x' }, { label: 'Y', value: 'y' }];
    expect(el.$$('.list-item').length).toBe(2);
  });

  it('placeholder 属性变化更新 trigger 文案', () => {
    const el = makeDropdown();
    el.setAttribute('placeholder', '请选择');
    expect(el.$('.af-dropdown-trigger > .flex-1').textContent).toBe('请选择');
  });

  it('trigger-class 属性变化更新按钮 className', () => {
    const el = makeDropdown();
    el.triggerClass = 'my-trigger';
    expect(el.$('.af-dropdown-trigger').classList.contains('my-trigger')).toBe(true);
  });

  it('disabled 属性变化更新 trigger 的 disabled 状态', () => {
    const el = makeDropdown();
    el.disabled = true;
    expect(el.$('.af-dropdown-trigger').hasAttribute('disabled')).toBe(true);
  });
});
