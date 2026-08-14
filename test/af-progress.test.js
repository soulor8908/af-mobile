import { describe, it, expect, beforeEach } from 'vitest';
import { AfProgress } from '../packages/ui/src/components/af-progress.js';
customElements.define('af-progress-test', AfProgress);

function makeProgress(props = {}) {
  const el = new AfProgress();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-progress', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('渲染 progress 元素', () => {
    const el = makeProgress();
    const p = el.$('[data-role="progress"]');
    expect(p).not.toBeNull();
    expect(p.tagName).toBe('PROGRESS');
  });

  it('value/max 透传', () => {
    const el = makeProgress({ value: 60, max: 100 });
    const p = el.$('[data-role="progress"]');
    expect(p.getAttribute('value')).toBe('60');
    expect(p.getAttribute('max')).toBe('100');
  });

  it('color=brand(默认) 无变体 class,success/danger 有', () => {
    expect(makeProgress().$('[data-role="progress"]').classList.contains('progress-success')).toBe(false);
    expect(makeProgress({ color: 'success' }).$('[data-role="progress"]').classList.contains('progress-success')).toBe(true);
    expect(makeProgress({ color: 'danger' }).$('[data-role="progress"]').classList.contains('progress-danger')).toBe(true);
  });

  it('value 属性变化自动重渲染', () => {
    const el = makeProgress({ value: 10 });
    el.value = 80;
    expect(el.$('[data-role="progress"]').getAttribute('value')).toBe('80');
  });

  it('内联 style 为空（遵守 wc-light-no-style）', () => {
    const el = makeProgress();
    expect(el.style.cssText).toBe('');
    expect(el.$('[data-role="progress"]').style.cssText).toBe('');
  });

  it('unmounted 不报错', () => {
    const el = makeProgress();
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});