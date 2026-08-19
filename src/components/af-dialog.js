// af-mobile UI —— af-dialog：模态对话框
// Shadow DOM（useShadow=true），基于原生 <dialog> + showModal()
// 职责：模态遮罩 + 焦点陷阱（原生 + 兜底）+ Esc/backdrop 关闭 + 焦点还原
// v6.1：标题字重 700→600（中文大字 700 笔画糊化；CSS 模板内勿留注释——minify 不删、直接进产物）
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';
import { withI18n } from '../lib/with-i18n.js';

const CSS = `
  :host { display: contents; }
  dialog {
    border: none; border-radius: var(--r-l); background: var(--c-card);
    color: var(--c-text); padding: 0; max-width: 90vw;
    box-shadow: var(--shadow-lg);
  }
  dialog::backdrop { background: rgba(0,0,0,.4); backdrop-filter: blur(8px); }
  header { padding: var(--s-4); border-bottom: 1px solid var(--c-border); position: relative; }
  .title { margin: 0; font-size: var(--t-lg); font-weight: var(--fw-semibold); line-height: var(--lh-tight); }
  .close-btn {
    position: absolute; top: var(--s-2); right: var(--s-2);
    background: none; border: none; color: var(--c-muted);
    font-size: var(--t-lg); cursor: pointer; padding: var(--s-1); line-height: 1;
  }
  .body { padding: var(--s-4); }
  footer { display: flex; gap: var(--s-2); padding: var(--s-3) var(--s-4); border-top: 1px solid var(--c-border); }
  footer > ::slotted(*) { flex: 1; display: flex; gap: var(--s-2); width: 100%; }
  :host([variant="bottom"]) dialog {
    border-radius: var(--r-l) var(--r-l) 0 0;
    max-width: 100vw; width: 100%;
    margin: auto 0 0 0;
  }
  :host([variant="center"]) dialog { max-width: 70vw; }
`;

export class AfDialog extends withI18n(AfElement) {
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
  }

  get isOpen() { return this._dialog ? this._dialog.open : false; }

  // 完整 shadow 模板（DSD 声明式封装 + mounted 动态渲染共用同一结构）
  shadowHTML() {
    return `${AfElement.cssTag(CSS, 'af-dialog')}<dialog part="dialog" role="dialog"><header part="header"><h2 class="title"><slot name="title">${esc(this.title)}</slot></h2><button class="close-btn" part="close" type="button">×</button></header><div class="body" part="content"><slot name="body"></slot></div><footer part="footer"><slot name="footer"></slot></footer></dialog>`;
  }

  mounted() {
    // DSD 已在解析阶段挂载 shadow root 时不再覆盖，仅接管事件（hydrate）
    this.shadowRoot.innerHTML ||= this.shadowHTML();
    this._dialog = this.$('dialog');

    // Esc 关闭
    this._onCancel = (e) => {
      if (!this.closeOnEsc) { e.preventDefault(); return; }
      e.preventDefault();
      this.close('esc');
    };
    this._listen(this._dialog, 'cancel', this._onCancel);

    // backdrop 点击关闭：showModal 时 dialog 自身即 backdrop 区域
    this._onClick = (e) => {
      if (this.closeOnBackdrop && e.target === this._dialog) this.close('backdrop');
    };
    this._listen(this._dialog, 'click', this._onClick);

    // 关闭按钮
    this._onCloseBtnClick = () => this.close('close');
    this._closeBtn = this.$('.close-btn');
    this._listen(this._closeBtn, 'click', this._onCloseBtnClick);

    // 焦点陷阱补强（部分浏览器原生 showModal 焦点陷阱行为不一致）
    this._onKeydown = (e) => this._trapTab(e, this._dialog);
    this._listen(this._dialog, 'keydown', this._onKeydown);

    // 初始 open 状态
    if (this.hasAttribute('open')) {
      this._rafId = requestAnimationFrame(() => this.open());
    }
  }

  open() {
    if (!this._dialog || this._dialog.open) return;
    this.saveFocus();
    this._dialog.showModal();
    this.setAttribute('open', '');
    this._lockScroll();
    this._focusFirst(this._dialog);
    this.emit('af-dialog:open', {});
  }

  close(action = null) {
    if (!this._dialog || !this._dialog.open) return;
    this.returnValue = action;
    this._dialog.close(action);
    this.removeAttribute('open');
    this._unlockScroll();
    this.restoreFocus();
    this.emit('af-dialog:close', { action });
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
    this._unlockScroll();
    if (this._dialog && this._dialog.open) this._dialog.close();
    if (this._rafId != null) cancelAnimationFrame(this._rafId);
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfDialog.prototype, 'title', '');
AfElement.defineProp(AfDialog.prototype, 'closeOnEsc', true);
AfElement.defineProp(AfDialog.prototype, 'closeOnBackdrop', true);
AfElement.defineProp(AfDialog.prototype, 'variant', 'default');
