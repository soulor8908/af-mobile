// af-mobile UI charts —— af-chart-radar：雷达（多维能力画像，单/双主体对比）
// 详见 docs/design/charts-sublibrary-detailed-design.md §5.4
// shape: polygon（多边形网格）| circle（同心圆网格）
// 无障碍：svg 的 role="img" 与 aria-label 由 AfChart 基类统一注入（chart-base.js _render）
import { AfChart } from '../lib/chart-base.js';
import { svgEl } from '../lib/render.js';
import { radarPath, polar, fmtNum } from '../lib/geometry.js';
import { seriesColor } from '../lib/chart-theme.js';
import { AfElement, escapeHtml as esc } from '../../lib/af-element.js';

const GRID_COLOR = 'var(--c-border)';
const LABEL_COLOR = 'var(--c-muted)';
const LEVELS = 4; // 同心网格层数（设计：3-4 层）

export class AfChartRadar extends AfChart {
  static tag = 'af-chart-radar';

  _isEmpty() { return !this.data?.length; }

  // 维度定义：[{label, max}]（max 缺省取全体最大值）
  _dims() {
    const vals = (this.series?.length ? this.series.flatMap(s => s.values || []) : (this.data || []).map(d => d?.value ?? 0));
    const gMax = Math.max(...vals, 1);
    return (this.data || []).map(d => ({ label: d?.label ?? '', max: d?.max ?? gMax }));
  }
  // 序列归一化（0-1，按各维 max）
  _normList() {
    const dims = this._dims();
    const list = this.series?.length
      ? this.series.slice(0, 2) // 双主体红线：>2 渲染前 2 并警告
      : [{ name: '', values: (this.data || []).map(d => d?.value ?? 0) }];
    return list.map(s => ({ name: s.name, values: (s.values || []).map((v, i) => v / (dims[i]?.max || 1)), raw: s.values || [] }));
  }

  _summary() {
    const dims = this._dims();
    const s = this._normList()[0];
    const head = dims.slice(0, 5).map((d, i) => `${d.label} ${fmtNum(s?.raw?.[i] ?? 0)}`).join('，');
    return `雷达图：${head}${dims.length > 5 ? '…' : ''}`;
  }
  _srRows() {
    const dims = this._dims();
    const list = this._normList();
    return `<tr>${list.map(s => `<th scope="col">${esc(s.name || '数值')}</th>`).join('')}<th scope="col">维度</th></tr>` +
      dims.map((d, i) => `<tr>${list.map(s => `<td>${fmtNum(s.raw[i] ?? 0)}</td>`).join('')}<td>${esc(d.label)}</td></tr>`).join('');
  }
  _legendItems() {
    return this._normList().filter(s => s.name).map((s, i) => ({ name: s.name, color: seriesColor(i) }));
  }

  _draw(svg, w, h) {
    if (this.series?.length > 2) console.warn('[af-chart-radar] 序列超过 2 个，仅渲染前 2 个（可读性红线）');
    const dims = this._dims();
    const list = this._normList();
    const n = Math.max(dims.length, 3); // <3 维画不出多边形，兜底 3
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) / 2 - 28; // 留维度标签空间
    const angles = Array.from({ length: n }, (_, i) => (i * Math.PI * 2) / n);
    const circle = this.shape === 'circle';

    // 网格：同心多边形/圆 + 轴线
    const grid = svgEl('g');
    for (let lv = 1; lv <= LEVELS; lv++) {
      const rr = (R * lv) / LEVELS;
      grid.appendChild(circle
        ? svgEl('circle', { cx, cy, r: rr, fill: 'none', stroke: GRID_COLOR })
        : svgEl('path', { d: radarPath(cx, cy, rr, angles, angles.map(() => 1)), fill: 'none', stroke: GRID_COLOR }));
    }
    for (const a of angles) {
      const [ex, ey] = polar(cx, cy, R, a);
      grid.appendChild(svgEl('line', { x1: cx, y1: cy, x2: ex, y2: ey, stroke: GRID_COLOR }));
    }
    svg.appendChild(grid);

    // 维度标签（超长截断 4 字 + 省略号）
    dims.forEach((d, i) => {
      if (i >= n) return;
      const [lx, ly] = polar(cx, cy, R + 14, angles[i]);
      const t = svgEl('text', { x: lx, y: ly + 4, 'text-anchor': 'middle', fill: LABEL_COLOR, 'font-size': 'var(--t-xs)' });
      t.textContent = d.label.length > 4 ? d.label.slice(0, 4) + '…' : d.label;
      svg.appendChild(t);
    });

    // 数据多边形：首序列填充 + 描边，第二序列半透明 + 虚线描边区分
    const g = svgEl('g', { class: 'chart-enter' });
    this._pts = [];
    list.forEach((s, i) => {
      const color = seriesColor(i);
      const dash = i > 0 ? { 'stroke-dasharray': '4 3' } : {};
      g.appendChild(svgEl('path', {
        d: radarPath(cx, cy, R, angles, s.values), fill: color, 'fill-opacity': i === 0 ? 0.18 : 0.45,
        stroke: color, 'stroke-width': 1.5, ...dash,
      }));
      // 顶点 + 指针交互锚点（首序列）
      if (i === 0) {
        s.values.forEach((v, j) => {
          if (j >= n) return;
          const p = polar(cx, cy, R * v, angles[j]);
          this._pts.push(p);
          g.appendChild(svgEl('circle', { cx: p[0], cy: p[1], r: 3, fill: color }));
        });
      }
    });
    svg.appendChild(g);
  }

  // 指针交互：最近顶点（欧氏距离）→ tooltip / select
  _onPoint(px, py, tap) {
    if (!this._pts?.length) return;
    let best = 0, dist = Infinity;
    for (let i = 0; i < this._pts.length; i++) {
      const d = Math.hypot(this._pts[i][0] - px, this._pts[i][1] - py);
      if (d < dist) { dist = d; best = i; }
    }
    const dims = this._dims();
    const list = this._normList();
    const rows = list.map((s, si) => `${esc(s.name ? s.name + ' ' : '')}<b>${fmtNum(s.raw[best] ?? 0)}</b>`).join(' / ');
    this._tt.show(`${esc(dims[best]?.label ?? '')}<br>${rows}`, this._pts[best][0], this._pts[best][1]);
    if (tap) this.emit('af-chart-radar:select', { index: best, seriesIndex: 0, label: dims[best]?.label, value: list[0]?.raw?.[best] ?? 0 });
  }
}

AfElement.defineProp(AfChartRadar.prototype, 'data', { type: Array, default: [] });
AfElement.defineProp(AfChartRadar.prototype, 'series', { type: Array, default: [] });
AfElement.defineProp(AfChartRadar.prototype, 'shape', { type: String, default: 'polygon' });
