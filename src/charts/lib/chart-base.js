// AIFlow UI charts —— 图表组件共享基类（五态骨架 + resize/懒渲染 + tooltip + sr-table）
// 详见 docs/design/charts-sublibrary-detailed-design.md §4
import { AfElement, escapeHtml as esc } from '../../lib/af-element.js';
import { withI18n } from '../../lib/with-i18n.js';
import { svgEl, bindResize, bindLazy } from './render.js';
import { createTooltip } from './tooltip.js';
import { CHART_CSS } from './chart-theme.js';

// 图表骨架基类：子类实现 _isEmpty / _draw(svg, w, h) / _summary() / _srRows()
export class AfChart extends withI18n(AfElement) {
  static useShadow = true;
  // i18n：空态文案（语言切换时 _applyI18n 自动刷新）
  static i18n = {
    '.chart-empty': ['', 'ch.em'],
    '.chart-retry': ['', 'ch.rt'],
  };

  // 实测宽度：jsdom / 未布局时兜底 320
  _w() { return this.clientWidth || 320; }
  _h() { return this.height || (this._isSpark?.() ? 60 : 240); }

  mounted() {
    this.shadowRoot.innerHTML = `<style>${CHART_CSS}</style><div class="chart-wrap" part="chart"></div>`;
    this._tt = createTooltip(this.shadowRoot);
    if (this.lazy) this._io = bindLazy(this, () => this._render());
    else this._render();
    this._ro = bindResize(this, () => this._render());
  }

  unmounted() {
    this._ro?.disconnect();
    this._io?.disconnect();
    this._ro = this._io = null;
  }

  // 属性/property 变化（height/data/variant/loading/…）→ 重绘（AfElement defineProp 双向同步钩子）
  onAttributeChange() {
    if (this._mounted) this._render();
  }

  // 五态主渲染：loading → error → empty → success(_draw)
  _render() {
    if (!this.shadowRoot) return;
    const wrap = this.$('.chart-wrap');
    const w = this._w();
    const h = this._h();
    if (this.loading) {
      this.setAttribute('aria-busy', 'true');
      wrap.innerHTML = '';
      const state = document.createElement('div');
      state.className = 'chart-state';
      const sk = document.createElement('div');
      sk.className = 'chart-skeleton';
      sk.style.height = h + 'px';
      state.appendChild(sk);
      wrap.appendChild(state);
      return;
    }
    this.removeAttribute('aria-busy');
    if (this.error) {
      wrap.innerHTML = `<div class="chart-state"><span class="chart-error">${esc(this.error)}</span><button class="chart-retry" type="button"></button></div>`;
      wrap.querySelector('.chart-retry').addEventListener('click', () => this.emit(this._ev('retry')));
      this._applyI18n();
      return;
    }
    if (this._isEmpty()) {
      wrap.innerHTML = `<div class="chart-state"><span class="chart-empty"></span></div>`;
      this._applyI18n();
      return;
    }
    const svg = svgEl('svg', { width: w, height: h, viewBox: `0 0 ${w} ${h}` });
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', this._summary());
    this._draw(svg, w, h);
    wrap.innerHTML = '';
    wrap.appendChild(svg);
    if (this.legend) this._renderLegend(wrap);
    wrap.appendChild(this._srTable());
    this._bindPointer(svg);
  }

  // 事件名：af-chart-line:select 等（子类 static tag）
  _ev(action) { return `${this.constructor.tag}:${action}`; }

  // 图例：色点 + 名称（v1 只读）
  _renderLegend(wrap) {
    const items = this._legendItems();
    if (!items.length) return;
    const lg = document.createElement('div');
    lg.className = 'chart-legend';
    lg.part = 'legend';
    lg.innerHTML = items.map(it =>
      `<span class="chart-legend-item"><span class="chart-legend-dot" style="background:${esc(it.color)}"></span>${esc(it.name)}</span>`
    ).join('');
    wrap.appendChild(lg);
  }

  // 视觉隐藏数据表（屏幕阅读器读全量数据）
  _srTable() {
    const div = document.createElement('div');
    div.className = 'sr-table';
    const rows = this._srRows();
    div.innerHTML = `<table><caption>${esc(this._summary())}</caption>${rows}</table>`;
    return div;
  }

  // 指针交互：move → tooltip（子类 _onPoint），leave 隐藏，tap → select
  // 每次 _render 都为新 svg 绑定（监听器随元素丢弃，无泄漏）
  _bindPointer(svg) {
    const rel = (e) => {
      const r = svg.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    svg.addEventListener('pointermove', (e) => { const [x, y] = rel(e); this._onPoint?.(x, y, false); });
    svg.addEventListener('pointerleave', () => this._tt?.hide());
    svg.addEventListener('click', (e) => { const [x, y] = rel(e); this._onPoint?.(x, y, true); });
  }

  // 归一化数据 → [{ name, values, color }]（单序列 data / 多序列 labels+series 统一形态）
  _seriesList() {
    if (this.series?.length) return this.series;
    return [{ name: '', values: (this.data || []).map(d => d?.value ?? 0), colors: (this.data || []).map(d => d?.color) }];
  }
  _labels() {
    if (this.labels?.length) return this.labels;
    return (this.data || []).map(d => d?.label ?? '');
  }
}

// 通用属性（三组件共享；子类 defineProp 自动继承 observedAttributes）
AfElement.defineProp(AfChart.prototype, 'height', { type: Number, default: 0 });
AfElement.defineProp(AfChart.prototype, 'legend', { type: Boolean, default: false });
AfElement.defineProp(AfChart.prototype, 'loading', { type: Boolean, default: false });
AfElement.defineProp(AfChart.prototype, 'error', { type: String, default: '' });
AfElement.defineProp(AfChart.prototype, 'lazy', { type: Boolean, default: false });
