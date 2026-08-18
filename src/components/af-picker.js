// af-mobile UI —— af-picker：滚轮选择器
// Shadow DOM（useShadow=true），CSS scroll-snap 原生吸附
// 职责：多列滚轮 + scroll-snap 吸附 + 滚动停止触发 change + 确认/取消
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';
import { withI18n } from '../lib/with-i18n.js';

const CSS = `
  :host { display: contents; }
  .picker {
    position: fixed; left: 0; right: 0; bottom: 0;
    width: 100%; /* 覆盖 popover UA 的 width:fit-content，底部滚轮面板撑满全宽 */
    background: var(--c-card); border-radius: var(--r-l) var(--r-l) 0 0;
    box-shadow: var(--shadow-lg); z-index: var(--z-dropdown);
    padding-bottom: env(safe-area-inset-bottom);
  }
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
    flex: 1; overflow-y: scroll; scroll-snap-type: y mandatory;
    scrollbar-width: none; touch-action: pan-y;
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
    position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(var(--c-card), transparent calc(var(--af-item-h)*2), transparent calc(100% - var(--af-item-h)*2), var(--c-card));
  }
  .indicator {
    position: absolute; left: var(--s-3); right: var(--s-3);
    top: 50%; height: var(--af-item-h); transform: translateY(-50%);
    border-top: 1px solid var(--c-border); border-bottom: 1px solid var(--c-border);
    pointer-events: none;
  }
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
    return `${AfElement.cssTag(CSS, 'af-picker')}<div class="picker" part="picker" popover="auto"><div class="header" part="header"><button class="btn-cancel" part="cancel" type="button"></button><div class="title"></div><button class="btn-confirm" part="confirm" type="button"></button></div><div class="columns" part="columns"><div class="mask"></div><div class="indicator"></div></div></div>`;
  }

  mounted() {
    // DSD 已在解析阶段挂载 shadow root 时不再覆盖，仅接管事件（hydrate）
    this.shadowRoot.innerHTML ||= this.shadowHTML();
    this._picker = this.$('.picker');
    this._columnsEl = this.$('.columns');

    // popover=auto 的 light dismiss（点遮罩/Esc）会绕过 close()，用 toggle 事件兜底解锁 + 焦点还原
    this._onPickerToggle = (e) => {
      if (e.newState !== 'closed') return;
      this._unlockScroll();
      this.restoreFocus();
    };
    this._listen(this._picker, 'toggle', this._onPickerToggle);

    this._applyItemHeight();
    this._renderColumns();

    this._onCancelClick = () => {
      this.emit('af-picker:cancel', {});
      this.close();
    };
    this._listen(this.$('.btn-cancel'), 'click', this._onCancelClick);
    this._onConfirmClick = () => {
      this.emit('af-picker:confirm', { values: this.values });
      this.close();
    };
    this._listen(this.$('.btn-confirm'), 'click', this._onConfirmClick);

    // 初始滚动到选中项
    this._rafIds.push(requestAnimationFrame(() => this._scrollToValues(true)));
  }

  _applyItemHeight() {
    this.style.setProperty('--af-item-h', this.itemHeight + 'px');
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
      colEl.setAttribute('tabindex', '0');
      colEl.dataset.col = String(c);
      // aria-label 由 _applyI18n 设置（t('pk.col', { n: c + 1 })）

      const items = (col || []).map(_ni).map((item, i) => {
        const selected = this.values[c] != null && item.value === this.values[c];
        return `<div class="item${selected ? ' active' : ''}" role="option" data-idx="${i}" aria-selected="${selected}">${esc(item.label)}</div>`;
      }).join('');
      colEl.innerHTML = items;
      this._columnsEl.appendChild(colEl);
      this._scrollers.push(colEl);

      // scroll 防抖
      const onScroll = () => this._onColumnScroll(c);
      this._listen(colEl, 'scroll', onScroll);
      // 键盘 ↑↓
      const onKeydown = (e) => this._onColumnKeydown(c, e);
      this._listen(colEl, 'keydown', onKeydown);
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
    if (!colData || !colData[idx]) return;

    const newValues = [...this.values];
    newValues[c] = colData[idx].value;
    // defineProp 的 Array setter 会自动 setAttribute('values', ...)，无需手动同步
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
      it.setAttribute('aria-selected', String(selected));
    });
    col.setAttribute('aria-activedescendant', `pk-${c}-${idx}`);
    // 给 item 设 id 以便 aria-activedescendant 引用
    const target = col.querySelector(`[data-idx="${idx}"]`);
    if (target) target.id = `pk-${c}-${idx}`;
  }

  _findIndex(c, value) {
    const colData = (this.columns[c] || []).map(_ni);
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
    this.columns[colIdx] = items.map(_ni);
    if (value != null) {
      const newValues = [...this.values];
      newValues[colIdx] = value;
      this.values = newValues;
    }
    this._renderColumns();
    this._applyI18n(); // 新建 column 后重新应用 aria-label
    this._rafIds.push(requestAnimationFrame(() => {
      const col = this._scrollers[colIdx];
      if (!col) return;
      const idx = this._findIndex(colIdx, this.values[colIdx]);
      col.scrollTop = idx * this.itemHeight;
      this._updateActive(colIdx, idx);
    }));
  }

  open() {
    this._picker?.showPopover();
    this._lockScroll();
    // 焦点管理：保存触发元素 + 聚焦首列以便键盘操作
    this.saveFocus();
    this._rafIds.push(requestAnimationFrame(() => this._scrollers[0]?.focus()));
  }
  close() {
    this._picker?.hidePopover();
    this._unlockScroll();
    // 焦点还原到触发元素
    this.restoreFocus();
  }

  onAttributeChange(name, oldVal, newVal) {
    if (!this._picker) return;
    if (name === 'columns') {
      this._renderColumns();
      this._rafIds.push(requestAnimationFrame(() => this._scrollToValues(true)));
      // 新建 column 后需重新应用 i18n（aria-label 由 _applyI18n 设置）
      this._applyI18n();
    } else if (name === 'values') {
      this._rafIds.push(requestAnimationFrame(() => this._scrollToValues(true)));
    } else if (name === 'title' || name === 'confirm-text' || name === 'cancel-text') {
      // textContent 由 _applyI18n 重新计算（fallback=对应属性）
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
