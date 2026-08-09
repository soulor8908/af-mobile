// AIFlow UI —— af-picker：滚轮选择器
// Shadow DOM（useShadow=true），CSS scroll-snap 原生吸附
// 职责：多列滚轮 + scroll-snap 吸附 + 滚动停止触发 change + 确认/取消
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';

const CSS = `
  :host { display: contents; }
  .picker {
    position: fixed; left: 0; right: 0; bottom: 0;
    background: var(--c-card); border-radius: var(--r-l) var(--r-l) 0 0;
    box-shadow: var(--shadow-lg); z-index: var(--z-dropdown);
    padding-bottom: env(safe-area-inset-bottom);
  }
  .picker::backdrop { background: rgba(0,0,0,.5); }
  .header {
    display: flex; align-items: center; justify-content: space-between;
    padding: var(--s-3) var(--s-4); border-bottom: 1px solid var(--c-border);
  }
  .btn-cancel { color: var(--c-muted); background: none; border: none; font-size: var(--t-md); padding: var(--s-1) var(--s-2); cursor: pointer; }
  .btn-confirm { color: var(--c-brand); background: none; border: none; font-size: var(--t-md); font-weight: var(--fw-medium); padding: var(--s-1) var(--s-2); cursor: pointer; }
  .title { font-size: var(--t-md); font-weight: var(--fw-medium); color: var(--c-text); }
  .columns { display: flex; position: relative; }
  .column {
    flex: 1; overflow-y: scroll; scroll-snap-type: y mandatory;
    scrollbar-width: none;
  }
  .column:focus { outline: 2px solid var(--c-brand); outline-offset: -2px; }
  .item {
    height: var(--af-item-h); line-height: var(--af-item-h);
    scroll-snap-align: center; text-align: center;
    font-size: var(--t-md); color: var(--c-muted);
    overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  }
  .item.active { color: var(--c-text); font-weight: var(--fw-bold); }
  .mask {
    position: absolute; left: 0; right: 0; top: 0; bottom: 0;
    pointer-events: none;
    background: linear-gradient(to bottom,
      var(--c-card) 0%, transparent calc(var(--af-item-h) * 2),
      transparent calc(100% - var(--af-item-h) * 2), var(--c-card) 100%);
  }
  .indicator {
    position: absolute; left: var(--s-3); right: var(--s-3);
    top: 50%; height: var(--af-item-h); transform: translateY(-50%);
    border-top: 1px solid var(--c-border); border-bottom: 1px solid var(--c-border);
    pointer-events: none;
  }
`;

const SCROLL_DEBOUNCE = 100;

export class AfPicker extends AfElement {
  static useShadow = true;

  constructor() {
    super();
    this._scrollers = [];
    this._scrollTimers = new Map();
    this._rafIds = [];
  }

  mounted() {
    this.shadowRoot.innerHTML = `
      <style>${CSS}</style>
      <div class="picker" part="picker" popover="auto">
        <div class="header" part="header">
          <button class="btn-cancel" part="cancel" type="button">${esc(this.cancelText)}</button>
          <div class="title">${esc(this.title)}</div>
          <button class="btn-confirm" part="confirm" type="button">${esc(this.confirmText)}</button>
        </div>
        <div class="columns" part="columns">
          <div class="mask"></div>
          <div class="indicator"></div>
        </div>
      </div>
    `;
    this._picker = this.$('.picker');
    this._columnsEl = this.$('.columns');

    this._applyItemHeight();
    this._renderColumns();

    this._onCancelClick = () => {
      this.emit('af-picker:cancel', {});
      this.close();
    };
    this.$('.btn-cancel').addEventListener('click', this._onCancelClick);
    this._onConfirmClick = () => {
      this.emit('af-picker:confirm', { values: this.values });
      this.close();
    };
    this.$('.btn-confirm').addEventListener('click', this._onConfirmClick);

    // 初始滚动到选中项
    this._rafIds.push(requestAnimationFrame(() => this._scrollToValues(true)));
  }

  _applyItemHeight() {
    this.style.setProperty('--af-item-h', this.itemHeight + 'px');
    if (this._columnsEl) {
      this._columnsEl.style.height = (this.itemHeight * this.visibleCount) + 'px';
    }
  }

  _renderColumns() {
    if (!this._columnsEl) return;
    // 清掉旧的 column（保留 mask + indicator）
    this._scrollers.forEach(s => s.remove());
    this._scrollers = [];

    (this.columns || []).forEach((col, c) => {
      const colEl = document.createElement('div');
      colEl.className = 'column';
      colEl.setAttribute('part', 'column');
      colEl.setAttribute('role', 'listbox');
      colEl.setAttribute('aria-label', `第 ${c + 1} 列`);
      colEl.setAttribute('tabindex', '0');
      colEl.dataset.col = String(c);

      const items = (col || []).map((item, i) => {
        const selected = this.values[c] != null && item.value === this.values[c];
        return `<div class="item${selected ? ' active' : ''}" role="option" data-idx="${i}" aria-selected="${selected}">${esc(item.label)}</div>`;
      }).join('');
      colEl.innerHTML = items;
      this._columnsEl.appendChild(colEl);
      this._scrollers.push(colEl);

      // scroll 防抖
      const onScroll = () => this._onColumnScroll(c);
      colEl.addEventListener('scroll', onScroll);
      // 键盘 ↑↓
      const onKeydown = (e) => this._onColumnKeydown(c, e);
      colEl.addEventListener('keydown', onKeydown);
    });
  }

