// AIFlow UI charts —— af-chart-pie：饼/环形/半环/玫瑰
// 详见 docs/design/charts-sublibrary-detailed-design.md §5.3
// variant: pie | donut（center-text 中心 KPI）| half（半环）| rose（半径映射数值，面积正比）
// 无障碍：svg 的 role="img" 与 aria-label 由 AfChart 基类统一注入（chart-base.js _render）
import { AfChart } from '../lib/chart-base.js';
import { svgEl } from '../lib/render.js';
import { arcPath, polar, fmtNum } from '../lib/geometry.js';
import { seriesColor, seriesOpacity } from '../lib/chart-theme.js';
import { AfElement, escapeHtml as esc } from '../../lib/af-element.js';

const LABEL_COLOR = 'var(--c-muted)';

export class AfChartPie extends AfChart {
  static tag = 'af-chart-pie';

  _isEmpty() { return !this.data?.length; }

  // >6 项聚合为"其他"（走 i18n），负值/零值过滤
  _items() {
    let items = (this.data || []).filter(d => (d?.value ?? 0) > 0);
    if (items.length > 6) {
      const rest = items.slice(5);
      items = [...items.slice(0, 5), { label: this.t('ch.otr'), value: rest.reduce((a, d) => a + d.value, 0) }];
    }
    return items;
  }
  _total(items) { return items.reduce((a, d) => a + d.value, 0) || 1; }

  _summary() {
    const items = this._items();
    const head = items.slice(0, 5).map(d => `${d.label} ${fmtNum(d.value)}`).join('，');
    return `${this.variant === 'half' ? '半环图' : this.variant === 'rose' ? '玫瑰图' : '饼图'}：${head}${items.length > 5 ? '…' : ''}，合计 ${fmtNum(this._total(items))}`;
  }
  _srRows() {
    const items = this._items();
    const total = this._total(items);
    return items.map(d => `<tr><th scope="row">${esc(d.label)}</th><td>${fmtNum(d.value)}</td><td>${(d.value / total * 100).toFixed(1)}%</td></tr>`).join('');
  }
  _legendItems() { return this._items().map((d, i) => ({ name: d.label, color: d.color || seriesColor(i) })); }

  _draw(svg, w, h) {
    const items = this._items();
    const total = this._total(items);
    const half = this.variant === 'half';
    const rose = this.variant === 'rose';
    const donut = this.variant === 'donut' || half; // 半环必为环形
    const cx = w / 2;
    const cy = half ? h * 0.75 : h / 2;
    const R = Math.min(w, half ? h * 1.6 : h) / 2 - 12;
    const r0 = donut ? R * (this.innerRadius || 60) / 100 : 0;
    const g = svgEl('g', { class: 'chart-enter' });
    // 角度范围：半环 -90°→+90°，其余整圆；12 点方向起顺时针
    const a0 = half ? -Math.PI / 2 : 0;
    const span = half ? Math.PI : Math.PI * 2;
    const maxV = Math.max(...items.map(d => d.value), 1);
    let ang = a0;
    this._pts = [];
    items.forEach((d, i) => {
      const color = d.color || seriesColor(i);
      let seg, rr, rr0;
      if (rose) {
        // 玫瑰：半径 ∝ sqrt(v/max)（面积正比），角度均分
        seg = span / items.length;
        rr = R * Math.sqrt(d.value / maxV);
        rr0 = 0;
      } else {
        seg = span * (d.value / total);
        rr = R;
        rr0 = r0;
      }
      g.appendChild(svgEl('path', { d: arcPath(cx, cy, rr, rr0, ang, ang + seg), fill: color, 'fill-opacity': seriesOpacity(i) }));
      // 扇区中心（指针交互锚点）
      const amid = ang + seg / 2;
      this._pts.push(polar(cx, cy, rose ? rr * 0.7 : (R + r0) / 2, amid));
      ang += seg;
    });
    svg.appendChild(g);
    // donut/half 中心 KPI 文案（{total} 占位符）
    if (donut && this.centerText) {
      const t = svgEl('text', { x: cx, y: cy + (half ? 8 : 6), 'text-anchor': 'middle', fill: 'var(--c-text)', 'font-size': 'var(--t-lg)', 'font-weight': '600' });
      t.textContent = String(this.centerText).replace('{total}', fmtNum(total));
      svg.appendChild(t);
    }
    // 缓存扇区中心供指针交互
    this._pts = items.map((d, i) => {
      const a1 = rose ? a0 + span / items.length * (i + 1) : a0 + span * (d.value / total) * (i + 1);
      const amid = (a0 + span / items.length * i + a1) / 2;
      const rr = rose ? R * Math.sqrt(d.value / maxV) * 0.7 : (R + r0) / 2;
      return polar(cx, cy, rr, amid);
    });
    this._itemsCache = items;
  }

  _onPoint(px, py, tap) {
    if (!this._pts?.length) return;
    let best = 0, dist = Infinity;
    for (let i = 0; i < this._pts.length; i++) {
      const d = Math.hypot(this._pts[i][0] - px, this._pts[i][1] - py);
      if (d < dist) { dist = d; best = i; }
    }
    const d = this._itemsCache[best];
    const total = this._total(this._itemsCache);
    this._tt.show(`${esc(d.label)}<br><b>${fmtNum(d.value)}</b>（${(d.value / total * 100).toFixed(1)}%）`, this._pts[best][0], this._pts[best][1]);
    if (tap) this.emit('af-chart-pie:select', { index: best, seriesIndex: 0, label: d.label, value: d.value });
  }
}

// 指针交互需要 y 坐标（饼图按点到扇区中心距离），覆盖基类签名
AfElement.defineProp(AfChartPie.prototype, 'data', { type: Array, default: [] });
AfElement.defineProp(AfChartPie.prototype, 'variant', { type: String, default: 'pie' });
AfElement.defineProp(AfChartPie.prototype, 'innerRadius', { type: Number, default: 60, attr: 'inner-radius' });
AfElement.defineProp(AfChartPie.prototype, 'centerText', { type: String, default: '', attr: 'center-text' });
