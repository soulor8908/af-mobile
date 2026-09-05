// af-mobile UI —— af-picker：滚轮选择器
// Shadow DOM（useShadow=true），CSS scroll-snap 原生吸附
// 职责：多列滚轮 + scroll-snap 吸附 + 滚动停止触发 change + 确认/取消
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';
import { withI18n } from '../lib/with-i18n.js';

const CSS = `
  :host { display: contents; }
  .picker {
    border: none;
    border-radius: var(--af-picker-radius, 16px) var(--af-picker-radius, 16px) 0;
    max-width: 100vw; width: 100%;
    margin: auto 0 0 0;
    padding: 0 0 env(safe-area-inset-bottom);
    background: var(--c-card);
    box-shadow: var(--shadow-lg);
    animation: picker-up var(--dur-base) var(--ease-out);
  }
  @keyframes picker-up { from { transform: translateY(100%); } }
  .picker::backdrop { background: rgba(0, 0, 0, .7); }
  .header {
    display: flex; align-items: center; justify-content: space-between;
    padding: var(--s-3) var(--s-4); border-bottom: 1px solid var(--c-border);
  }
  .btn-cancel, .btn-confirm { background: none; border: none; font-size: var(--t-md); padding: var(--s-1) var(--s-2); cursor: pointer; }
  .btn-cancel { color: var(--c-muted); }
  .btn-confirm { color: var(--c-brand); font-weight: var(--fw-medium); }
  .title { font-size: var(--t-md); font-weight: var(--fw-medium); color: var(--c-text); }
  .columns { display: flex; position: relative; }
  .column {
    flex: 1; position: relative; overflow-y: scroll; scroll-snap-type: y mandatory;
    scrollbar-width: none; touch-action: pan-y;
  }
  .column:focus-visible { outline: 2px solid var(--c-brand); outline-offset: -2px; }
  .column::-webkit-scrollbar { display: none; }
  .item {
    height: var(--af-item-h); line-height: var(--af-item-h);
    scroll-snap-align: center; text-align: center;
    font-size: var(--t-md); color: var(--c-muted);
    overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  }
  .item.active { color: var(--c-text); font-weight: var(--fw-bold); }
  .mask {
    position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(var(--c-card), transparent calc(var(--af-item-h)*2), transparent calc(100% - var(--af-item-h)*2), var(--c-card));
  }
  .indicator {
    position: absolute; left: var(--s-3); right: var(--s-3);
    top: 50%; height: var(--af-item-h); transform: translateY(-50%);
    border-top: 1px solid var(--c-border);
    border-bottom: 1px solid var(--c-border);
    pointer-events: none;
  }
  .column::before, .column::after { content: ''; display: block; height: var(--af-spacer-h); }
`;

// 将 string 项归一化为 {label, value}，使 API 同时支持 string[] 和 PickerItem[]
const _ni = item => typeof item === 'string' ? { label: item, value: item } : item;

export class AfPicker extends withI18n(AfElement) {
  static useShadow = true;
  // i18n 映射表：title/confirm/cancel 用静态 fallback 形式（属性优先，否则字典）；column aria-label 用循环索引
  static i18n = {
    'div.title':          ['', 'pk.tt', 'title'],
    'button.btn-confirm': ['', 'pk.ok', 'confirmText'],
    'button.btn-cancel':  ['', 'pk.cn', 'cancelText'],
    '.column':            ['aria-label', (host, t, el, i) => t('pk.col', { n: i + 1 })],
  };

  constructor() {
    super();
    this._scrollers = [];
    this._scrollTimers = new Map();
    this._rafIds = [];
  }

  // 完整 shadow 模板（DSD 声明式封装 + mounted 动态渲染共用同一结构）
  shadowHTML() {
    return `${AfElement.cssTag(CSS, 'af-picker')}<dialog class="picker" part="picker"><div class="header" part="header"><button class="btn-cancel" part="cancel" type="button"></button><div class="title"></div><button class="btn-confirm" part="confirm" type="button"></button></div><div class="columns" part="columns"><div class="mask"></div><div class="indicator"></div></div></dialog>`;
  }

  mounted() {
    this.shadowRoot.innerHTML ||= this.shadowHTML();
    this._picker = this.$('.picker');
    this._columnsEl = this.$('.columns');

    // dialog showModal 的 light dismiss：Esc 触发 cancel，backdrop 点击 target===dialog
    this._listen(this._picker, 'cancel', (e) => {
      e.preventDefault();
      this.close();
    });
    this._listen(this._picker, 'click', (e) => {
      if (e.target === this._picker) this.close();
    });

    this._applyItemHeight();
    this._renderColumns();

    this._listen(this.$('.btn-cancel'), 'click', () => {
      this.emit('af-picker:cancel', {});
      this.close();
    });
    this._listen(this.$('.btn-confirm'), 'click', () => {
      this.emit('af-picker:confirm', { values: this.values });
      this.close();
    });

    // 初始滚动到选中项
    this._rafIds.push(requestAnimationFrame(() => this._scrollToValues()));
  }

