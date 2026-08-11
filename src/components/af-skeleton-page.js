// AIFlow UI —— af-skeleton-page：整页骨架屏
// Light DOM，4 种预设布局变体（list/detail/profile/card），复用 L2 .skeleton .skeleton-line .skeleton-block
import { AfElement } from '../lib/af-element.js';

const TEMPLATES = {
  list: '<div class="skeleton-line"></div>'.repeat(6),
  detail: '<div class="skeleton skeleton-block skeleton-block-h-md"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line skeleton-w-60"></div>',
  profile: '<div class="skeleton skeleton-block skeleton-circle"></div><div class="skeleton skeleton-line skeleton-w-40"></div><div class="skeleton skeleton-line skeleton-w-80"></div>',
  card: '<div class="skeleton skeleton-block skeleton-block-h-sm"></div>'.repeat(2) + '<div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line skeleton-w-60"></div>',
};

export class AfSkeletonPage extends AfElement {
  static useShadow = false;
  // i18n 映射表：骨架屏 aria-label 用字典
  static i18n = {
    '.skeleton-page': ['aria-label', 'sk.al'],
  };

  mounted() { this._render(); }

  _render() {
    const tpl = TEMPLATES[this.variant] || TEMPLATES.list;
    this.innerHTML = `<div class="skeleton-page skeleton-page-${this.variant}" role="status" aria-live="polite">${tpl}</div>`;
  }

  onAttributeChange(name) {
    if (name === 'variant') {
      this._render();
      // 重建 DOM 后重新应用 aria-label
      this._applyI18n();
    }
  }
}

AfElement.defineProp(AfSkeletonPage.prototype, 'variant', { type: String, default: 'list' });
