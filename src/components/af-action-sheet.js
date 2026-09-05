// af-mobile UI —— af-action-sheet：底部操作面板
// Light DOM，复用 L2 .sheet/.as-* 配方 + 原生 popover API（T0.9 Vant 对齐：通栏贴边、项居中 16px）
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';
import { withI18n } from '../lib/with-i18n.js';

// 将 string 项归一化为 {label, value}，使 API 同时支持 string[] 和 ActionSheetItem[]
const _ni = item => typeof item === 'string' ? { label: item, value: item } : item;

export class AfActionSheet extends withI18n(AfElement) {
  static useShadow = false;
  // i18n 映射表：.sheet aria-label 优先用 title，否则字典；取消按钮 textContent 优先用 cancelText，否则字典
  // 取消按钮仅在 showCancel=true 时渲染；querySelectorAll 返回空则跳过
  static i18n = {
    '.sheet':                  ['aria-label', 'as.al', 'title'],
    '.af-action-sheet-cancel': ['',          'as.cn', 'cancelText'],
  };

  constructor() {
    super();
    this._isSelecting = false;
  }

  mounted() {
    this._render();
    this._bindEvents();
  }

  _bindEvents() {
    this._onClick = (e) => {
      const item = e.target.closest('.as-item');
      if (!item || item.disabled) return;
      const idx = Number(item.dataset.idx);
      const option = (this.options || []).map(_ni)[idx];
      if (!option) return;
      this._isSelecting = true;
      this.hidePopover();
      this.emit('af-action-sheet:select', { index: idx, value: option.value });
      this.emit('af-action-sheet:close', {});
      this._isSelecting = false;
    };
    this._listen(this._sheet, 'click', this._onClick);

    this._onCancelClick = () => {
      this.hidePopover();
      this.emit('af-action-sheet:close', {});
    };
    this._cancelBtn = this.$('.af-action-sheet-cancel');
    this._listen(this._cancelBtn, 'click', this._onCancelClick);

    this._onToggle = (e) => {
      if (e.newState === 'open') {
        this.saveFocus();
        this._lockScroll();
        this._focusFirst(this._sheet);
        this.emit('af-action-sheet:open', {});
      }
      if (e.newState === 'closed') {
        this._unlockScroll();
        if (!this._isSelecting) {
          this.emit('af-action-sheet:close', {});
        }
        this.restoreFocus();
      }
    };
    this._listen(this._sheet, 'toggle', this._onToggle);

    // 焦点陷阱补强（原生 popover 焦点陷阱行为不一致，与 af-dialog 对称）
    this._onKeydown = (e) => this._trapTab(e, this._sheet);
    this._listen(this._sheet, 'keydown', this._onKeydown);
  }

  _render() {
    this.innerHTML = `
      <div class="sheet" popover role="dialog"></div>
    `;
    this._sheet = this.$('.sheet');
    this._renderContent();
  }

  // 仅更新标题/列表/取消按钮（保留 .sheet 元素及其 popover 状态 + 事件监听，不关闭已打开的浮层）
  // 与 af-dropdown._renderList 对称：避免属性变化时整树重建导致 popover 关闭、焦点丢失
  // T0.9 Vant 对齐：项居中 16px（.as-item）、subname 副标题、loading 同 disabled 灰色态、
  // 取消区前 8px 灰底间隔块（.as-gap）；标题用 .as-header 48px 居中（替代 caption 组合）
  _renderContent() {
    if (!this._sheet) return;
    const opts = (this.options || []).map(_ni);
    // 危险项用 text-danger 原子类着色；loading 项禁用交互（aria-busy）
    const itemsHtml = opts.map((opt, i) => {
      const cls = opt.danger ? 'as-item text-danger' : 'as-item';
      const disabled = opt.disabled || opt.loading ? ' disabled' : '';
      const busy = opt.loading ? ' aria-busy="true"' : '';
      const sub = opt.subname ? `<span class="as-sub">${esc(opt.subname)}</span>` : '';
      return `<button class="${cls}" data-idx="${i}"${disabled}${busy}>${esc(opt.label)}${sub}</button>`;
    }).join('');

    const titleHtml = this.title
      ? `<div class="as-header" role="heading" aria-level="2">${esc(this.title)}</div>`
      : '';

    const cancelHtml = this.showCancel
      ? `<div class="as-gap" role="presentation"></div><button class="as-cancel af-action-sheet-cancel"></button>`
      : '';

    this._sheet.innerHTML = `${titleHtml}<div class="as-body">${itemsHtml}</div>${cancelHtml}`;
    this._list = this.$('.as-body');
    this._cancelBtn = this.$('.af-action-sheet-cancel');
  }

  showPopover() {
    this._sheet?.showPopover();
  }
  hidePopover() {
    this._sheet?.hidePopover();
  }

  // 按属性做最小更新，避免整树重建关闭已打开的浮层 + 丢失焦点
  onAttributeChange(name, oldVal, newVal) {
    if (!this._sheet) return;
    this._renderContent();
    // cancelBtn 引用变了需重绑；列表/标题项变化不涉及事件绑定（click 委托在 _sheet 上）
    // 先解绑旧节点（避免同节点双触发），新节点经 _listen 登记、断开时统一解绑
    this._cancelBtn?.removeEventListener('click', this._onCancelClick);
    this._listen(this._cancelBtn, 'click', this._onCancelClick);
    // 重渲染后重新应用 i18n（.sheet aria-label + cancelBtn textContent 由 _applyI18n 设置）
    this._applyI18n();
  }

  unmounted() {
    this._unlockScroll();
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfActionSheet.prototype, 'options', []);
AfElement.defineProp(AfActionSheet.prototype, 'title', '');
AfElement.defineProp(AfActionSheet.prototype, 'showCancel', true);
AfElement.defineProp(AfActionSheet.prototype, 'cancelText', null);
