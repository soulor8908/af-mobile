// af-mobile UI charts —— af-chart-bar：柱状/条形/堆叠/分组
// 详见 docs/design/charts-sublibrary-detailed-design.md §5.2
// variant: column（垂直柱）| bar（水平条形）| stacked（堆叠柱）| grouped（分组柱）
// 无障碍：svg 的 role="img" 与 aria-label 由 AfChart 基类统一注入（chart-base.js _render）
import { AfChart } from '../lib/chart-base.js';
import { svgEl } from '../lib/render.js';
import { niceTicks, linear } from '../lib/scale.js';
import { fmtNum } from '../lib/geometry.js';
import { seriesColor, seriesOpacity } from '../lib/chart-theme.js';
import { nearestIndex } from '../lib/tooltip.js';
import { AfElement, escapeHtml as esc } from '../../lib/af-element.js';

const AXIS_COLOR = 'var(--c-border)';
const LABEL_COLOR = 'var(--c-muted)';
const PAD_L = 36, PAD_R = 12, PAD_T = 14, PAD_B = 24;

export class AfChartBar extends AfChart {
  static tag = 'af-chart-bar';

  _isEmpty() { return !this.data?.length && !this.series?.length; }

  // 超出 max-count 截断为前 N-1 + "其他"聚合（移动端可读性红线）
  _truncate(list) {
    const labels = this._labels();
    const max = this.maxCount || 30;
    if (labels.length <= max) return { labels, list };
    const rest = labels.slice(max - 1);
    const agg = list.map(s => ({ ...s, values: [...s.values.slice(0, max - 1), rest.reduce((a, _, i) => a + (s.values[max - 1 + i] ?? 0), 0)] }));
    return { labels: [...labels.slice(0, max - 1), this.t('ch.otr')], list: agg };
  }

  _summary() {
    const { labels, list } = this._truncate(this._seriesList());
    const s = list[0];
    const head = labels.slice(0, 5).map((l, i) => `${l} ${fmtNum(s?.values?.[i] ?? 0)}`).join('，');
    return `柱状图：${head}${labels.length > 5 ? '…' : ''}`;
  }
  _srRows() {
    const { labels, list } = this._truncate(this._seriesList());
    return `<tr>${list.map(s => `<th scope="col">${esc(s.name || '数值')}</th>`).join('')}<th scope="col">标签</th></tr>` +
      labels.map((l, i) => `<tr>${list.map(s => `<td>${fmtNum(s.values?.[i] ?? 0)}</td>`).join('')}<td>${esc(l)}</td></tr>`).join('');
  }
  _legendItems() {
    return this._seriesList().filter(s => s.name).map((s, i) => ({ name: s.name, color: seriesColor(i) }));
  }

