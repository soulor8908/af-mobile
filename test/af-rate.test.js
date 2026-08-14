import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfRate } from '../src/components/af-rate.js';
customElements.define('af-rate-test', AfRate);

function makeRate(props = {}) {
  const el = new AfRate();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-rate', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('渲染 5 星的 radiogroup', () => {
    const el = makeRate();
    const group = el.$('[data-role="rate"]');
    expect(group).not.toBeNull();
    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(group.querySelectorAll('input[type="radio"]').length).toBe(5);
  });

  it('value=3 时第 3 颗 radio 选中', () => {
    const el = makeRate({ value: 3 });
    const checked = [...el.$('[data-role="rate"]').querySelectorAll('input')].filter(i => i.checked);
    expect(checked.length).toBe(1);
    expect(checked[0].value).toBe('3');
  });

  it('max=10 渲染 10 颗星', () => {
    const el = makeRate({ max: 10 });
    expect(el.$('[data-role="rate"]').querySelectorAll('input').length).toBe(10);
  });

  it('点击 radio 更新 value 并派发 af-rate:change', () => {
    const el = makeRate();
    const handler = vi.fn();
    el.addEventListener('af-rate:change', handler);
    el.$('[data-role="rate"] input[value="4"]').click();
    expect(el.value).toBe(4);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: { value: 4 } }));
  });

  it('label[for] 关联到对应 radio（点击可激活）', () => {
    const el = makeRate();
    const label = el.$('[data-role="rate"] label[for$="-4"]');
    expect(label).not.toBeNull();
    expect(el.$('[data-role="rate"]').querySelector('#' + label.getAttribute('for'))).not.toBeNull();
  });

  it('readonly=true 时 input disabled + rate-readonly class', () => {
    const el = makeRate({ readonly: true, value: 3 });
    const group = el.$('[data-role="rate"]');
    expect(group.classList.contains('rate-readonly')).toBe(true);
    expect(group.querySelector('input').disabled).toBe(true);
  });

  it('size=sm/lg 添加对应 class', () => {
    expect(makeRate({ size: 'sm' }).$('[data-role="rate"]').classList.contains('rate-sm')).toBe(true);
    expect(makeRate({ size: 'lg' }).$('[data-role="rate"]').classList.contains('rate-lg')).toBe(true);
  });

  it('value 属性变化自动同步选中', () => {
    const el = makeRate({ value: 2 });
    el.value = 4;
    const checked = [...el.$('[data-role="rate"]').querySelectorAll('input')].filter(i => i.checked);
    expect(checked[0].value).toBe('4');
  });

  it('aria-label 默认评分，可自定义', () => {
    expect(makeRate().$('[data-role="rate"]').getAttribute('aria-label')).toBe('评分');
    expect(makeRate({ label: '商品评分' }).$('[data-role="rate"]').getAttribute('aria-label')).toBe('商品评分');
  });

  it('内联 style 为空（遵守 wc-light-no-style）', () => {
    const el = makeRate();
    expect(el.style.cssText).toBe('');
    expect(el.$('[data-role="rate"]').style.cssText).toBe('');
  });

  it('unmounted 不报错', () => {
    const el = makeRate();
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});
