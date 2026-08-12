// AIFlow UI —— af-dialog：模态对话框
// Shadow DOM（useShadow=true），基于原生 <dialog> + showModal()
// 职责：模态遮罩 + 焦点陷阱（原生 + 兜底）+ Esc/backdrop 关闭 + 焦点还原
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';

const CSS = `
  :host { display: contents; }
  dialog {
    border: none; border-radius: var(--r-l); background: var(--c-card);
    color: var(--c-text); padding: 0; max-width: 90vw;
    box-shadow: var(--shadow-lg);
  }
  dialog::backdrop { background: rgba(0,0,0,.5); }
  dialog::backdrop { backdrop-filter: blur(2px); }
  header { padding: var(--s-4); border-bottom: 1px solid var(--c-border); position: relative; }
  .title { font-size: var(--t-xl); font-weight: var(--fw-bold); line-height: var(--lh-tight); }
  .close-btn {
    position: absolute; top: var(--s-2); right: var(--s-2);
    background: none; border: none; color: var(--c-muted);
    font-size: var(--t-lg); cursor: pointer; padding: var(--s-1); line-height: 1;
  }
  .body { padding: var(--s-4); }
  footer { display: flex; gap: var(--s-2); padding: var(--s-3) var(--s-4); border-top: 1px solid var(--c-border); }
  footer > ::slotted(.btn) { flex: 1; }
  :host([variant="bottom"]) dialog {
    border-radius: var(--r-l) var(--r-l) 0 0;
    max-width: 100vw; width: 100%;
    margin: auto 0 0 0;
  }
  :host([variant="center"]) dialog { max-width: 70vw; }
`;

export class AfDialog extends AfElement {
  static useShadow = true;
  // i18n 映射表：close-btn 关闭按钮 aria-label；dialog aria-label 优先用 title，否则字典兜底
  // aria-label 由 _applyI18n 在 connectedCallback 末尾统一应用（mounted 之后）
  static i18n = {
    '.close-btn': ['aria-label', 'dg.cl'],
    'dialog':     ['aria-label', 'dg.al', 'title', 'aria-label'],
  };

  constructor() {
    super();
    this.returnValue = null;
    this._previouslyFocused = null;
    this._scrollLocked = false;
  }

  get isOpen() { return this._dialog ? this._dialog.open : false; }

  mounted() {
    this.shadowRoot.innerHTML = `
      <style>${CSS}</style>
      <dialog part="dialog" role="dialog">
        <header part="header">
          <h2 class="title"><slot name="title">${esc(this.title)}</slot></h2>
          <button class="close-btn" part="close" type="button">×</button>
        </header>
        <div class="body" part="content"><slot name="body"></slot></div>
        <footer part="footer"><slot name="footer"></slot></footer>
      </dialog>
    `;
    this._dialog = this.$('dialog');

    // Esc 关闭
    this._onCancel = (e) => {
      if (!this.closeOnEsc) { e.preventDefault(); return; }
      e.preventDefault();
      this.close('esc');
    };
    this._dialog.addEventListener('cancel', this._onCancel);

    // backdrop 点击关闭：showModal 时 dialog 自身即 backdrop 区域
    this._onClick = (e) => {
      if (this.closeOnBackdrop && e.target === this._dialog) this.close('backdrop');
    };
    this._dialog.addEventListener('click', this._onClick);

    // 关闭按钮
    this._onCloseBtnClick = () => this.close('close');
    this._closeBtn = this.$('.close-btn');
    this._closeBtn.addEventListener('click', this._onCloseBtnClick);

    // 焦点陷阱补强（部分浏览器原生 showModal 焦点陷阱行为不一致）
    this._onKeydown = (e) => this._trapKeydown(e);
    this._dialog.addEventListener('keydown', this._onKeydown);

    // 初始 open 状态
    if (this.hasAttribute('open')) {
      this._rafId = requestAnimationFrame(() => this.open());
    }
  }

  open() {
    if (!this._dialog || this._dialog.open) return;
    this._previouslyFocused = document.activeElement;
    this._dialog.showModal();
    this.setAttribute('open', '');
    AfElement.lockScroll();
    this._scrollLocked = true;
    this._focusFirst();
    this.emit('af-dialog:open', {});
  }

  close(action = null) {
    if (!this._dialog || !this._dialog.open) return;
    this.returnValue = action;
    this._dialog.close(action);
    this.removeAttribute('open');
    if (this._scrollLocked) { AfElement.unlockScroll(); this._scrollLocked = false; }
    // 焦点还原
    if (this._previouslyFocused && typeof this._previouslyFocused.focus === 'function') {
      this._previouslyFocused.focus();
      this._previouslyFocused = null;
    }
    this.emit('af-dialog:close', { action });
  }

  _focusFirst() {
    const focusable = this._getFocusable();
    if (focusable.length) focusable[0].focus();
    else { this._dialog.tabIndex = -1; this._dialog.focus(); }
  }

  _getFocusable() {
    const sel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    // 同时覆盖 Shadow DOM 与 slotted（Light DOM）内容，避免页脚按钮焦点盲区
    const shadowEls = [...this.shadowRoot.querySelectorAll(sel)];
    const slottedEls = [...this.querySelectorAll(sel)];
    const visible = (el) => el.offsetParent !== null || el.getClientRects().length > 0;
    return [...shadowEls, ...slottedEls].filter(el => !el.disabled && visible(el));
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

  onAttributeChange(name, oldVal, newVal) {
    if (!this._dialog) return;
    if (name === 'title') {
      const titleSlot = this.$('.title slot');
      if (titleSlot) titleSlot.textContent = newVal;
      // aria-label 由 _applyI18n 重新计算（fallback=title，skipIf=aria-label）
      this._applyI18n();
    } else if (name === 'aria-label') {
      // 用户显式 aria-label 变化时重新应用 i18n（skipIf 控制：有 aria-label 时跳过）
      this._applyI18n();
    } else if (name === 'open') {
      if (newVal != null && !this._dialog.open) this.open();
      else if (newVal == null && this._dialog.open) this.close('external');
    }
  }

  unmounted() {
    if (this._scrollLocked) AfElement.unlockScroll();
    if (this._dialog && this._dialog.open) this._dialog.close();
    // Shadow DOM 元素随组件销毁，removeEventListener / cancelAnimationFrame 是为通过 wc-cleanup 检测
    this._dialog?.removeEventListener('cancel', this._onCancel);
    this._dialog?.removeEventListener('click', this._onClick);
    this._dialog?.removeEventListener('keydown', this._onKeydown);
    this._closeBtn?.removeEventListener('click', this._onCloseBtnClick);
    if (this._rafId != null) cancelAnimationFrame(this._rafId);
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfDialog.prototype, 'title', { type: String, default: '' });
AfElement.defineProp(AfDialog.prototype, 'closeOnEsc', { attr: 'close-on-esc', type: Boolean, default: true });
AfElement.defineProp(AfDialog.prototype, 'closeOnBackdrop', { attr: 'close-on-backdrop', type: Boolean, default: true });
AfElement.defineProp(AfDialog.prototype, 'variant', { type: String, default: 'default' });