  _draw(svg, w, h) {
    const horizontal = this.variant === 'bar';
    const stacked = this.variant === 'stacked';
    const grouped = this.variant === 'grouped';
    const { labels, list } = this._truncate(this._seriesList());
    const n = labels.length || 1;
    const groups = list.length || 1;
    // 值域：堆叠取逐列和，其余取全体值；柱必须从 0 起（clamp-zero）
    const sums = labels.map((_, i) => list.reduce((a, s) => a + (s.values?.[i] ?? 0), 0));
    const vals = stacked ? sums : list.flatMap(s => s.values || []);
    const tk = niceTicks(0, Math.max(...vals, 1), 5);
    const padL = horizontal ? 48 : PAD_L;
    const padB = horizontal ? PAD_T : PAD_B;
    // 值 → 沿柱方向像素（垂直柱：y 越大越靠下；水平条：x 越大越靠右）
    const vpx = horizontal ? linear(tk.min, tk.max, padL, w - PAD_R) : linear(tk.min, tk.max, h - padB, PAD_T);
    const zeroPx = vpx(Math.max(tk.min, 0));
    const crossLen = horizontal ? h - padB - PAD_T : w - padL - PAD_R; // 类目方向总长
    const band = crossLen / n;

    // 网格 + 刻度（水平条形画竖线，柱状画横线）
    for (const tv of tk.ticks) {
      const p = Math.round(vpx(tv)) + 0.5;
      if (horizontal) {
        svg.appendChild(svgEl('line', { x1: p, x2: p, y1: PAD_T, y2: h - padB, stroke: AXIS_COLOR, 'stroke-dasharray': '3 3' }));
        const t = svgEl('text', { x: p, y: h - 6, 'text-anchor': 'middle', fill: LABEL_COLOR, 'font-size': 'var(--t-xs)' });
        t.textContent = fmtNum(tv);
        svg.appendChild(t);
      } else {
        svg.appendChild(svgEl('line', { x1: padL, x2: w - PAD_R, y1: p, y2: p, stroke: AXIS_COLOR, 'stroke-dasharray': '3 3' }));
        const t = svgEl('text', { x: padL - 6, y: p + 4, 'text-anchor': 'end', fill: LABEL_COLOR, 'font-size': 'var(--t-xs)' });
        t.textContent = fmtNum(tv);
        svg.appendChild(t);
      }
    }

    // 类目标签
    labels.forEach((l, i) => {
      let t;
      if (horizontal) {
        t = svgEl('text', { x: padL - 6, y: h - padB - (i + 0.5) * band + 4, 'text-anchor': 'end', fill: LABEL_COLOR, 'font-size': 'var(--t-xs)' });
      } else {
        t = svgEl('text', { x: padL + (i + 0.5) * band, y: h - 6, 'text-anchor': 'middle', fill: LABEL_COLOR, 'font-size': 'var(--t-xs)' });
      }
      t.textContent = l;
      svg.appendChild(t);
    });

    // 柱体：值域基线 bases（堆叠累加值）；pos 为类目方向起点；thick 为柱宽
    const g = svgEl('g', { class: 'chart-enter' });
    const bases = new Array(n).fill(0);
    const thick = stacked ? band * 0.62 : grouped ? (band * 0.7 / groups) * 0.8 : band * 0.6;
    const rx = Math.min(thick / 4, 6);
    labels.forEach((_, i) => {
      list.forEach((s, si) => {
        const v = s.values?.[i] ?? 0;
        if (!v) return;
        const color = s.colors?.[i] || seriesColor(si);
        let startPx, endPx, pos;
        if (stacked) {
          startPx = vpx(bases[i]);
          endPx = vpx(bases[i] + v);
          bases[i] += v;
          pos = horizontal ? h - padB - (i + 1) * band + (band - thick) / 2 : padL + i * band + (band - thick) / 2;
        } else {
          startPx = zeroPx;
          endPx = vpx(v);
          const slotStart = horizontal ? h - padB - (i + 1) * band : padL + i * band;
          const groupW = band * 0.7;
          pos = grouped
            ? slotStart + (band - groupW) / 2 + si * (groupW / groups) + (groupW / groups - thick) / 2
            : slotStart + (band - thick) / 2;
        }
        const len = Math.abs(endPx - startPx);
        g.appendChild(horizontal
          ? svgEl('rect', { x: Math.min(startPx, endPx), y: pos, width: len, height: thick, rx, fill: color, 'fill-opacity': seriesOpacity(si) })
          : svgEl('rect', { x: pos, y: Math.min(startPx, endPx), width: thick, height: len, rx, fill: color, 'fill-opacity': seriesOpacity(si) }));
      });
    });
    svg.appendChild(g);
    // 缓存类目中心坐标供指针交互
    this._pxs = horizontal ? labels.map(() => padL + 24) : labels.map((_, i) => padL + (i + 0.5) * band);
    this._pys = labels.map((_, i) => (horizontal ? h - padB - (i + 0.5) * band : h / 2));
    this._tipLabels = labels;
    this._tipList = list;
  }

  _onPoint(px, py, tap) {
    if (!this._pxs?.length) return;
    const i = nearestIndex(this._pxs, px);
    const rows = this._tipList.map(s => `${esc(s.name ? s.name + ' ' : '')}<b>${fmtNum(s.values?.[i] ?? 0)}</b>`).join(' / ');
    this._tt.show(`${esc(this._tipLabels[i] ?? '')}<br>${rows}`, this._pxs[i], this._pys[i]);
    if (tap) this.emit('af-chart-bar:select', { index: i, seriesIndex: 0, label: this._tipLabels[i], value: this._tipList[0]?.values?.[i] ?? 0 });
  }
}

AfElement.defineProp(AfChartBar.prototype, 'data', { type: Array, default: [] });
AfElement.defineProp(AfChartBar.prototype, 'labels', { type: Array, default: [] });
AfElement.defineProp(AfChartBar.prototype, 'series', { type: Array, default: [] });
AfElement.defineProp(AfChartBar.prototype, 'variant', { type: String, default: 'column' });
AfElement.defineProp(AfChartBar.prototype, 'maxCount', { type: Number, default: 30, attr: 'max-count' });
