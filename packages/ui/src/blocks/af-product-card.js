// AIFlow UI —— L3.5 Block：af-product-card（商品卡片）
// Light DOM，五态（loading/error/empty/success）+ a11y + 键盘导航
// variant: default / grid
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';
import { withI18n } from '../lib/with-i18n.js';

const ARROW = '›';
const SKEL_ROWS = 4;

export class AfProductCard extends withI18n(AfElement) {
  static useShadow = false;
  static i18nKeys = ['pc.al', 'pc.em', 'pc.ld', 'pc.er', 'pc.rt'];
  static i18n = {
    '@': ['aria-label', 'pc.al'],
    '[data-role="empty-text"]': ['', 'pc.em'],
    '[data-role="loading-text"]': ['', 'pc.ld'],
    '[data-role="error-text"]': ['', 'pc.er'],
    '[data-role="retry-btn"]': ['', 'pc.rt'],
  };

  constructor() {
    super();
    this._activeIndex = -1;
    this._error = null;
  }

  mounted() {
    this._render();
    this._bindKeydown();
  }

  _wrap(body, live = '') {
    const al = this.title ? ` aria-label="${esc(this.title)}"` : '';
    const head = this.title ? `<div class="list-item"><div class="caption">${esc(this.title)}</div></div>` : '';
    const liveAttr = live ? ` ${live}` : '';
    return `<section class="card" role="group"${al}${liveAttr}>${head}${body}</section>`;
  }

  _render() {
    if (this.loading) {
      this.setAttribute('aria-busy', 'true');
      const rows = '<div class="list-item"><div class="skeleton skeleton-line"></div></div>'.repeat(SKEL_ROWS);
      this.innerHTML = this._wrap(`<div class="list" data-role="loading" aria-live="polite">${rows}<div class="caption t-center p-2" data-role="loading-text"></div></div>`);
      return;
    }
    this.removeAttribute('aria-busy');
    if (this._error) {
      this.innerHTML = this._wrap(`<div class="empty" data-role="error" aria-live="assertive"><div class="body" data-role="error-text"></div><button class="btn btn-ghost btn-sm" data-role="retry-btn" type="button"></button></div>`);
      this.$('[data-role="retry-btn"]').addEventListener('click', () => {
        this._error = null;
        this.emit('af-product-card:retry', {});
        this._render();
        this._applyI18n();
      });
      return;
    }
    if (!this.items?.length) {
      this.innerHTML = this._wrap(`<div class="empty" data-role="empty"><div class="body" data-role="empty-text"></div></div>`);
      return;
    }
    const rows = this.items.map((it, i) => this._renderItem(it, i)).join('');
    this.innerHTML = this._wrap(`<div class="list" role="list" tabindex="0" data-role="list">${rows}</div>`, 'aria-live="polite"');
    this._listEl = this.$('[data-role="list"]');
    this._itemEls = this.$$('.list-item[data-index]');
    this._bindItemClicks();
  }

  _renderItem(item, i) {
    const dis = item.disabled ? ' aria-disabled="true"' : '';
    const label = `<span class="body">${esc(item.label ?? '')}</span>`;
    const tail = item.action === 'arrow' ? `<span class="caption" aria-hidden="true">${ARROW}</span>` : '';
    return `<div class="list-item" role="listitem" data-index="${i}" tabindex="-1"${dis}>${label}${tail}</div>`;
  }

  _bindItemClicks() {
    this._onClick = (e) => {
      const row = e.target.closest('.list-item[data-index]');
      if (!row || row.hasAttribute('aria-disabled')) return;
      const idx = Number(row.dataset.index);
      this.emit('af-product-card:itemclick', { index: idx, item: this.items[idx] });
    };
    this._listEl.addEventListener('click', this._onClick);
  }

  _bindKeydown() {
    this._onKeydown = (e) => {
      if (!this._listEl || !this._itemEls?.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const dir = e.key === 'ArrowDown' ? 1 : -1;
        this._activeIndex = (this._activeIndex + dir + this._itemEls.length) % this._itemEls.length;
        this._itemEls[this._activeIndex]?.focus();
      } else if (e.key === 'Enter' && this._activeIndex >= 0) {
        e.preventDefault();
        const row = this._itemEls[this._activeIndex];
        if (!row.hasAttribute('aria-disabled')) {
          this.emit('af-product-card:itemclick', { index: this._activeIndex, item: this.items[this._activeIndex] });
        }
      }
    };
    this.addEventListener('keydown', this._onKeydown);
  }

  setError(err) {
    this._error = err;
    this._render();
    this._applyI18n();
  }

  onAttributeChange(name) {
    if (!this._mounted) return;
    if (['title', 'price', 'items', 'loading'].includes(name)) {
      this._render();
      this._applyI18n();
    }
  }

  unmounted() {
    this.removeEventListener('keydown', this._onKeydown);
    this._listEl?.removeEventListener('click', this._onClick);
  }
}

AfElement.defineProp(AfProductCard.prototype, 'title', { type: String, default: '' });
AfElement.defineProp(AfProductCard.prototype, 'price', { type: String, default: '' });
AfElement.defineProp(AfProductCard.prototype, 'items', { type: Array, default: [] });
AfElement.defineProp(AfProductCard.prototype, 'loading', { type: Boolean, default: false });
