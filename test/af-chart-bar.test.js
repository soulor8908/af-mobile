import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfChartBar } from '../src/charts/components/af-chart-bar.js';
customElements.define('af-chart-bar-test', AfChartBar);

const DATA = [
  { label: '北京', value: 30 },
  { label: '上海', value: 50 },
  { label: '广州', value: 20 },
];

function makeBar(props = {}) {
  const el = new AfChartBar();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-chart-bar Shadow DOM', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('挂载渲染 svg 柱 rect + y 刻度从 0 起（clamp-zero）', () => {
    const el = makeBar({ data: DATA });
    expect(el.$$('rect').length).toBe(3);
    const texts = el.$$('text').map(t => t.textContent);
    expect(texts).toContain('0');
    expect(el.$('svg').getAttribute('aria-label')).toContain('北京 30');
  });

  it('variant=bar 水平条形（label 左置）', () => {
    const el = makeBar({ data: DATA, variant: 'bar' });
    expect(el.$$('rect').length).toBe(3);
    const bj = el.$$('text').find(t => t.textContent === '北京');
    expect(bj.getAttribute('text-anchor')).toBe('end');
    expect(+bj.getAttribute('x')).toBeLessThan(48); // 左侧标签区（padL=48）
  });

  it('variant=stacked 堆叠取逐列和为值域上限', () => {
    const el = makeBar({
      labels: ['Q1', 'Q2'],
      series: [{ name: 'a', values: [30, 10] }, { name: 'b', values: [20, 5] }],
      variant: 'stacked',
    });
    // Q1 列 30+20=50 → 刻度含 50
    const texts = el.$$('text').map(t => t.textContent);
    expect(texts).toContain('50');
    expect(el.$$('rect').length).toBe(4);
  });

  it('variant=grouped 分组柱每类目 groups 个', () => {
    const el = makeBar({
      labels: ['Q1', 'Q2'],
      series: [{ name: 'a', values: [30, 10] }, { name: 'b', values: [20, 5] }],
      variant: 'grouped',
    });
    expect(el.$$('rect').length).toBe(4);
    // 分组柱横向错开（x 不全相同）
    const xs = el.$$('rect').map(r => r.getAttribute('x'));
    expect(new Set(xs).size).toBeGreaterThan(1);
  });

  it('max-count 截断为前 N-1 + 其他聚合', () => {
    const labels = Array.from({ length: 32 }, (_, i) => `c${i}`);
    const el = makeBar({ labels, series: [{ values: labels.map(() => 1) }], maxCount: 10 });
    const rects = el.$$('rect');
    expect(rects.length).toBe(10); // 9 + 其他
    const texts = el.$$('text').map(t => t.textContent);
    expect(texts).toContain('其他');
  });

  it('图例渲染序列色点', () => {
    const el = makeBar({
      labels: ['Q1', 'Q2'],
      series: [{ name: 'a', values: [1, 2] }],
      legend: true,
    });
    expect(el.$$('.chart-legend-item').length).toBe(1);
  });

  it('五态：loading / error / empty', () => {
    const a = makeBar({ data: DATA, loading: true });
    expect(a.$('.chart-skeleton')).not.toBeNull();
    const b = makeBar({ data: DATA, error: '网络错误' });
    expect(b.$('.chart-error').textContent).toContain('网络错误');
    const c = makeBar({});
    expect(c.$('.chart-empty').textContent).toBe('暂无数据');
  });

  it('点击柱触发 af-chart-bar:select', () => {
    const el = makeBar({ data: DATA });
    const handler = vi.fn();
    el.addEventListener('af-chart-bar:select', handler);
    el.$('svg').dispatchEvent(new MouseEvent('click', { clientX: 300, clientY: 120, bubbles: true }));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      detail: expect.objectContaining({ index: 2, label: '广州' }),
    }));
  });

  it('CSS 用 token + reduced-motion（wc-shadow-use-token）', () => {
    const el = makeBar({ data: DATA });
    const styleText = el.shadowRoot.querySelector('style').textContent;
    expect(styleText).not.toContain('#');
    expect(styleText).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('unmounted 不报错', () => {
    const el = makeBar({ data: DATA });
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});
