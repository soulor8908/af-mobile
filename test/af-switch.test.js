import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfSwitch } from '../src/components/af-switch.js';
customElements.define('af-switch', AfSwitch);

function makeSwitch(props = {}) {
  const el = new AfSwitch();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-switch 基础渲染', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('渲染 button.switch + role=switch', () => {
    const el = makeSwitch();
    const btn = el.$('.switch');
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('role')).toBe('switch');
    expect(btn.getAttribute('aria-checked')).toBe('false');
    expect(el.$('.switch-thumb')).not.toBeNull();
  });

  it('checked=true 时 aria-checked=true + switch-on class', () => {
    const el = makeSwitch({ checked: true });
    const btn = el.$('.switch');
    expect(btn.getAttribute('aria-checked')).toBe('true');
    expect(btn.classList.contains('switch-on')).toBe(true);
  });

  it('size=sm 添加 switch-sm class', () => {
    const el = makeSwitch({ size: 'sm' });
    expect(el.$('.switch').classList.contains('switch-sm')).toBe(true);
  });

  it('disabled=true 时 button 有 disabled 属性', () => {
    const el = makeSwitch({ disabled: true });
    expect(el.$('.switch').disabled).toBe(true);
  });

  it('loading=true 时添加 switch-loading class + disabled', () => {
    const el = makeSwitch({ loading: true });
    const btn = el.$('.switch');
    expect(btn.classList.contains('switch-loading')).toBe(true);
    expect(btn.disabled).toBe(true);
  });
});

describe('af-switch 交互', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('click 切换 checked 并触发 af-switch:change', () => {
    const el = makeSwitch();
    const handler = vi.fn();
    el.addEventListener('af-switch:change', handler);
    el.$('.switch').click();
    expect(el.checked).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.checked).toBe(true);
  });

  it('toggle(true) 强制开启', () => {
    const el = makeSwitch({ checked: true });
    el.toggle(true);
    expect(el.checked).toBe(true);
  });

  it('toggle(false) 强制关闭', () => {
    const el = makeSwitch({ checked: true });
    el.toggle(false);
    expect(el.checked).toBe(false);
  });

  it('disabled 时 click 不切换', () => {
    const el = makeSwitch({ disabled: true });
    el.$('.switch').click();
    expect(el.checked).toBe(false);
  });

  it('loading 时 toggle 不生效', () => {
    const el = makeSwitch({ loading: true });
    el.toggle(true);
    expect(el.checked).toBe(false);
  });

  it('Space 键切换', () => {
    const el = makeSwitch();
    const btn = el.$('.switch');
    const event = new KeyboardEvent('keydown', { key: ' ' });
    btn.dispatchEvent(event);
    expect(el.checked).toBe(true);
  });

  it('Enter 键切换', () => {
    const el = makeSwitch();
    const btn = el.$('.switch');
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    btn.dispatchEvent(event);
    expect(el.checked).toBe(true);
  });

  it('切换两次回到原状态', () => {
    const el = makeSwitch();
    el.$('.switch').click();
    expect(el.checked).toBe(true);
    el.$('.switch').click();
    expect(el.checked).toBe(false);
  });
});

describe('af-switch 属性变化', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('checked 属性变化更新视图', () => {
    const el = makeSwitch();
    el.setAttribute('checked', '');
    expect(el.$('.switch').getAttribute('aria-checked')).toBe('true');
    expect(el.$('.switch').classList.contains('switch-on')).toBe(true);
  });

  it('size 属性变化重新渲染', () => {
    const el = makeSwitch();
    el.setAttribute('size', 'sm');
    expect(el.$('.switch').classList.contains('switch-sm')).toBe(true);
  });

  it('unmounted 解绑事件不报错', () => {
    const el = makeSwitch();
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});
