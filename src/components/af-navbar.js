// AIFlow UI —— af-navbar：导航栏
// Light DOM，复用 L2 .navbar 配方；返回按钮 + safe-area-top + 标题 slot + 左右插槽
// 职责：返回按钮派发事件 + sticky 定位 + 顶部安全区适配
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';

export class AfNavbar extends AfElement {
  static useShadow = false;
  // i18n 映射表：返回按钮 aria-label 优先用 backAriaLabel，否则字典兜底
  static i18n = {
    '[data-role="back"]': ['aria-label', 'nb.bk', 'backAriaLabel'],
  };

  mounted() {
    this._render();
    this._bindBack();
  }

  _render() {
    const back = this.showBack
      ? `<button class="btn btn-ghost btn-sm" data-role="back" type="button">${esc(this.backText)}</button>`
      : '';
    const title = this.title ? `<span class="title" data-role="title">${esc(this.title)}</span>` : '';
    // 保存 slotted 子节点引用：innerHTML= 会销毁现有子节点，需在重置前抓取再搬入
    const slottedLeft = this.$$('[slot="left"]');
    const slottedRight = this.$$('[slot="right"]');
    this.innerHTML = `
      ${back}
      <div data-role="left"></div>
      ${title}
      <div data-role="right"></div>
    `;
    // 把 slotted 子节点搬入对应容器（保留外部引用与事件）
    const left = this.$('[data-role="left"]');
    const right = this.$('[data-role="right"]');
    for (const node of slottedLeft) left.appendChild(node);
    for (const node of slottedRight) right.appendChild(node);
  }

  _bindBack() {
    const btn = this.$('[data-role="back"]');
    if (!btn) return;
    this._onBack = () => this.emit('af-navbar:back', {});
    btn.addEventListener('click', this._onBack);
  }

  onAttributeChange(name, oldVal, newVal) {
    if (!this.$root) return;
    if (name === 'show-back' || name === 'back-text' || name === 'back-aria-label') {
      this._render();
      this._bindBack();
      // 重建 DOM 后重新应用 aria-label（backAriaLabel 变化也走 _applyI18n）
      this._applyI18n();
    } else if (name === 'title') {
      const titleEl = this.$('[data-role="title"]');
      if (titleEl) titleEl.textContent = newVal;
      else if (newVal) {
        this._render();
        this._applyI18n();
      }
    }
  }

  unmounted() {
    this.$('[data-role="back"]')?.removeEventListener('click', this._onBack);
  }
}

AfElement.defineProp(AfNavbar.prototype, 'title', { type: String, default: '' });
AfElement.defineProp(AfNavbar.prototype, 'showBack', { attr: 'show-back', type: Boolean, default: false });
AfElement.defineProp(AfNavbar.prototype, 'backText', { attr: 'back-text', type: String, default: '←' });
AfElement.defineProp(AfNavbar.prototype, 'backAriaLabel', { attr: 'back-aria-label', type: String, default: null });
