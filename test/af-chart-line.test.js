import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfChartLine } from '../src/charts/components/af-chart-line.js';
customElements.define('af-chart-line-test', AfChartLine);

const DATA = [
  { label: '1月', value: 120 },
  { label: '2月', value: 150 },
  { label: '3月', value: 90 },
];

function makeLine(props = {}) {
  const el = new AfChartLine();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-chart-line Shadow DOM', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('挂载渲染 svg 折线 path + sr-table', () => {
    const el = makeLine({ data: DATA });
    expect(el.shadowRoot).not.toBeNull();
    const svg = el.$('svg');
    expect(svg).not.toBeNull();
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toContain('1月 120');
    expect(el.$('path').getAttribute('d')).toMatch(/^M/);
    // sr-table 含全量数据行
    expect(el.$('.sr-table table').textContent).toContain('3月');
  });

  it('variant=area 生成面积闭合 path（Z 结尾）', () => {
    const el = makeLine({ data: DATA, variant: 'area' });
    expect(el.$('path').getAttribute('d').endsWith('Z')).toBe(true);
  });

  it('variant=scatter 渲染 circle 而非 path', () => {
    const el = makeLine({ data: DATA, variant: 'scatter' });
    expect(el.$$('circle').length).toBe(3);
    expect(el.$('path')).toBeNull();
  });

  it('variant=spark 无轴文本、默认高 60、末点强调', () => {
    const el = makeLine({ data: DATA, variant: 'spark' });
    expect(el.$$('text').length).toBe(0);
    expect(el.$('svg').getAttribute('height')).toBe('60');
    expect(el.$$('circle').length).toBe(1);
  });

  it('smooth 平滑曲线不产生 L 段', () => {
    const el = makeLine({ data: DATA, smooth: true });
    const d = el.$('path').getAttribute('d');
    expect(d).toMatch(/^M[\d.]+,.*C/);
    expect(d).not.toContain('L');
  });

  it('多序列 labels+series 渲染两条线 + 图例', () => {
    const el = makeLine({
      labels: ['1月', '2月', '3月'],
      series: [{ name: '今年', values: [1, 2, 3] }, { name: '去年', values: [3, 2, 1] }],
      legend: true,
    });
    expect(el.$$('path').length).toBe(2);
    expect(el.$$('.chart-legend-item').length).toBe(2);
    expect(el.$('.chart-legend').textContent).toContain('今年');
  });

  it('多序列取色走 var(--c-*) token', () => {
    const el = makeLine({ labels: ['a', 'b'], series: [{ name: 'x', values: [1, 2] }] });
    expect(el.$('path').getAttribute('stroke')).toBe('var(--c-brand)');
  });

  it('x 标签抽稀：12 个标签最多渲染 ceil(12/6)=2 的倍数位', () => {
    const labels = Array.from({ length: 12 }, (_, i) => `d${i}`);
    const el = makeLine({ labels, series: [{ values: labels.map(() => 1) }] });
    // plotW = 320-36-12=272 → maxL = floor(272/48) = 5 → step = ceil(12/5) = 3
    // 只数 x 轴类目标签（text-anchor=middle），不含 y 轴刻度
    const xTexts = el.$$('text').filter(t => t.getAttribute('text-anchor') === 'middle');
    expect(xTexts.length).toBeLessThanOrEqual(5);
  });

  it('loading 态显示骨架 + aria-busy', () => {
    const el = makeLine({ data: DATA, loading: true });
    expect(el.$('.chart-skeleton')).not.toBeNull();
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(el.$('svg')).toBeNull();
  });

  it('error 态显示重试按钮 → af-chart-line:retry', () => {
    const el = makeLine({ data: DATA, error: '加载失败' });
    const handler = vi.fn();
    el.addEventListener('af-chart-line:retry', handler);
    expect(el.$('.chart-error').textContent).toContain('加载失败');
    el.$('.chart-retry').click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('empty 态走 i18n 文案', () => {
    const el = makeLine({});
    expect(el.$('.chart-empty').textContent).toBe('暂无数据');
    expect(el.$('svg')).toBeNull();
  });

  it('点击数据点触发 af-chart-line:select', () => {
    const el = makeLine({ data: DATA });
    const handler = vi.fn();
    el.addEventListener('af-chart-line:select', handler);
    const svg = el.$('svg');
    svg.dispatchEvent(new MouseEvent('click', { clientX: 320, clientY: 120, bubbles: true }));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      detail: expect.objectContaining({ index: 2, label: '3月' }),
    }));
  });

  it('tooltip 定位含锚点坐标（右半屏翻转 + 上方对齐）', () => {
    const el = makeLine({ data: DATA });
    el.$('svg').dispatchEvent(new MouseEvent('click', { clientX: 320, clientY: 120, bubbles: true }));
    // show 收到的是最近数据点坐标（非触点）；jsdom clientWidth=0 → wrap 宽兜底 320
    const i = el._pxs.indexOf(Math.max(...el._pxs)); // clientX=320 最右 → 命中最右点
    const [x, y] = [el._pxs[i], el._pys[i]];
    const flip = x > 160, above = y > 48;
    expect(el.$('.chart-tooltip').style.transform)
      .toBe(`translate(${flip ? x - 8 : x + 8}px, ${above ? y - 8 : y + 8}px) translate(${flip ? '-100%' : '0'}, ${above ? '-100%' : '0'})`);
  });

  it('重绘销毁 tooltip 后再次交互自动重建（isConnected 防失效引用崩溃）', async () => {
    const el = makeLine({ data: DATA });
    el.$('svg').dispatchEvent(new MouseEvent('click', { clientX: 320, clientY: 120, bubbles: true }));
    expect(el.$('.chart-tooltip')).not.toBeNull();
    // 属性变化触发重绘：wrap.innerHTML='' 会把 tooltip 一并销毁（旧实现缓存失效引用 → TypeError）
    el.height = 300;
    await new Promise(r => setTimeout(r));
    expect(() => {
      el.$('svg').dispatchEvent(new MouseEvent('click', { clientX: 100, clientY: 120, bubbles: true }));
    }).not.toThrow();
    const tip = el.$('.chart-tooltip');
    expect(tip).not.toBeNull();
    // 重绘后 _pxs/_pys 按 height=300 重算，期望值动态推导
    const i = el._pxs.indexOf(Math.min(...el._pxs)); // clientX=100 最左 → 命中最左点
    const [x, y] = [el._pxs[i], el._pys[i]];
    const flip = x > 160, above = y > 48;
    expect(tip.style.transform)
      .toBe(`translate(${flip ? x - 8 : x + 8}px, ${above ? y - 8 : y + 8}px) translate(${flip ? '-100%' : '0'}, ${above ? '-100%' : '0'})`);
  });

  it('resize 触发重绘（MockResizeObserver → rAF）', async () => {
    const el = makeLine({ data: DATA });
    const first = el.$('path').getAttribute('d');
    // clientWidth 兜底 320，改 height 触发 onAttributeChange 重渲染
    el.height = 300;
    await new Promise(r => setTimeout(r));
    expect(el.$('svg').getAttribute('height')).toBe('300');
    expect(first).toMatch(/^M/);
  });

  it('CSS 用 token + reduced-motion 覆盖（wc-shadow-use-token）', () => {
    const el = makeLine({ data: DATA });
    const styleText = el.shadowRoot.querySelector('style').textContent;
    expect(styleText).not.toContain('#');
    expect(styleText).toMatch(/var\(--c-brand\)/);
    expect(styleText).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('lazy 属性走 IntersectionObserver 懒渲染', () => {
    const el = makeLine({ data: DATA, lazy: true });
    // mock IO 不回调 → 首次不渲染
    expect(el.$('svg')).toBeNull();
    // 手动 trigger 可见
    el._io.trigger(el, true);
    expect(el.$('svg')).not.toBeNull();
  });

  it('unmounted 不报错且清理 observer', () => {
    const el = makeLine({ data: DATA });
    const spy = vi.spyOn(el._ro, 'disconnect');
    document.body.removeChild(el);
    expect(spy).toHaveBeenCalled();
  });
});
