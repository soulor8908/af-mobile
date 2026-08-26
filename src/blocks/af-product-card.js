// af-mobile UI —— L3.5 Block：af-product-card（商品卡片）
// Light DOM，五态（loading/error/empty/success）+ a11y + 键盘导航（骨架复用 list-block.js）
// variant: default / grid
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';
import { withI18n } from '../lib/with-i18n.js';
import { addMessages } from '../lib/i18n.js';
import { withBlockList, ARROW } from './list-block.js';

// pc.* 字典随本模块注册（同 chat/i18n.js 先例：不占主库核心运行时体积）
addMessages('zh-CN', {
  'pc.al': '商品卡片',
  'pc.em': '暂无商品',
  'pc.ld': '加载中…',
  'pc.er': '加载失败',
  'pc.rt': '重试',
});
addMessages('en-US', {
  'pc.al': 'Product card',
  'pc.em': 'No products',
  'pc.ld': 'Loading...',
  'pc.er': 'Load failed',
  'pc.rt': 'Retry',
});

export class AfProductCard extends withBlockList(withI18n(AfElement), 'af-product-card') {
  static i18n = {
    '@': ['aria-label', 'pc.al'],
    '[data-role="empty-text"]': ['', 'pc.em'],
    '[data-role="loading-text"]': ['', 'pc.ld'],
    '[data-role="error-text"]': ['', 'pc.er'],
    '[data-role="retry-btn"]': ['', 'pc.rt'],
  };

  _renderItem(item, i) {
    const dis = item.disabled ? ' aria-disabled="true"' : '';
    const label = `<span class="body">${esc(item.label ?? '')}</span>`;
    const tail = item.action === 'arrow' ? `<span class="caption" aria-hidden="true">${ARROW}</span>` : '';
    return `<div class="list-item" role="listitem" data-index="${i}" tabindex="-1"${dis}>${label}${tail}</div>`;
  }

  onAttributeChange(name) {
    if (!this._mounted) return;
    if (['title', 'price', 'items', 'loading'].includes(name)) {
      this._render();
      this._applyI18n();
    }
  }
}

AfElement.defineProp(AfProductCard.prototype, 'title', '');
AfElement.defineProp(AfProductCard.prototype, 'price', '');
AfElement.defineProp(AfProductCard.prototype, 'items', []);
AfElement.defineProp(AfProductCard.prototype, 'loading', false);
