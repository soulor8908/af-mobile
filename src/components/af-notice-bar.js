// af-mobile UI —— af-notice-bar：公告通知栏
// Light DOM，复用 L2 .notice 配方（warn 底色）；text 快捷文本，scroll 横向滚动
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';

export class AfNoticeBar extends AfElement {
  static useShadow = false;

  mounted() { this._render(); }

  _render() {
    const t = esc(this.text);
    // scroll=true 用 .notice-scroll（marquee 滚动），否则 .notice-text（ellipsis 截断）
    this.innerHTML = `<div class="notice" role="status"><span class="notice-${this.scroll ? 'scroll' : 'text'}">${t}</span></div>`;
  }

  // 仅 text/scroll 两个属性，任一变化整体重渲染（幂等）
  onAttributeChange() { this._render(); }
}

AfElement.defineProp(AfNoticeBar.prototype, 'text', '');
AfElement.defineProp(AfNoticeBar.prototype, 'scroll', false);
