// AIFlow UI —— af-action-sheet：底部操作面板
// Light DOM，复用 L2 .sheet/.list/.list-item 配方 + 原生 popover API
import { AfElement } from '../lib/af-element.js';

export class AfActionSheet extends AfElement {
  static useShadow = false;

  constructor() {
    super();
  }

  mounted() {
    this._render();
    this._sheet = this.$('.sheet');
    this._isSelecting = false;

    this._sheet.addEventListener('click', (e) => {
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
    });

    const cancelBtn = this.$('.af-action-sheet-cancel');
    cancelBtn?.addEventListener('click', () => {
      this.hidePopover();
      this.emit('af-action-sheet:close', {});
    });

    this._sheet.addEventListener('toggle', (e) => {
      if (e.newState === 'closed' && !this._isSelecting) {
        this.emit('af-action-sheet:close', {});
      }
      if (e.newState === 'open') {
        this.emit('af-action-sheet:open', {});
      }
    });
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

    const titleHtml = this.title
      ? `<div class="af-action-sheet-title" role="heading" aria-level="2" style="padding:var(--s-3) var(--s-4);text-align:center;color:var(--c-muted);font-size:var(--t-sm);border-bottom:1px solid var(--c-border);">${this.title}</div>`
      : '';

    const cancelHtml = this.showCancel
      ? `<button class="btn btn-ghost btn-block af-action-sheet-cancel" style="margin-top:var(--s-2);">${this.cancelText}</button>`
      : '';

    this.innerHTML = `
      <div class="sheet" popover>
        ${titleHtml}
        <div class="list">${itemsHtml}</div>
        ${cancelHtml}
      </div>
    `;
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
    this._sheet = this.$('.sheet');
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfActionSheet.prototype, 'options', { type: Array, default: [] });
AfElement.defineProp(AfActionSheet.prototype, 'title', { type: String, default: '' });
AfElement.defineProp(AfActionSheet.prototype, 'showCancel', { attr: 'show-cancel', type: Boolean, default: true });
AfElement.defineProp(AfActionSheet.prototype, 'cancelText', { attr: 'cancel-text', type: String, default: '取消' });
