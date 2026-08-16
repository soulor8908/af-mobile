// AIFlow UI charts —— af-chart-funnel：漏斗（梯形堆叠 + 层间转化率标注）
// 详见 docs/design/charts-sublibrary-detailed-design.md §5.5
// 零坐标系：宽度 = plotW × v/max，居中梯形直出
// 无障碍：svg 的 role="img" 与 aria-label 由 AfChart 基类统一注入（chart-base.js _render）
import { AfChart } from '../lib/chart-base.js';
import { svgEl } from '../lib/render.js';
import { funnelPath, fmtNum } from '../lib/geometry.js';
import { seriesColor } from '../lib/chart-theme.js';
import { nearestIndex } from '../lib/tooltip.js';
import { AfElement, escapeHtml as esc } from '../../lib/af-element.js';

const LABEL_COLOR = 'var(--c-muted)';
const PAD_L = 72, PAD_R = 72, PAD_T = 14, PAD_B = 8; // 两侧留层标签/数值区

export class AfChartFunnel extends AfChart {
  static tag = 'af-chart-funnel';

  _isEmpty() { return !this.data?.length; }

  // 自动按 value 降序（漏斗单调收窄语义）
  _items() {
    return (this.data || []).filter(d => (d?.value ?? 0) > 0).sort((a, b) => b.value - a.value);
  }

  _summary() {
    const items = this._items();
    const head = items.slice(0, 5).map(d => `${d.label} ${fmtNum(d.value)}`).join('，');
    return `漏斗图：${head}${items.length > 5 ? '…' : ''}`;
  }
  _srRows() {
    const items = this._items();
    return items.map((d, i) => {
      const rate = i === 0 ? '—' : ((d.value / (items[i - 1].value || 1)) * 100).toFixed(1) + '%';
      return `<tr><th scope="row">${esc(d.label)}</th><td>${fmtNum(d.value)}</td><td>${rate}</td></tr>`;
    }).join('');
  }
  _legendItems() { return this._items().map((d, i) => ({ name: d.label, color: d.color || seriesColor(i) })); }

  _draw(svg, w, h) {
    const items = this._items();
    const n = items.length || 1;
    const maxV = Math.max(...items.map(d => d.value), 1);
    const plotW = w - PAD_L - PAD_R;
    const cx = PAD_L + plotW / 2;
    const layerH = (h - PAD_T - PAD_B) / n;

    const g = svgEl('g', { class: 'chart-enter' });
    this._pys = [];
    items.forEach((d, i) => {
      const wTop = (plotW * d.value) / maxV;
      const next = items[i + 1];
      const wBot = next ? (plotW * next.value) / maxV : wTop;
      const y = PAD_T + i * layerH;
      // 配色：前几层饱和、后几层浅（fill-opacity 阶梯）
      g.appendChild(svgEl('path', {
        d: funnelPath(cx, y, wTop, wBot, layerH), fill: d.color || seriesColor(i),
        'fill-opacity': Math.max(1 - i * 0.13, 0.4),
      }));
      // 层标签左置 + 数值右置（层内垂直居中）
      const midY = y + layerH / 2 + 4;
      const lt = svgEl('text', { x: PAD_L - 6, y: midY, 'text-anchor': 'end', fill: LABEL_COLOR, 'font-size': 'var(--t-xs)' });
      lt.textContent = d.label;
      svg.appendChild(lt);
      const vt = svgEl('text', { x: w - PAD_R + 6, y: midY, 'text-anchor': 'start', fill: LABEL_COLOR, 'font-size': 'var(--t-xs)' });
      vt.textContent = fmtNum(d.value);
      svg.appendChild(vt);
      // 层间转化率（v[i]/v[i-1]）
      if (this.showRate && i > 0) {
        const prev = items[i - 1];
        const rt = svgEl('text', { x: w - PAD_R + 6, y: y - 2, 'text-anchor': 'start', fill: LABEL_COLOR, 'font-size': 'var(--t-xs)' });
        rt.textContent = `${((d.value / (prev.value || 1)) * 100).toFixed(1)}%`;
        svg.appendChild(rt);
      }
      this._pys.push(midY);
    });
    svg.appendChild(g);
    this._itemsCache = items;
  }

  // 指针交互：最近层（y 向）→ tooltip / select
  _onPoint(px, py, tap) {
    if (!this._pys?.length) return;
    const i = nearestIndex(this._pys, py);
    const d = this._itemsCache[i];
    const prev = this._itemsCache[i - 1];
    const rate = i > 0 ? `，转化 ${((d.value / (prev.value || 1)) * 100).toFixed(1)}%` : '';
    this._tt.show(`${esc(d.label)}<br><b>${fmtNum(d.value)}</b>${rate}`, px, this._pys[i]);
    if (tap) this.emit('af-chart-funnel:select', { index: i, seriesIndex: 0, label: d.label, value: d.value });
  }
}

AfElement.defineProp(AfChartFunnel.prototype, 'data', { type: Array, default: [] });
AfElement.defineProp(AfChartFunnel.prototype, 'showRate', { type: Boolean, default: true, attr: 'show-rate' });
