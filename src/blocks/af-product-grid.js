// af-mobile UI —— L3.5 Block：af-product-grid（商品网格）
// Light DOM，五态（loading/error/empty/success）+ a11y + 键盘导航（骨架复用 list-block.js）
// variant: one-column / two-column
// item: { img, title, subtitle, price, priceDel, action, disabled }
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';
import { withI18n } from '../lib/with-i18n.js';
import { addMessages } from '../lib/i18n.js';
import { withBlockList } from './list-block.js';

// pg.* 字典随本模块注册（不占主库核心运行时体积）
addMessages('zh-CN', {
  'pg.al': '商品列表',
  'pg.em': '暂无商品',
  'pg.ld': '加载中…',
  'pg.er': '加载失败',
  'pg.rt': '重试',
  'pg.add': '加入购物车',
});
addMessages('en-US', {
  'pg.al': 'Products',
  'pg.em': 'No products',
  'pg.ld': 'Loading...',
  'pg.er': 'Load failed',
  'pg.rt': 'Retry',
  'pg.add': 'Add to cart',
});

export class AfProductGrid extends withBlockList(withI18n(AfElement), 'af-product-grid') {
  static i18n = {
    '@': ['aria-label', 'pg.al'],
    '[data-role="empty-text"]': ['', 'pg.em'],
    '[data-role="loading-text"]': ['', 'pg.ld'],
    '[data-role="error-text"]': ['', 'pg.er'],
    '[data-role="retry-btn"]': ['', 'pg.rt'],
    '[data-role="add-btn"]': ['', 'pg.add'],
  };

  // 网格视觉语言：外层 section 不套 card（卡片自身即视觉单元），容器走 grid 布局
  _wrap(body, live = '') {
    const al = this.title ? ` aria-label="${esc(this.title)}"` : '';
    const head = this.title ? `<div class="title">${esc(this.title)}</div>` : '';
    const liveAttr = live ? ` ${live}` : '';
    return `<section role="group"${al}${liveAttr}>${head}${body}</section>`;
  }

  _listClass() { return 'grid g-2'; }

  _itemSel() { return '.card[data-index]'; }

  _renderItem(item, i) {
    const dis = item.disabled ? ' aria-disabled="true"' : '';
    const img = item.img
      ? `<img class="thumb" src="${esc(item.img)}" alt="${esc(item.title ?? '')}" loading="lazy">`
      : '';
    const sub = item.subtitle ? `<div class="subtitle">${esc(item.subtitle)}</div>` : '';
    const del = item.priceDel ? `<span class="price-del">${esc(item.priceDel)}</span>` : '';
    const price = item.price ? `<div class="f g-2"><span class="price">${esc(item.price)}</span>${del}</div>` : '';
    if (this.variant === 'two-column') {
      return `<div class="card" role="listitem" data-index="${i}" tabindex="-1"${dis}>${img}<div class="title">${esc(item.title ?? '')}</div>${price}</div>`;
    }
    // one-column：图左文右 + 底部操作（.form-row-h 横排承载价格与按钮）
    return `<div class="card" role="listitem" data-index="${i}" tabindex="-1"${dis}>
  <div class="f g-2">${img}<div class="body"><div class="title">${esc(item.title ?? '')}</div>${sub}${price}</div></div>
  <div class="actions"><button class="btn" type="button" data-role="add-btn"></button></div>
</div>`;
  }

  onAttributeChange(name) {
    if (!this._mounted) return;
    if (['title', 'variant', 'items', 'loading'].includes(name)) {
      this._render();
      this._applyI18n();
    }
  }
}

// variant: one-column / two-column
AfElement.defineProp(AfProductGrid.prototype, 'variant', 'one-column');
AfElement.defineProp(AfProductGrid.prototype, 'title', '');
AfElement.defineProp(AfProductGrid.prototype, 'items', []);
AfElement.defineProp(AfProductGrid.prototype, 'loading', false);
