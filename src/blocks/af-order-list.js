// af-mobile UI —— L3.5 Block：af-order-list（订单列表）
// Light DOM，五态（loading/error/empty/success）+ a11y + 键盘导航（骨架复用 list-block.js）
// variant: simple / detailed（detailed 附带商品缩略图行）
// item: { no, time, status, tone(ok/warn/danger), amount, actionText, thumbs }
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';
import { withI18n } from '../lib/with-i18n.js';
import { addMessages } from '../lib/i18n.js';
import { withBlockList } from './list-block.js';

// ol.* 字典随本模块注册（不占主库核心运行时体积）
addMessages('zh-CN', {
  'ol.al': '订单列表',
  'ol.em': '暂无订单',
  'ol.ld': '加载中…',
  'ol.er': '加载失败',
  'ol.rt': '重试',
  'ol.bt': '查看详情',
});
addMessages('en-US', {
  'ol.al': 'Orders',
  'ol.em': 'No orders',
  'ol.ld': 'Loading...',
  'ol.er': 'Load failed',
  'ol.rt': 'Retry',
  'ol.bt': 'Details',
});

const TONES = ['ok', 'warn', 'danger'];

export class AfOrderList extends withBlockList(withI18n(AfElement), 'af-order-list') {
  static i18n = {
    '@': ['aria-label', 'ol.al'],
    '[data-role="empty-text"]': ['', 'ol.em'],
    '[data-role="loading-text"]': ['', 'ol.ld'],
    '[data-role="error-text"]': ['', 'ol.er'],
    '[data-role="retry-btn"]': ['', 'ol.rt'],
    '[data-role="detail-btn"]': ['', 'ol.bt'],
  };

  _renderItem(item, i) {
    const dis = item.disabled ? ' aria-disabled="true"' : '';
    const tone = TONES.includes(item.tone) ? ` tag-${esc(item.tone)}` : '';
    const status = item.status ? `<span class="tag${tone}">${esc(item.status)}</span>` : '';
    const no = item.no ? `<div>${esc(item.no)}</div>` : '';
    const time = item.time ? `<div class="caption">${esc(item.time)}</div>` : '';
    const amount = item.amount != null ? `<span class="price">${esc(item.amount)}</span>` : '';
    const btn = `<button class="btn btn-plain" type="button" data-role="detail-btn"></button>`;
    if (this.variant === 'detailed' && item.thumbs?.length) {
      const thumbs = item.thumbs.map((t) => `<img class="thumb" src="${esc(t)}" alt="" loading="lazy">`).join('');
      return `<div class="list-item" role="listitem" data-index="${i}" tabindex="-1"${dis}><div class="body">${no}${time}<div class="f g-2">${thumbs}</div></div>${status}${amount}${btn}</div>`;
    }
    return `<div class="list-item" role="listitem" data-index="${i}" tabindex="-1"${dis}><div class="body">${no}${time}</div>${status}${amount}${btn}</div>`;
  }

  onAttributeChange(name) {
    if (!this._mounted) return;
    if (['title', 'variant', 'items', 'loading'].includes(name)) {
      this._render();
      this._applyI18n();
    }
  }
}

// variant: simple / detailed
AfElement.defineProp(AfOrderList.prototype, 'variant', 'simple');
AfElement.defineProp(AfOrderList.prototype, 'title', '');
AfElement.defineProp(AfOrderList.prototype, 'items', []);
AfElement.defineProp(AfOrderList.prototype, 'loading', false);
