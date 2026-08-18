// af-mobile UI —— af-progress：进度条
// Light DOM，复用 L2 .progress 原生 <progress> 配方；value/max/color（brand/success/danger）
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';

export class AfProgress extends AfElement {
  static useShadow = false;

  mounted() {
    this._render();
  }

  _render() {
    const variant = this.color && this.color !== 'brand' ? ` progress-${esc(this.color)}` : '';
    this.innerHTML = `<progress class="progress${variant}" data-role="progress" max="${this.max}" value="${this.value}"></progress>`;
  }

  onAttributeChange() {
    this._render();
  }
}

AfElement.defineProp(AfProgress.prototype, 'value', 0);
AfElement.defineProp(AfProgress.prototype, 'max', 100);
AfElement.defineProp(AfProgress.prototype, 'color', 'brand');