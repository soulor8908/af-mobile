// AIFlow UI —— af-skeleton-page：整页骨架屏
// Light DOM，4 种预设布局变体（list/detail/profile/card），复用 L2 .skeleton .skeleton-line .skeleton-block
import { AfElement } from '../lib/af-element.js';

const TEMPLATES = {
  list: '<div class="skeleton-line"></div>'.repeat(6),
  detail: '<div class="skeleton skeleton-block" style="height:200px"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line" style="width:60%"></div>',
  profile: '<div class="skeleton skeleton-block" style="width:64px;height:64px;border-radius:50%"></div><div class="skeleton skeleton-line" style="width:40%"></div><div class="skeleton skeleton-line" style="width:80%"></div>',
  card: '<div class="skeleton skeleton-block" style="height:120px"></div>'.repeat(2) + '<div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line" style="width:60%"></div>',
};

export class AfSkeletonPage extends AfElement {
  static useShadow = false;

  mounted() { this._render(); }

  _render() {
    const tpl = TEMPLATES[this.variant] || TEMPLATES.list;
    this.innerHTML = `<div class="skeleton-page skeleton-page-${this.variant}" role="status" aria-live="polite" aria-label="加载中">${tpl}</div>`;
  }

  onAttributeChange(name) {
    if (name === 'variant') this._render();
  }
}

AfElement.defineProp(AfSkeletonPage.prototype, 'variant', { type: String, default: 'list' });
