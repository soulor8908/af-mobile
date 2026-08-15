import { describe, it, expect, beforeEach } from 'vitest';
import { AfSteps } from '../src/components/af-steps.js';
customElements.define('af-steps-test', AfSteps);

function makeSteps(props = {}) {
  const el = new AfSteps();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

const ITEMS = ['下单', '支付', '发货', '收货'];

describe('af-steps', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('按 steps 渲染对应数量步骤', () => {
    const el = makeSteps({ steps: ITEMS });
    expect(el.$('[data-role="steps"]').querySelectorAll('.step').length).toBe(4);
  });

  it('current 之前的为 step-done,当前为 step-active', () => {
    const el = makeSteps({ steps: ITEMS, current: 2 });
    const steps = [...el.$('[data-role="steps"]').querySelectorAll('.step')];
    expect(steps[0].classList.contains('step-done')).toBe(true);
    expect(steps[1].classList.contains('step-done')).toBe(true);
    expect(steps[2].classList.contains('step-active')).toBe(true);
    expect(steps[3].classList.contains('step-done')).toBe(false);
    expect(steps[3].classList.contains('step-active')).toBe(false);
  });

  it('支持 { label } 对象格式', () => {
    const el = makeSteps({ steps: [{ label: 'A' }, { label: 'B' }] });
    const labels = [...el.$('[data-role="steps"]').querySelectorAll('.step-label')].map(n => n.textContent);
    expect(labels).toEqual(['A', 'B']);
  });

  it('label 转义防 XSS', () => {
    const el = makeSteps({ steps: ['<img src=x onerror=alert(1)>'] });
    const label = el.$('[data-role="steps"] .step-label');
    expect(label.querySelector('img')).toBeNull();
    expect(label.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('内联 style 为空（遵守 wc-light-no-style）', () => {
    const el = makeSteps({ steps: ITEMS });
    expect(el.style.cssText).toBe('');
    expect(el.$('[data-role="steps"]').style.cssText).toBe('');
  });

  it('unmounted 不报错', () => {
    const el = makeSteps({ steps: ITEMS });
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});