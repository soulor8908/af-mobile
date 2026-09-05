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
    const el = makeField({ icon: '¥' });
    expect(el.$('[data-role="icon"]').textContent).toBe('¥');
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

describe('af-field T0.10 Vant 对齐（required/clearable/word-limit/right slot）', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('required：label 前渲染红色星号（f-req）+ input required attr', () => {
    const el = makeField({ label: '手机号', required: true });
    expect(el.$('.f-req')).not.toBeNull();
    expect(el.$('.f-req').textContent).toBe('*');
    expect(el.$('[data-role="input"]').hasAttribute('required')).toBe(true);
  });

  it('非 required 不渲染星号', () => {
    const el = makeField({ label: '备注' });
    expect(el.$('.f-req')).toBeNull();
  });

  it('clearable：有值时渲染 f-clear，点击清空并派发 input/change', () => {
    const el = makeField({ label: '搜索', value: 'abc', clearable: true });
    const clearBtn = el.$('.f-clear');
    expect(clearBtn).not.toBeNull();
    const inputSpy = vi.fn();
    const changeSpy = vi.fn();
    el.addEventListener('af-field:input', inputSpy);
    el.addEventListener('af-field:change', changeSpy);
    clearBtn.click();
    expect(el.value).toBe('');
    expect(inputSpy).toHaveBeenCalledTimes(1);
    expect(changeSpy).toHaveBeenCalledTimes(1);
    expect(el.$('.f-clear')).toBeNull(); // 空值后按钮移除
  });

  it('clearable：无值时不渲染按钮', () => {
    const el = makeField({ label: '搜索', value: '', clearable: true });
    expect(el.$('.f-clear')).toBeNull();
  });

  it('clearable：disabled/readonly 时不渲染按钮', () => {
    expect(makeField({ label: 'a', value: 'x', clearable: true, disabled: true }).$('.f-clear')).toBeNull();
    expect(makeField({ label: 'b', value: 'x', clearable: true, readonly: true }).$('.f-clear')).toBeNull();
  });

  it('showWordLimit + maxlength：渲染 n/max 字数统计', () => {
    const el = makeField({ label: '简介', type: 'textarea', value: 'abc', maxlength: 10, showWordLimit: true });
    const limit = el.$('[data-role="limit"]');
    expect(limit).not.toBeNull();
    expect(limit.textContent).toBe('3/10');
    expect(el.$('[data-role="input"]').getAttribute('maxlength')).toBe('10');
  });

  it('字数统计随输入实时同步', () => {
    const el = makeField({ label: '简介', maxlength: 5, showWordLimit: true });
    const input = el.$('[data-role="input"]');
    input.value = 'ab';
    input.dispatchEvent(new Event('input'));
    expect(el.$('[data-role="limit"]').textContent).toBe('2/5');
  });

  it('无 showWordLimit 或 maxlength 不渲染字数统计', () => {
    expect(makeField({ label: 'a' }).$('[data-role="limit"]')).toBeNull();
    expect(makeField({ label: 'b', maxlength: 5 }).$('[data-role="limit"]')).toBeNull();
  });

  it('slot="right" 内容搬入 control-wrap（右侧插槽）', () => {
    const el = document.createElement('af-field-test');
    el.setAttribute('label', '验证码');
    const btn = document.createElement('button');
    btn.setAttribute('slot', 'right');
    btn.textContent = '发送';
    el.appendChild(btn);
    document.body.appendChild(el);
    const wrap = el.querySelector('[data-role="control-wrap"]');
    expect(wrap.contains(btn)).toBe(true);
  });

  it('maxlength=0 时 input 无 maxlength attr', () => {
    const el = makeField({ label: 'a' });
    expect(el.$('[data-role="input"]').hasAttribute('maxlength')).toBe(false);
  });
});

describe('af-field T0.10 Vant 对齐（required/clearable/word-limit/right slot）', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('required：label 前渲染红色星号（f-req）+ input required attr', () => {
    const el = makeField({ label: '手机号', required: true });
    expect(el.$('.f-req')).not.toBeNull();
    expect(el.$('.f-req').textContent).toBe('*');
    expect(el.$('[data-role="input"]').hasAttribute('required')).toBe(true);
  });

  it('非 required 不渲染星号', () => {
    const el = makeField({ label: '备注' });
    expect(el.$('.f-req')).toBeNull();
  });

  it('clearable：有值时渲染 f-clear，点击清空并派发 input/change', () => {
    const el = makeField({ label: '搜索', value: 'abc', clearable: true });
    const clearBtn = el.$('.f-clear');
    expect(clearBtn).not.toBeNull();
    const inputSpy = vi.fn();
    const changeSpy = vi.fn();
    el.addEventListener('af-field:input', inputSpy);
    el.addEventListener('af-field:change', changeSpy);
    clearBtn.click();
    expect(el.value).toBe('');
    expect(inputSpy).toHaveBeenCalledTimes(1);
    expect(changeSpy).toHaveBeenCalledTimes(1);
    expect(el.$('.f-clear')).toBeNull(); // 空值后按钮移除
  });

  it('clearable：无值时不渲染按钮', () => {
    const el = makeField({ label: '搜索', value: '', clearable: true });
    expect(el.$('.f-clear')).toBeNull();
  });

  it('clearable：disabled/readonly 时不渲染按钮', () => {
    expect(makeField({ label: 'a', value: 'x', clearable: true, disabled: true }).$('.f-clear')).toBeNull();
    expect(makeField({ label: 'b', value: 'x', clearable: true, readonly: true }).$('.f-clear')).toBeNull();
  });

  it('showWordLimit + maxlength：渲染 n/max 字数统计', () => {
    const el = makeField({ label: '简介', type: 'textarea', value: 'abc', maxlength: 10, showWordLimit: true });
    const limit = el.$('[data-role="limit"]');
    expect(limit).not.toBeNull();
    expect(limit.textContent).toBe('3/10');
    expect(el.$('[data-role="input"]').getAttribute('maxlength')).toBe('10');
  });

  it('字数统计随输入实时同步', () => {
    const el = makeField({ label: '简介', maxlength: 5, showWordLimit: true });
    const input = el.$('[data-role="input"]');
    input.value = 'ab';
    input.dispatchEvent(new Event('input'));
    expect(el.$('[data-role="limit"]').textContent).toBe('2/5');
  });

  it('无 showWordLimit 或 maxlength 不渲染字数统计', () => {
    expect(makeField({ label: 'a' }).$('[data-role="limit"]')).toBeNull();
    expect(makeField({ label: 'b', maxlength: 5 }).$('[data-role="limit"]')).toBeNull();
  });

  it('slot="right" 内容搬入 control-wrap（右侧插槽）', () => {
    const el = document.createElement('af-field-test');
    el.setAttribute('label', '验证码');
    const btn = document.createElement('button');
    btn.setAttribute('slot', 'right');
    btn.textContent = '发送';
    el.appendChild(btn);
    document.body.appendChild(el);
    const wrap = el.querySelector('[data-role="control-wrap"]');
    expect(wrap.contains(btn)).toBe(true);
  });

  it('maxlength=0 时 input 无 maxlength attr', () => {
    const el = makeField({ label: 'a' });
    expect(el.$('[data-role="input"]').hasAttribute('maxlength')).toBe(false);
  });
});
