import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfChartRadar } from '../src/charts/components/af-chart-radar.js';
// 子类别名：避免 AfChartRadar 本体被注册后，registerCharts() 再注册真实标签时冲突
const RadarTest = class extends AfChartRadar {};
customElements.define('af-chart-radar-test', RadarTest);

const DATA = [
  { label: '攻击', value: 80 },
  { label: '防御', value: 60 },
  { label: '速度', value: 90 },
  { label: '体力', value: 70 },
  { label: '魔法', value: 50 },
];

function makeRadar(props = {}) {
  const el = new RadarTest();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-chart-radar Shadow DOM', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('挂载渲染网格 + 数据多边形 + sr-table', () => {
    const el = makeRadar({ data: DATA });
    expect(el.shadowRoot).not.toBeNull();
    // 网格 4 层多边形 + 5 条轴线 + 1 个数据多边形
    expect(el.$$('path').length).toBe(5);
    expect(el.$$('line').length).toBe(5);
    expect(el.$('svg').getAttribute('role')).toBe('img');
    expect(el.$('svg').getAttribute('aria-label')).toContain('攻击 80');
    expect(el.$('.sr-table table').textContent).toContain('魔法');
  });

  it('数据多边形归一化到最大值（顶点不全在网格外）', () => {
    const el = makeRadar({ data: DATA });
    const d = el.$$('path')[4].getAttribute('d'); // 最后一个 path 是数据多边形
    expect(d.endsWith('Z')).toBe(true);
    // 速度 90 为最大值 → 顶点半径 = R；攻击 80 → 0.889R（y 坐标应不同）
    const ys = d.match(/[\d.]+(?=[,\s])/g);
    expect(new Set(ys).size).toBeGreaterThan(1);
  });

  it('shape=circle 网格用 circle 而非多边形 path', () => {
    const el = makeRadar({ data: DATA, shape: 'circle' });
    expect(el.$$('circle').length).toBeGreaterThanOrEqual(4); // 4 层同心圆
    expect(el.$$('path').length).toBe(1); // 只剩数据多边形
  });

  it('series 双主体渲染两个多边形 + 图例', () => {
    const el = makeRadar({
      data: [{ label: 'a' }, { label: 'b' }, { label: 'c' }],
      series: [{ name: '本期', values: [1, 2, 3] }, { name: '上期', values: [3, 2, 1] }],
      legend: true,
    });
    expect(el.$$('.chart-legend-item').length).toBe(2);
    expect(el.$('.chart-legend').textContent).toContain('本期');
  });

  it('>2 序列仅渲染前 2 并 console.warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = makeRadar({
      data: [{ label: 'a' }, { label: 'b' }, { label: 'c' }],
      series: [{ name: '1', values: [1, 2, 3] }, { name: '2', values: [3, 2, 1] }, { name: '3', values: [2, 2, 2] }],
      legend: true,
    });
    expect(el.$$('.chart-legend-item').length).toBe(2);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('第二序列虚线描边区分', () => {
    const el = makeRadar({
      data: [{ label: 'a' }, { label: 'b' }, { label: 'c' }],
      series: [{ name: 'x', values: [1, 2, 3] }, { name: 'y', values: [3, 2, 1] }],
    });
    const polys = el.$$('path');
    const last = polys[polys.length - 1];
    expect(last.getAttribute('stroke-dasharray')).toBe('4 3');
  });

  it('维度标签超长截断 4 字 + 省略号', () => {
    const el = makeRadar({ data: [{ label: '这是一个超长维度名', value: 1 }, { label: '短', value: 2 }, { label: 'c', value: 3 }] });
    const texts = el.$$('text').map(t => t.textContent);
    expect(texts).toContain('这是一个…');
    expect(texts).toContain('短');
  });

  it('点击顶点触发 af-chart-radar:select', () => {
    const el = makeRadar({ data: DATA });
    const handler = vi.fn();
    el.addEventListener('af-chart-radar:select', handler);
    // 首顶点在 12 点方向：cx=160, cy=120, R=min(320,240)/2-28=92，攻击 80/90 → y=120-81.8≈38
    el.$('svg').dispatchEvent(new MouseEvent('click', { clientX: 160, clientY: 38, bubbles: true }));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      detail: expect.objectContaining({ index: 0, label: '攻击', value: 80 }),
    }));
  });

  it('CSS 用 token + reduced-motion（wc-shadow-use-token）', () => {
    const el = makeRadar({ data: DATA });
    const styleText = el.shadowRoot.querySelector('style').textContent;
    expect(styleText).not.toContain('#');
    expect(styleText).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('unmounted 不报错', () => {
    const el = makeRadar({ data: DATA });
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});
