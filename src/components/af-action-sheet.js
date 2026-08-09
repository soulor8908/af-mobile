// AIFlow UI —— af-action-sheet：底部操作面板
// Light DOM，复用 L2 .sheet/.list/.list-item 配方 + 原生 popover API
import { AfElement } from '../lib/af-element.js';

export class AfActionSheet extends AfElement {
  static useShadow = false;

  constructor() {
    super();
    this._previouslyFocused = null;
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
        this._focusFirst();
        this.emit('af-action-sheet:open', {});
      }
      if (e.newState === 'closed') {
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
    const opts = this.options || [];
    const itemsHtml = opts.map((opt, i) => {
      const cls = ['list-item'];
      let labelCls = 'flex-1';
      if (opt.danger) { cls.push('danger'); labelCls += ' text-danger'; }
      const disabled = opt.disabled ? ' disabled' : '';
      return `<button class="${cls.join(' ')}" data-idx="${i}"${disabled}><span class="${labelCls}">${opt.label}</span></button>`;
    }).join('');

    // 标题：用 caption + t-center + p-3 + text-muted（L2 配方/原子），分隔线用 .divider
    const titleHtml = this.title
      ? `<div class="caption t-center p-3 text-muted" role="heading" aria-level="2">${this.title}</div><div class="divider"></div>`
      : '';

    // 取消按钮：放在 .p-2 容器里以提供顶部 spacing（替代原 margin-top:var(--s-2) 内联）
    const cancelHtml = this.showCancel
      ? `<div class="p-2"></div><button class="btn btn-ghost btn-block af-action-sheet-cancel">${this.cancelText}</button>`
      : '';

    // role=dialog + aria-label（标题或默认"操作面板"）满足 WAI-ARIA dialog 模式
    const ariaLabel = this.title || '操作面板';
    this.innerHTML = `
      <div class="sheet" popover role="dialog" aria-label="${ariaLabel}">
        ${titleHtml}
        <div class="list">${itemsHtml}</div>
        ${cancelHtml}
      </div>
    `;
    this._sheet = this.$('.sheet');
  }

  showPopover() {
    this._sheet?.showPopover();
  }
  hidePopover() {
    this._sheet?.hidePopover();
  }

  onAttributeChange(name, oldVal, newVal) {
    if (!this._sheet) return;
    this._render();
    this._bindEvents();
  }

  unmounted() {
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
AfElement.defineProp(AfActionSheet.prototype, 'cancelText', { attr: 'cancel-text', type: String, default: '取消' });
