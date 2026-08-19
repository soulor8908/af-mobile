// af-mobile UI —— af-skeleton-page：整页骨架屏
// Light DOM，4 种预设布局变体（list/detail/profile/card），复用 L2 .sk .sk-ln .sk-blk
import { AfElement } from '../lib/af-element.js';
import { withI18n } from '../lib/with-i18n.js';

const TEMPLATES = {
  list: '<div class="sk sk-ln"></div>'.repeat(6),
  detail: '<div class="sk sk-blk sk-blk-h-md"></div><div class="sk sk-ln"></div><div class="sk sk-ln"></div><div class="sk sk-ln sk-w-60"></div>',
  profile: '<div class="sk sk-blk sk-cir"></div><div class="sk sk-ln sk-w-40"></div><div class="sk sk-ln sk-w-80"></div>',
  card: '<div class="sk sk-blk sk-blk-h-sm"></div>'.repeat(2) + '<div class="sk sk-ln"></div><div class="sk sk-ln sk-w-60"></div>',
  article: '<div class="sk sk-ln sk-w-80"></div><div class="sk sk-blk sk-blk-h-md"></div>'.repeat(2) + '<div class="sk sk-ln"></div>',
};

export class AfSkeletonPage extends withI18n(AfElement) {
  static useShadow = false;
  // i18n 映射表：骨架屏 aria-label 用字典
  static i18n = {
    '.sk-pg': ['aria-label', 'sk.al'],
  };

  mounted() { this._render(); }

  _render() {
    const tpl = TEMPLATES[this.variant] || TEMPLATES.list;
    this.innerHTML = `<div class="sk-pg sk-pg-${this.variant}" role="status" aria-live="polite">${tpl}</div>`;
  }

  onAttributeChange(name) {
    if (name === 'variant') {
      this._render();
      // 重建 DOM 后重新应用 aria-label
      this._applyI18n();
    }
  }
}

AfElement.defineProp(AfSkeletonPage.prototype, 'variant', 'list');