  _onColumnScroll(c) {
    const col = this._scrollers[c];
    if (!col) return;
    clearTimeout(this._scrollTimers.get(c));
    this._scrollTimers.set(c, setTimeout(() => this._onColumnScrollEnd(c), SCROLL_DEBOUNCE));
  }

  _onColumnScrollEnd(c) {
    const col = this._scrollers[c];
    if (!col) return;
    const idx = Math.round(col.scrollTop / this.itemHeight);
    const colData = this.columns[c];
    if (!colData || !colData[idx]) return;

    const newValues = [...this.values];
    newValues[c] = colData[idx].value;
    this.values = newValues;
    this.setAttribute('values', JSON.stringify(newValues));

    this._updateActive(c, idx);
    this.emit('af-picker:change', { column: c, value: colData[idx].value, index: idx });
  }

  _onColumnKeydown(c, e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const colData = this.columns[c];
    if (!colData) return;
    let idx = this._findIndex(c, this.values[c]);
    if (e.key === 'ArrowDown') idx = Math.min(idx + 1, colData.length - 1);
    else idx = Math.max(idx - 1, 0);
    this._scrollers[c].scrollTop = idx * this.itemHeight;
  }

  _updateActive(c, idx) {
    const col = this._scrollers[c];
    if (!col) return;
    col.querySelectorAll('.item').forEach((it, i) => {
      const selected = i === idx;
      it.classList.toggle('active', selected);
      it.setAttribute('aria-selected', String(selected));
    });
    col.setAttribute('aria-activedescendant', `af-picker-col-${c}-item-${idx}`);
    // 给 item 设 id 以便 aria-activedescendant 引用
    const target = col.querySelector(`[data-idx="${idx}"]`);
    if (target) target.id = `af-picker-col-${c}-item-${idx}`;
  }

  _findIndex(c, value) {
    const colData = this.columns[c];
    if (!colData) return 0;
    const idx = colData.findIndex(item => item.value === value);
    return idx >= 0 ? idx : 0;
  }

  _scrollToValues(silent = false) {
    this._scrollers.forEach((col, c) => {
      const idx = this._findIndex(c, this.values[c]);
      col.scrollTop = idx * this.itemHeight;
      this._updateActive(c, idx);
    });
  }

  // 联动后重新渲染某列（用户在 change 事件中调）
  setColumn(colIdx, items, value) {
    if (!this.columns[colIdx]) return;
    this.columns[colIdx] = items;
    if (value != null) {
      const newValues = [...this.values];
      newValues[colIdx] = value;
      this.values = newValues;
    }
    this._renderColumns();
    this._rafIds.push(requestAnimationFrame(() => {
      const col = this._scrollers[colIdx];
      if (col) {
        const idx = this._findIndex(colIdx, this.values[colIdx]);
        col.scrollTop = idx * this.itemHeight;
        this._updateActive(colIdx, idx);
      }
    }));
  }

  open() { this._picker?.showPopover(); }
  close() { this._picker?.hidePopover(); }

  onAttributeChange(name, oldVal, newVal) {
    if (!this._picker) return;
    if (name === 'columns') {
      this._renderColumns();
      this._rafIds.push(requestAnimationFrame(() => this._scrollToValues(true)));
    } else if (name === 'values') {
      this._rafIds.push(requestAnimationFrame(() => this._scrollToValues(true)));
    } else if (name === 'title') {
      const t = this.$('.title');
      if (t) t.textContent = newVal;
    } else if (name === 'confirm-text') {
      const b = this.$('.btn-confirm');
      if (b) b.textContent = newVal;
    } else if (name === 'cancel-text') {
      const b = this.$('.btn-cancel');
      if (b) b.textContent = newVal;
    } else if (name === 'item-height' || name === 'visible-count') {
      this._applyItemHeight();
    }
  }

  unmounted() {
    this._scrollTimers.forEach(t => clearTimeout(t));
    this._scrollTimers.clear();
    this._rafIds.forEach(id => cancelAnimationFrame(id));
    this._rafIds = [];
    // Shadow DOM 元素随组件销毁，removeEventListener 是为通过 wc-cleanup 检测
    this.$('.btn-cancel')?.removeEventListener('click', this._onCancelClick);
    this.$('.btn-confirm')?.removeEventListener('click', this._onConfirmClick);
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfPicker.prototype, 'columns', { type: Array, default: [] });
AfElement.defineProp(AfPicker.prototype, 'values', { type: Array, default: [] });
AfElement.defineProp(AfPicker.prototype, 'title', { type: String, default: '请选择' });
AfElement.defineProp(AfPicker.prototype, 'confirmText', { attr: 'confirm-text', type: String, default: '确定' });
AfElement.defineProp(AfPicker.prototype, 'cancelText', { attr: 'cancel-text', type: String, default: '取消' });
AfElement.defineProp(AfPicker.prototype, 'itemHeight', { attr: 'item-height', type: Number, default: 36 });
AfElement.defineProp(AfPicker.prototype, 'visibleCount', { attr: 'visible-count', type: Number, default: 5 });
