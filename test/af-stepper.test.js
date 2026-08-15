import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfStepper } from '../src/components/af-stepper.js';
customElements.define('af-stepper-test', AfStepper);

function makeStepper(props = {}) {
  const el = new AfStepper();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-stepper', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('渲染减号按钮 + 数字输入 + 加号按钮', () => {
    const el = makeStepper();
    expect(el.$('[data-role="minus"]')).not.toBeNull();
    expect(el.$('[data-role="input"]')).not.toBeNull();
    expect(el.$('[data-role="plus"]')).not.toBeNull();
  });

  it('点击加号按钮增加 value 并派发 af-stepper:change', () => {
    const el = makeStepper({ value: 1, step: 1 });
    const handler = vi.fn();
    el.addEventListener('af-stepper:change', handler);
    el.$('[data-role="plus"]').click();
    expect(el.value).toBe(2);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: { value: 2 } }));
  });

  it('点击减号按钮减少 value', () => {
    const el = makeStepper({ value: 5, step: 1 });
    el.$('[data-role="minus"]').click();
    expect(el.value).toBe(4);
  });

  it('value 低于 min 时禁用减号按钮', () => {
    const el = makeStepper({ value: 0, min: 0, step: 1 });
    expect(el.$('[data-role="minus"]').disabled).toBe(true);
  });

  it('value 超过 max 时禁用加号按钮', () => {
    const el = makeStepper({ value: 10, max: 10, step: 1 });
    expect(el.$('[data-role="plus"]').disabled).toBe(true);
  });

  it('setValue 自动 clamp 到 min/max', () => {
    const el = makeStepper({ value: 5, min: 0, max: 10, step: 1 });
    el.setValue(100);
    expect(el.value).toBe(10);
    el.setValue(-5);
    expect(el.value).toBe(0);
  });

  it('setValue 按 step 对齐', () => {
    const el = makeStepper({ value: 0, min: 0, step: 5 });
    el.setValue(7);
    expect(el.value).toBe(5);
  });

  it('setValue silent=true 不派发事件', () => {
    const el = makeStepper({ value: 1 });
    const handler = vi.fn();
    el.addEventListener('af-stepper:change', handler);
    el.setValue(2, true);
    expect(handler).not.toHaveBeenCalled();
  });

  it('disabled=true 禁用所有控件', () => {
    const el = makeStepper({ value: 5, disabled: true });
    expect(el.$('[data-role="minus"]').disabled).toBe(true);
    expect(el.$('[data-role="plus"]').disabled).toBe(true);
    expect(el.$('[data-role="input"]').disabled).toBe(true);
  });

  it('输入框 change 同步 value', () => {
    const el = makeStepper({ value: 5 });
    el.$('[data-role="input"]').value = '8';
    el.$('[data-role="input"]').dispatchEvent(new Event('change'));
    expect(el.value).toBe(8);
  });

  it('输入框非法值（NaN）保留原值', () => {
    const el = makeStepper({ value: 5 });
    el.$('[data-role="input"]').value = 'abc';
    el.$('[data-role="input"]').dispatchEvent(new Event('change'));
    expect(el.value).toBe(5);
  });

  it('内联 style 为空（遵守 wc-light-no-style）', () => {
    const el = makeStepper();
    expect(el.style.cssText).toBe('');
    expect(el.$('[data-role="input"]').style.cssText).toBe('');
  });

  it('unmounted 不报错', () => {
    const el = makeStepper();
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});

describe('af-stepper 输入校验（补充分支）', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('输入框清空（空串）保留原值并回填', () => {
    const el = makeStepper({ value: 5 });
    el.$('[data-role="input"]').value = '';
    el.$('[data-role="input"]').dispatchEvent(new Event('change'));
    expect(el.value).toBe(5);
    expect(el.$('[data-role="input"]').value).toBe('5');
  });
});
