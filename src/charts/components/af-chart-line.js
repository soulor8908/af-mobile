// AIFlow UI charts —— af-chart-line：折线/面积/散点/迷你趋势（sparkline）
// 详见 docs/design/charts-sublibrary-detailed-design.md §5.1
// variant: line | area | scatter | spark（spark 无轴/tooltip，KPI 卡内嵌）
// 无障碍：svg 的 role="img" 与 aria-label 由 AfChart 基类统一注入（chart-base.js _render）
import { AfChart } from '../lib/chart-base.js';
import { svgEl } from '../lib/render.js';
import { niceTicks, linear } from '../lib/scale.js';
import { linePath, areaPath, fmtNum } from '../lib/geometry.js';
import { seriesColor, seriesOpacity } from '../lib/chart-theme.js';
import { nearestIndex } from '../lib/tooltip.js';
import { AfElement, escapeHtml as esc } from '../../lib/af-element.js';

const AXIS_COLOR = 'var(--c-border)';
const LABEL_COLOR = 'var(--c-muted)';
const PAD_L = 36, PAD_R = 12, PAD_T = 14, PAD_B = 24; // 无单位常量（JS 非 CSS）

export class AfChartLine extends AfChart {
  static tag = 'af-chart-line';

  _isSpark() { return this.variant === 'spark'; }
  _isEmpty() { return !this.data?.length && !this.series?.length; }

  _summary() {
    const labels = this._labels();
    const s = this._seriesList()[0];
    const head = labels.slice(0, 5).map((l, i) => `${l} ${fmtNum(s?.values?.[i] ?? 0)}`).join('，');
    return `折线图${this._isSpark() ? '（迷你）' : ''}：${head}${labels.length > 5 ? '…' : ''}`;
  }
  _srRows() {
    const labels = this._labels();
    const list = this._seriesList();
    return `<tr>${list.map(s => `<th scope="col">${esc(s.name || '数值')}</th>`).join('')}<th scope="col">标签</th></tr>` +
      labels.map((l, i) => `<tr>${list.map(s => `<td>${fmtNum(s.values?.[i] ?? 0)}</td>`).join('')}<td>${esc(l)}</td></tr>`).join('');
  }
  _legendItems() {
    return this._seriesList().filter(s => s.name).map((s, i) => ({ name: s.name, color: seriesColor(i) }));
  }

  _draw(svg, w, h) {
    const spark = this._isSpark();
    const labels = this._labels();
    const list = this._seriesList();
    const all = list.flatMap(s => s.values || []);
    const lo = Math.min(...all, 0), hi = Math.max(...all, 1);
    // 面积/散点含零起算（clamp-zero），折线压缩到数据区间（nice）
    const tk = niceTicks(lo, hi, spark ? 2 : 5);
    const dMin = this.variant === 'area' ? Math.min(0, tk.min) : tk.min;
    const dMax = tk.max;
    const padL = spark ? 2 : PAD_L, padB = spark ? 2 : PAD_B, padT = spark ? 2 : PAD_T;
    const y = linear(dMin, dMax, h - padB, padT);
    const plotW = w - padL - PAD_R;
    const n = Math.max(labels.length, 1);
    const X = (i) => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const pts = (s) => (s.values || []).map((v, i) => [X(i), y(v)]);
    const baseY = h - padB;

    if (!spark && this.showAxis) {
      // 水平网格线 + y 刻度文字
      for (const tv of tk.ticks) {
        const gy = Math.round(y(tv)) + 0.5;
        svg.appendChild(svgEl('line', { x1: padL, x2: w - PAD_R, y1: gy, y2: gy, stroke: AXIS_COLOR, 'stroke-dasharray': '3 3' }));
        const t = svgEl('text', { x: padL - 6, y: gy + 4, 'text-anchor': 'end', fill: LABEL_COLOR, 'font-size': 'var(--t-xs)' });
        t.textContent = fmtNum(tv);
        svg.appendChild(t);
      }
      // x 标签抽稀：相邻重叠时按 ceil(n / maxLabels) 间隔取
      const maxL = Math.max(1, Math.floor(plotW / 48));
      const step = Math.ceil(n / maxL);
      labels.forEach((l, i) => {
        if (i % step !== 0 && i !== n - 1) return;
        const t = svgEl('text', { x: X(i), y: h - 6, 'text-anchor': 'middle', fill: LABEL_COLOR, 'font-size': 'var(--t-xs)' });
        t.textContent = l;
        svg.appendChild(t);
      });
    }

    const g = svgEl('g', { class: 'chart-enter' });
    list.forEach((s, i) => {
      const p = pts(s);
      const color = s.colors?.[0] || seriesColor(i);
      const op = seriesOpacity(i);
      if (this.variant === 'area') {
        const a = svgEl('path', { d: areaPath(p, baseY, { smooth: this.smooth }), fill: color, 'fill-opacity': 0.18 * op });
        g.appendChild(a);
      }
      if (this.variant === 'scatter') {
        for (const [cx, cy] of p) g.appendChild(svgEl('circle', { cx, cy, r: 3, fill: color, 'fill-opacity': op }));
      } else {
        g.appendChild(svgEl('path', {
          d: linePath(p, { smooth: this.smooth }), fill: 'none', stroke: color, 'stroke-width': spark ? 2 : 1.5,
          'stroke-opacity': op, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        }));
        // spark 末点强调 / 常规序列端点提示（数据少时）
        if (spark && p.length) {
          const [ex, ey] = p[p.length - 1];
          g.appendChild(svgEl('circle', { cx: ex, cy: ey, r: 3, fill: color }));
        }
      }
    });
    svg.appendChild(g);
    // 缓存点位供指针交互
    this._pxs = list[0] ? pts(list[0]).map(p => p[0]) : [];
    this._pys = list[0] ? pts(list[0]).map(p => p[1]) : [];
  }

  // 指针交互：找最近数据点 → tooltip（移动）/ select（tap）
  _onPoint(px, tap) {
    if (this._isSpark() || !this._pxs?.length) return;
    const i = nearestIndex(this._pxs, px);
    const list = this._seriesList();
    const s = list[0];
    const rows = list.map((ss, si) => {
      const v = ss.values?.[i] ?? 0;
      return `${esc(ss.name ? ss.name + ' ' : '')}<b>${fmtNum(v)}</b>`;
    }).join(' / ');
    this._tt.show(`${esc(this._labels()[i] ?? '')}<br>${rows}`, this._pxs[i], this._pys[i]);
    if (tap) this.emit('af-chart-line:select', { index: i, seriesIndex: 0, label: this._labels()[i], value: s?.values?.[i] ?? 0 });
  }
}

AfElement.defineProp(AfChartLine.prototype, 'data', { type: Array, default: [] });
AfElement.defineProp(AfChartLine.prototype, 'labels', { type: Array, default: [] });
AfElement.defineProp(AfChartLine.prototype, 'series', { type: Array, default: [] });
AfElement.defineProp(AfChartLine.prototype, 'variant', { type: String, default: 'line' });
AfElement.defineProp(AfChartLine.prototype, 'smooth', { type: Boolean, default: false });
AfElement.defineProp(AfChartLine.prototype, 'showAxis', { type: Boolean, default: true, attr: 'show-axis' });
