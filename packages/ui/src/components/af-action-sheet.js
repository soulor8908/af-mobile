// AIFlow UI —— af-action-sheet：底部操作面板
// Light DOM，复用 L2 .sheet/.list/.list-item 配方 + 原生 popover API
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';
import { withI18n } from '../lib/with-i18n.js';

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
    this._previouslyFocused = null;
    this._scrollLocked = false;
  }

  mounted() {
    this._render();
    this._isSelecting = false;
    this._bindEvents();
  }

  _bindEvents() {
    this._onClick = (e) => {
      const item = e.target.closest('.list-item');
      if (!item || item.disabled) return;
      const idx = Number(item.dataset.idx);
      const option = this.options[idx];
      if (!option) return;
      this._isSelecting = true;
      this.hidePopover();
      this.emit('af-action-sheet:select', { index: idx, value: option.value });
      this.emit('af-action-sheet:close', {});
      this._isSelecting = false;
    };
    this._sheet.addEventListener('click', this._onClick);

    this._onCancelClick = () => {
      this.hidePopover();
      this.emit('af-action-sheet:close', {});
    };
    this._cancelBtn = this.$('.af-action-sheet-cancel');
    this._cancelBtn?.addEventListener('click', this._onCancelClick);

    this._onToggle = (e) => {
      if (e.newState === 'open') {
        this._previouslyFocused = document.activeElement;
        AfElement.lockScroll();
        this._scrollLocked = true;
        this._focusFirst();
        this.emit('af-action-sheet:open', {});
      }
      if (e.newState === 'closed') {
        if (this._scrollLocked) { AfElement.unlockScroll(); this._scrollLocked = false; }
        if (!this._isSelecting) {
          this.emit('af-action-sheet:close', {});
        }
        this._restoreFocus();
      }
    };
    this._sheet.addEventListener('toggle', this._onToggle);

    // 焦点陷阱补强（原生 popover 焦点陷阱行为不一致，与 af-dialog 对称）
    this._onKeydown = (e) => this._trapKeydown(e);
    this._sheet.addEventListener('keydown', this._onKeydown);
  }

  _getFocusable() {
    return [...this._sheet.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )].filter(el => !el.disabled && el.offsetParent !== null);
  }

  _focusFirst() {
    const focusable = this._getFocusable();
    if (focusable.length) focusable[0].focus();
    else { this._sheet.tabIndex = -1; this._sheet.focus(); }
  }

  _trapKeydown(e) {
    if (e.key !== 'Tab') return;
    const focusable = this._getFocusable();
    if (focusable.length < 2) { e.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  _restoreFocus() {
    if (this._previouslyFocused && typeof this._previouslyFocused.focus === 'function') {
      this._previouslyFocused.focus();
      this._previouslyFocused = null;
    }
  }

  _render() {
    this.innerHTML = `
      <div class="sheet" popover role="dialog">
        <div class="list"></div>
      </div>
    `;
    this._sheet = this.$('.sheet');
    this._list = this.$('.list');
    this._renderContent();
  }

  // 仅更新标题/列表/取消按钮（保留 .sheet 元素及其 popover 状态 + 事件监听，不关闭已打开的浮层）
  // 与 af-dropdown._renderList 对称：避免属性变化时整树重建导致 popover 关闭、焦点丢失
  _renderContent() {
    if (!this._sheet) return;
    const opts = this.options || [];
    // 危险项用 text-danger 原子类着色（.danger 无 CSS 定义，已移除）
    const itemsHtml = opts.map((opt, i) => {
      const labelCls = opt.danger ? 'flex-1 text-danger' : 'flex-1';
      const disabled = opt.disabled ? ' disabled' : '';
      return `<button class="list-item" data-idx="${i}"${disabled}><span class="${labelCls}">${esc(opt.label)}</span></button>`;
    }).join('');

    const titleHtml = this.title
      ? `<div class="caption t-center p-3 text-muted" role="heading" aria-level="2">${esc(this.title)}</div><div class="divider"></div>`
      : '';

    const cancelHtml = this.showCancel
      ? `<div class="p-2"></div><button class="btn btn-ghost btn-block af-action-sheet-cancel"></button>`
      : '';

    this._sheet.innerHTML = `${titleHtml}<div class="list">${itemsHtml}</div>${cancelHtml}`;
    this._list = this.$('.list');
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
    this._cancelBtn?.removeEventListener('click', this._onCancelClick);
    this._cancelBtn?.addEventListener('click', this._onCancelClick);
    // 重渲染后重新应用 i18n（.sheet aria-label + cancelBtn textContent 由 _applyI18n 设置）
    this._applyI18n();
  }

  unmounted() {
    if (this._scrollLocked) AfElement.unlockScroll();
    // Light DOM 元素随组件销毁，removeEventListener 是为通过 wc-cleanup 检测
    this._sheet?.removeEventListener('click', this._onClick);
    this._sheet?.removeEventListener('toggle', this._onToggle);
    this._sheet?.removeEventListener('keydown', this._onKeydown);
    this._cancelBtn?.removeEventListener('click', this._onCancelClick);
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfActionSheet.prototype, 'options', { type: Array, default: [] });
AfElement.defineProp(AfActionSheet.prototype, 'title', { type: String, default: '' });
AfElement.defineProp(AfActionSheet.prototype, 'showCancel', { attr: 'show-cancel', type: Boolean, default: true });
AfElement.defineProp(AfActionSheet.prototype, 'cancelText', { attr: 'cancel-text', type: String, default: null });
