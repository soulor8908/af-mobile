import { describe, it, expect, beforeEach } from 'vitest';
import { AfProgress } from '../src/components/af-progress.js';
customElements.define('af-progress-test', AfProgress);

function makeProgress(props = {}) {
  const el = new AfProgress();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-progress', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  // T0.7（Vant 对齐）：div 结构（轨道 + 填充条 + 可选 pivot），替代原生 <progress>
  it('渲染 progress 容器与填充条', () => {
    const el = makeProgress();
    const p = el.$('[data-role="progress"]');
    expect(p).not.toBeNull();
    expect(p.tagName).toBe('DIV');
    expect(p.getAttribute('role')).toBe('progressbar');
    expect(el.$('[data-role="bar"]')).not.toBeNull();
  });

  it('value/max 映射到 ARIA 与宽度变量', () => {
    const el = makeProgress({ value: 60, max: 100 });
    const p = el.$('[data-role="progress"]');
    expect(p.getAttribute('aria-valuenow')).toBe('60');
    expect(p.getAttribute('aria-valuemax')).toBe('100');
    expect(el.style.getPropertyValue('--af-pct')).toBe('60%');
  });

  it('color=brand(默认) 无变体 class,success/danger 有', () => {
    expect(makeProgress().$('[data-role="progress"]').classList.contains('progress-success')).toBe(false);
    expect(makeProgress({ color: 'success' }).$('[data-role="progress"]').classList.contains('progress-success')).toBe(true);
    expect(makeProgress({ color: 'danger' }).$('[data-role="progress"]').classList.contains('progress-danger')).toBe(true);
  });

  it('value 属性变化自动重渲染', () => {
    const el = makeProgress({ value: 10 });
    el.value = 80;
    expect(el.$('[data-role="progress"]').getAttribute('aria-valuenow')).toBe('80');
    expect(el.style.getPropertyValue('--af-pct')).toBe('80%');
  });

  it('showPivot 渲染百分比气泡，默认无', () => {
    expect(makeProgress({ value: 50 }).$('.progress-pivot')).toBeNull();
    const el = makeProgress({ value: 50, showPivot: true });
    expect(el.$('.progress-pivot').textContent).toBe('50%');
  });

  it('内联 style 仅允许 CSS 变量派发（af-list --af-list-h 同款通道，无视觉属性）', () => {
    const el = makeProgress({ value: 30 });
    // 宿主 style 只含宽度派发变量，无颜色/间距等视觉声明
    expect(el.style.cssText).toBe('--af-pct: 30%;');
    expect(el.$('[data-role="progress"]').style.cssText).toBe('');
    expect(el.$('[data-role="bar"]').style.cssText).toBe('');
  });

  it('unmounted 不报错', () => {
    const el = makeProgress();
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});
