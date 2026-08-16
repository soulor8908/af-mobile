import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfChartPie } from '../src/charts/components/af-chart-pie.js';
// 子类别名：避免 AfChartPie 本体被注册后，registerCharts() 再注册真实标签时冲突
const PieTest = class extends AfChartPie {};
customElements.define('af-chart-pie-test', PieTest);

const DATA = [
  { label: '线上', value: 62 },
  { label: '线下', value: 38 },
];

function makePie(props = {}) {
  const el = new PieTest();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-chart-pie Shadow DOM', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('挂载渲染饼扇区 path（从圆心出发）+ 占比 sr-table', () => {
    const el = makePie({ data: DATA });
    expect(el.$$('path').length).toBe(2);
    expect(el.$('path').getAttribute('d').startsWith('M')).toBe(true);
    expect(el.$('svg').getAttribute('aria-label')).toContain('线上 62');
    expect(el.$('.sr-table').textContent).toContain('%');
  });

  it('variant=donut 中心 KPI 文案 {total} 替换', () => {
    const el = makePie({ data: DATA, variant: 'donut', centerText: '合计 {total}' });
    const text = el.$$('text').find(t => t.textContent.includes('合计'));
    expect(text.textContent).toBe('合计 100');
  });

  it('variant=donut 内弧半径 = R×60%', () => {
    const el = makePie({ data: DATA, variant: 'donut' });
    // R = min(320,240)/2-12 = 108 → r0 = 64.8 → path 含 A64.8,64.8
    expect(el.$$('path')[0].getAttribute('d')).toContain('A64.8,64.8');
  });

  it('variant=half 半环跨度 π（无下半圆扇区越过水平线）', () => {
    const el = makePie({ data: DATA, variant: 'half', centerText: '{total}' });
    expect(el.$$('path').length).toBe(2);
    // 半环为环形（设计 §5.3 要点 4）：外弧起点 = 9 点方向 (cx-R, cy) = (160-148, 180)，扇区全部在上半平面
    const d = el.$$('path')[0].getAttribute('d');
    expect(d).toMatch(/^M12,180A/);
  });

  it('variant=rose 半径按 sqrt 比例（面积正比）', () => {
    const el = makePie({ data: [{ label: 'a', value: 100 }, { label: 'b', value: 25 }], variant: 'rose' });
    const ds = el.$$('path').map(p => p.getAttribute('d'));
    // a: R=108, b: R=108*0.5=54 → 外弧半径分别为 A108,108 与 A54,54
    expect(ds[0]).toContain('A108,108');
    expect(ds[1]).toContain('A54,54');
  });

  it('>6 项聚合为"其他"', () => {
    const data = Array.from({ length: 8 }, (_, i) => ({ label: `s${i}`, value: i + 1 }));
    const el = makePie({ data });
    expect(el.$$('path').length).toBe(6); // 5 + 其他
    expect(el.$('.sr-table').textContent).toContain('其他');
  });

  it('数据项 color 字段覆盖默认取色', () => {
    const el = makePie({ data: [{ label: 'x', value: 1, color: 'var(--c-danger)' }] });
    expect(el.$('path').getAttribute('fill')).toBe('var(--c-danger)');
  });

  it('五态：loading / error / empty（走 i18n）', () => {
    const a = makePie({ data: DATA, loading: true });
    expect(a.$('.chart-skeleton')).not.toBeNull();
    const b = makePie({ data: DATA, error: '炸了' });
    expect(b.$('.chart-error').textContent).toContain('炸了');
    const c = makePie({});
    expect(c.$('.chart-empty').textContent).toBe('暂无数据');
  });

  it('点击扇区触发 af-chart-pie:select（含占比锚点）', () => {
    const el = makePie({ data: DATA });
    const handler = vi.fn();
    el.addEventListener('af-chart-pie:select', handler);
    // 第一扇区中心角 = 62% × 360° / 2 ≈ 55.8°，锚点在圆心上方偏右
    el.$('svg').dispatchEvent(new MouseEvent('click', { clientX: 170, clientY: 120, bubbles: true }));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      detail: expect.objectContaining({ index: 0, label: '线上', value: 62 }),
    }));
  });

  it('图例渲染全部扇区名', () => {
    const el = makePie({ data: DATA, legend: true });
    expect(el.$$('.chart-legend-item').length).toBe(2);
  });

  it('CSS 用 token + reduced-motion（wc-shadow-use-token）', () => {
    const el = makePie({ data: DATA });
    const styleText = el.shadowRoot.querySelector('style').textContent;
    expect(styleText).not.toContain('#');
    expect(styleText).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('unmounted 不报错', () => {
    const el = makePie({ data: DATA });
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});

describe('charts 入口 registerChart', () => {
  it('registerCharts 注册全部 3 个标签', async () => {
    const { registerCharts, CHART_TAGS } = await import('../src/charts/index.js');
    registerCharts();
    expect(customElements.get('af-chart-line')).toBeDefined();
    expect(customElements.get('af-chart-bar')).toBeDefined();
    expect(customElements.get('af-chart-pie')).toBeDefined();
    expect(Object.keys(CHART_TAGS).length).toBe(3);
  });
});
