// AIFlow UI —— af-toast：轻提示
// Light DOM，模块级单例（新替旧，不排队），自动消失 + aria-live
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';

let instance = null;

export class AfToast extends AfElement {
  static useShadow = false;

  constructor() {
    super();
    this._message = '';
    this._timer = null;
  }

  get message() { return this._message; }

  show(message, duration = this.duration || 2000) {
    if (instance && instance !== this) instance.dismiss();
    instance = this;
    this._message = message;
    this.innerHTML = `<div class="toast" role="status" aria-live="polite">${esc(message)}</div>`;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.dismiss(), duration);
  }

  dismiss() {
    if (!this._message) return;
    clearTimeout(this._timer);
    this.innerHTML = '';
    const msg = this._message;
    this._message = '';
    if (instance === this) instance = null;
    this.emit('af-toast:dismiss', { message: msg });
  }

  unmounted() {
    clearTimeout(this._timer);
    if (instance === this) instance = null;
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfToast.prototype, 'duration', { type: Number, default: 2000 });
