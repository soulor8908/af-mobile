import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfChartFunnel } from '../src/charts/components/af-chart-funnel.js';
// 子类别名：避免 AfChartFunnel 本体被注册后，registerCharts() 再注册真实标签时冲突
const FunnelTest = class extends AfChartFunnel {};
customElements.define('af-chart-funnel-test', FunnelTest);

const DATA = [
  { label: '浏览', value: 1000 },
  { label: '加购', value: 400 },
  { label: '下单', value: 200 },
  { label: '支付', value: 100 },
];

function makeFunnel(props = {}) {
  const el = new FunnelTest();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-chart-funnel Shadow DOM', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('挂载渲染梯形 path + 层标签 + sr-table', () => {
    const el = makeFunnel({ data: DATA });
    expect(el.shadowRoot).not.toBeNull();
    expect(el.$$('path').length).toBe(4);
    const texts = el.$$('text').map(t => t.textContent);
    expect(texts).toContain('浏览');
    expect(texts).toContain('1000');
    expect(el.$('svg').getAttribute('aria-label')).toContain('浏览 1000');
    expect(el.$('.sr-table table').textContent).toContain('支付');
  });

  it('自动按 value 降序排（乱序输入收敛为单调收窄）', () => {
    const el = makeFunnel({ data: [{ label: '小', value: 10 }, { label: '大', value: 100 }, { label: '中', value: 50 }] });
    const texts = el.$$('text').map(t => t.textContent);
    expect(texts.indexOf('大')).toBeLessThan(texts.indexOf('中'));
    expect(texts.indexOf('中')).toBeLessThan(texts.indexOf('小'));
  });

  it('首层全宽居中（顶边 x = padL，底边收窄到第二层）', () => {
    const el = makeFunnel({ data: [{ label: 'a', value: 100 }, { label: 'b', value: 50 }] });
    const d = el.$('path').getAttribute('d');
    // plotW = 320-72-72=176；cx=160；首层 wTop=176 → M72,y L248,y；wBot=88 → L204 L116
    expect(d.startsWith('M72,')).toBe(true);
    expect(d).toContain('L248,');
    expect(d).toContain('L204,');
    expect(d.endsWith('Z')).toBe(true);
  });

  it('show-rate 层间转化率标注（400/1000=40.0%）', () => {
    const el = makeFunnel({ data: DATA });
    const texts = el.$$('text').map(t => t.textContent);
    expect(texts).toContain('40.0%');
    expect(texts).toContain('50.0%');
  });

  it('show-rate=false 无百分比标注', () => {
    const el = makeFunnel({ data: DATA, showRate: false });
    const texts = el.$$('text').map(t => t.textContent);
    expect(texts).not.toContain('40.0%');
  });

  it('fill-opacity 阶梯（后几层更浅）', () => {
    const el = makeFunnel({ data: DATA });
    const ops = el.$$('path').map(p => +p.getAttribute('fill-opacity'));
    expect(ops[0]).toBe(1);
    expect(ops[3]).toBeCloseTo(0.61);
    expect(ops[3]).toBeLessThan(ops[0]);
  });

  it('数据项 color 字段覆盖默认取色', () => {
    const el = makeFunnel({ data: [{ label: 'x', value: 1, color: 'var(--c-danger)' }, { label: 'y', value: 2 }] });
    expect(el.$$('path')[1].getAttribute('fill')).toBe('var(--c-danger)');
  });

  it('非正值过滤', () => {
    const el = makeFunnel({ data: [{ label: 'x', value: 0 }, { label: 'y', value: -5 }, { label: 'z', value: 3 }] });
    expect(el.$$('path').length).toBe(1);
    expect(el.$('text').textContent).not.toBe('x');
  });

  it('点击层触发 af-chart-funnel:select', () => {
    const el = makeFunnel({ data: DATA });
    const handler = vi.fn();
    el.addEventListener('af-chart-funnel:select', handler);
    // 首层中心 y ≈ 14 + (240-14-8)/4/2 ≈ 71
    el.$('svg').dispatchEvent(new MouseEvent('click', { clientX: 160, clientY: 71, bubbles: true }));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      detail: expect.objectContaining({ index: 0, label: '浏览', value: 1000 }),
    }));
  });

  it('CSS 用 token + reduced-motion（wc-shadow-use-token）', () => {
    const el = makeFunnel({ data: DATA });
    const styleText = el.shadowRoot.querySelector('style').textContent;
    expect(styleText).not.toContain('#');
    expect(styleText).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('unmounted 不报错', () => {
    const el = makeFunnel({ data: DATA });
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});
