// AIFlow UI —— af-toast：轻提示
// Light DOM，模块级单例（新替旧，不排队），自动消失 + aria-live + 退场动画
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';

let instance = null;
const EXIT_ANIM_MS = 200;

export class AfToast extends AfElement {
  static useShadow = false;

  constructor() {
    super();
    this._message = '';
    this._timer = null;
    this._exiting = false;
  }

  get message() { return this._message; }

  show(message, duration = this.duration || 2000) {
    if (instance && instance !== this) instance.dismiss();
    instance = this;
    this._exiting = false;
    this._message = message;
    this.innerHTML = `<div class="toast" role="status" aria-live="polite">${esc(message)}</div>`;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.dismiss(), duration);
  }

  dismiss() {
    if (!this._message || this._exiting) return;
    this._exiting = true;
    clearTimeout(this._timer);
    const msg = this._message;
    // 退场动画：opacity 淡出后再清空 innerHTML
    const toastEl = this.$('.toast');
    if (toastEl) {
      toastEl.style.setProperty('transition', `opacity ${EXIT_ANIM_MS}ms var(--ease-out)`);
      toastEl.style.setProperty('opacity', '0');
      setTimeout(() => {
        this.innerHTML = '';
        this._message = '';
        this._exiting = false;
        if (instance === this) instance = null;
        this.emit('af-toast:dismiss', { message: msg });
      }, EXIT_ANIM_MS);
    } else {
      this.innerHTML = '';
      this._message = '';
      this._exiting = false;
      if (instance === this) instance = null;
      this.emit('af-toast:dismiss', { message: msg });
    }
  }

  unmounted() {
    clearTimeout(this._timer);
    if (instance === this) instance = null;
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfToast.prototype, 'duration', { type: Number, default: 2000 });
