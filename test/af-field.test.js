import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfField } from '../src/components/af-field.js';
customElements.define('af-field-test', AfField);

function makeField(props = {}) {
  const el = new AfField();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-field', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('渲染 label + input + control-wrap', () => {
    const el = makeField({ label: '用户名' });
    expect(el.$('[data-role="label"]').textContent).toBe('用户名');
    expect(el.$('[data-role="input"]')).not.toBeNull();
    expect(el.$('[data-role="control-wrap"]')).not.toBeNull();
  });

  it('type=textarea 渲染 textarea 元素', () => {
    const el = makeField({ type: 'textarea' });
    expect(el.$('[data-role="input"]').tagName.toLowerCase()).toBe('textarea');
  });

  it('type=input 渲染 input 元素', () => {
    const el = makeField({ type: 'input' });
    expect(el.$('[data-role="input"]').tagName.toLowerCase()).toBe('input');
  });

  it('input-type 属性透传到 input.type', () => {
    const el = makeField({ inputType: 'password' });
    expect(el.$('[data-role="input"]').type).toBe('password');
  });

  it('icon 渲染为 data-role=icon', () => {
    const el = makeField({ icon: '🔍' });
    expect(el.$('[data-role="icon"]').textContent).toBe('🔍');
  });

  it('help 渲染为 .caption', () => {
    const el = makeField({ help: '至少 6 位' });
    expect(el.$('[data-role="help"]').textContent).toBe('至少 6 位');
  });

  it('error 渲染为 .form-err + role=alert', () => {
    const el = makeField({ error: '不能为空' });
    const err = el.$('[data-role="error"]');
    expect(err).not.toBeNull();
    expect(err.getAttribute('role')).toBe('alert');
    expect(err.textContent).toBe('不能为空');
  });

  it('input 事件派发 af-field:input', () => {
    const el = makeField({ value: '' });
    const handler = vi.fn();
    el.addEventListener('af-field:input', handler);
    el.$('[data-role="input"]').value = 'hello';
    el.$('[data-role="input"]').dispatchEvent(new Event('input', { bubbles: true }));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: { value: 'hello' } }));
  });

  it('change 事件派发 af-field:change', () => {
    const el = makeField({ value: '' });
    const handler = vi.fn();
    el.addEventListener('af-field:change', handler);
    el.$('[data-role="input"]').value = 'world';
    el.$('[data-role="input"]').dispatchEvent(new Event('change', { bubbles: true }));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: { value: 'world' } }));
  });

  it('setError 设置错误并添加 input-err class', () => {
    const el = makeField();
    el.setError('格式错误');
    expect(el.$('[data-role="error"]').textContent).toBe('格式错误');
    expect(el.$('[data-role="input"]').classList.contains('input-err')).toBe(true);
  });

  it('setError("") 清除错误', () => {
    const el = makeField({ error: '错误' });
    el.setError('');
    expect(el.$('[data-role="error"]').hidden).toBe(true);
    expect(el.$('[data-role="input"]').classList.contains('input-err')).toBe(false);
  });

  it('disabled 属性透传到 input', () => {
    const el = makeField({ disabled: true });
    expect(el.$('[data-role="input"]').disabled).toBe(true);
  });

  it('placeholder 属性透传到 input', () => {
    const el = makeField({ placeholder: '请输入' });
    expect(el.$('[data-role="input"]').placeholder).toBe('请输入');
  });

  it('label 与 input 的 id/for 关联', () => {
    const el = makeField({ label: '用户名' });
    const labelFor = el.$('[data-role="label"]').getAttribute('for');
    const inputId = el.$('[data-role="input"]').getAttribute('id');
    expect(labelFor).toBe(inputId);
  });

  it('slot=input 自定义控件时不渲染内置 input', () => {
    const el = new AfField();
    const custom = document.createElement('select');
    custom.setAttribute('slot', 'input');
    el.appendChild(custom);
    document.body.appendChild(el);
    expect(el.$('[data-role="input"]')).toBeNull();
  });

  it('focus() 聚焦输入框', () => {
    const el = makeField();
    el.focus();
    expect(document.activeElement).toBe(el.$('[data-role="input"]'));
  });

  it('内联 style 为空（遵守 wc-light-no-style）', () => {
    const el = makeField();
    expect(el.style.cssText).toBe('');
  });

  it('unmounted 不报错', () => {
    const el = makeField();
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});
