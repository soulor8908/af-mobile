// af-mobile UI —— af-notice-bar：公告通知栏
// Light DOM，复用 L2 .notice 配方；text 快捷文本 + icon/closeable/wrapable（T0.5 Vant 对齐）
// scroll 模式滚动时长按 文本宽/60px·s 动态计算（Vant speed=60 默认值），经 --notice-dur 派发
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';

export class AfNoticeBar extends AfElement {
  static useShadow = false;

  mounted() { this._render(); }

  _render() {
    const t = esc(this.text);
    const ico = this.icon ? `<span class="notice-ico">${esc(this.icon)}</span>` : '';
    const close = this.closeable ? `<button class="notice-close" data-role="close" type="button" aria-label="关闭">×</button>` : '';
    // 结构须匹配 recipes.css：.notice > (.notice-ico)? + .notice-tx > (.notice-scr)? + (.notice-close)?
    // scroll 模式嵌套 .notice-scr（marquee），否则 .notice-tx 直接承载文本（ellipsis 截断）
    // wrapable 多行时不滚动
    const body = this.scroll && !this.wrapable ? `<span class="notice-scr">${t}</span>` : t;
    const wrap = this.wrapable ? ' notice-wrap' : '';
    this.innerHTML = `<div class="notice${wrap}" role="status">${ico}<span class="notice-tx">${body}</span>${close}</div>`;
    if (this.scroll && !this.wrapable) this._fitDuration();
    if (this.closeable) {
      this._listen(this.$('[data-role="close"]'), 'click', () => {
        this.emit('af-notice-bar:close', {});
        this.hidden = true;
      });
    }
  }

  // Vant 对齐：匀速 60px/s，长文本不飞快、短文本不拖沓；时长经变量派发（禁内联样式值）
  _fitDuration() {
    const scr = this.$('.notice-scr');
    const tx = this.$('.notice-tx');
    if (!scr || !tx) return;
    const dist = scr.scrollWidth - tx.clientWidth;
    if (dist > 0) this.$('.notice').style.setProperty('--notice-dur', Math.max(5, Math.round(dist / 60)) + 's');
  }

  // 属性变化整体重渲染（幂等）
  onAttributeChange() { this._render(); }
}

AfElement.defineProp(AfNoticeBar.prototype, 'text', '');
AfElement.defineProp(AfNoticeBar.prototype, 'scroll', false);
AfElement.defineProp(AfNoticeBar.prototype, 'icon', '');
AfElement.defineProp(AfNoticeBar.prototype, 'closeable', false);
AfElement.defineProp(AfNoticeBar.prototype, 'wrapable', false);