  _applyItemHeight() {
    this.style.setProperty('--af-item-h', this.itemHeight + 'px');
    // 上下 spacer 高度 = (visibleCount-1)/2 * itemHeight，让首尾 item 也能滚到中心
    this.style.setProperty('--af-spacer-h', Math.floor((this.visibleCount - 1) / 2) * this.itemHeight + 'px');
    if (this._columnsEl) this._columnsEl.style.height = this.itemHeight * this.visibleCount + 'px';
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
      colEl.tabIndex = 0;
      colEl.dataset.col = c;

      const items = (col || []).map(_ni).map((item, i) => {
        const selected = this.values[c] != null && item.value === this.values[c];
        return `<div class="item${selected ? ' active' : ''}" role="option" data-idx="${i}" aria-selected="${selected}">${esc(item.label)}</div>`;
      }).join('');
      // 上下 spacer 由 .column::before/::after 提供（CSS 伪元素，让首尾 item 也能滚到中心）
      colEl.innerHTML = items;
      this._columnsEl.appendChild(colEl);
      this._scrollers.push(colEl);

      // scroll 防抖 + 键盘 ↑↓
      this._listen(colEl, 'scroll', () => this._onColumnScroll(c));
      this._listen(colEl, 'keydown', (e) => this._onColumnKeydown(c, e));
    });
  }

  _onColumnScroll(c) {
    const col = this._scrollers[c];
    if (!col) return;
    clearTimeout(this._scrollTimers.get(c));
    this._scrollTimers.set(c, setTimeout(() => this._onColumnScrollEnd(c), 100));
  }

  _onColumnScrollEnd(c) {
    const col = this._scrollers[c];
    if (!col) return;
    const idx = Math.round(col.scrollTop / this.itemHeight);
    const colData = (this.columns[c] || []).map(_ni);
    if (!colData[idx]) return;

    const newValues = [...this.values];
    newValues[c] = colData[idx].value;
    this.values = newValues;

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
      it.setAttribute('aria-selected', selected);
    });
    col.setAttribute('aria-activedescendant', `pk-${c}-${idx}`);
    const target = col.querySelector(`[data-idx="${idx}"]`);
    if (target) target.id = `pk-${c}-${idx}`;
  }

  _findIndex(c, value) {
    const colData = (this.columns[c] || []).map(_ni);
    const idx = colData.findIndex(item => item.value === value);
    return idx >= 0 ? idx : 0;
  }

  _scrollToValues() {
    this._scrollers.forEach((col, c) => {
      const idx = this._findIndex(c, this.values[c]);
      col.scrollTop = idx * this.itemHeight;
      this._updateActive(c, idx);
    });
  }

  // 联动后重新渲染某列（用户在 change 事件中调）
  setColumn(colIdx, items, value) {
    if (!this.columns[colIdx]) return;
    this.columns[colIdx] = items.map(_ni);
    if (value != null) {
      const newValues = [...this.values];
      newValues[colIdx] = value;
      this.values = newValues;
    }
    this._renderColumns();
    this._applyI18n();
    this._rafIds.push(requestAnimationFrame(() => this._scrollToValues()));
  }

  open() {
    if (!this._picker || this._picker.open) return;
    this._picker.showModal();
    this._lockScroll();
    this.saveFocus();
    this._rafIds.push(requestAnimationFrame(() => {
      this._scrollToValues();
      this._scrollers[0]?.focus();
    }));
  }
  close() {
    if (!this._picker) return;
    this._picker.close();
    this._unlockScroll();
    this.restoreFocus();
  }

  onAttributeChange(name, oldVal, newVal) {
    if (!this._picker) return;
    if (name === 'columns') {
      this._renderColumns();
      this._rafIds.push(requestAnimationFrame(() => this._scrollToValues()));
      this._applyI18n();
    } else if (name === 'values') {
      this._rafIds.push(requestAnimationFrame(() => this._scrollToValues()));
    } else if (name === 'title' || name === 'confirm-text' || name === 'cancel-text') {
      this._applyI18n();
    } else if (name === 'item-height' || name === 'visible-count') {
      this._applyItemHeight();
    }
  }

  unmounted() {
    this._unlockScroll();
    this._scrollTimers.forEach(t => clearTimeout(t));
    this._scrollTimers.clear();
    this._rafIds.forEach(id => cancelAnimationFrame(id));
    this._rafIds = [];
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfPicker.prototype, 'columns', []);
AfElement.defineProp(AfPicker.prototype, 'values', []);
AfElement.defineProp(AfPicker.prototype, 'title', null);
AfElement.defineProp(AfPicker.prototype, 'confirmText', null);
AfElement.defineProp(AfPicker.prototype, 'cancelText', null);
AfElement.defineProp(AfPicker.prototype, 'itemHeight', 36);
AfElement.defineProp(AfPicker.prototype, 'visibleCount', 5);
