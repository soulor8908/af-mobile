// AIFlow UI —— L3.5 Block：af-setting-group（设置分组）
// Light DOM，五态（loading/error/empty/success）+ a11y + 键盘导航
// variant: default / with-switch / with-value
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';

const ARROW = '›';
const SKEL_ROWS = 4;

export class AfSettingGroup extends AfElement {
  static useShadow = false;
  static i18n = {
    '@': ['aria-label', 'sg.al'],
    '[data-role="empty-text"]': ['', 'sg.em'],
    '[data-role="loading-text"]': ['', 'sg.ld'],
    '[data-role="error-text"]': ['', 'sg.er'],
    '[data-role="retry-btn"]': ['', 'sg.rt'],
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

  // 公共 section + title wrapper
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
        this.emit('af-setting-group:retry', {});
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
    const icon = item.icon ? `<span class="caption" aria-hidden="true">${esc(item.icon)}</span>` : '';
    const label = `<span class="body">${esc(item.label ?? '')}</span>`;
    let tail = '';
    if (this.variant === 'with-switch') {
      const c = item.checked ? ' checked' : '';
      const d = item.disabled ? ' disabled' : '';
      tail = `<af-switch${c}${d} data-index="${i}" aria-label="${esc(item.label ?? '')}"></af-switch>`;
    } else if (this.variant === 'with-value' || item.value != null) {
      tail = `<span class="caption t-right">${esc(item.value ?? '')}</span><span class="caption" aria-hidden="true">${ARROW}</span>`;
    } else if (item.action === 'arrow') {
      tail = `<span class="caption" aria-hidden="true">${ARROW}</span>`;
    }
    return `<div class="list-item" role="listitem" data-index="${i}" tabindex="-1"${dis}>${icon}${label}${tail}</div>`;
  }

  _bindItemClicks() {
    this._onClick = (e) => {
      const row = e.target.closest('.list-item[data-index]');
      if (!row || row.hasAttribute('aria-disabled')) return;
      const idx = Number(row.dataset.index);
      this.emit('af-setting-group:itemclick', { index: idx, item: this.items[idx] });
    };
    this._listEl.addEventListener('click', this._onClick);
    if (this.variant === 'with-switch') {
      this._switchHandlers = [];
      this.$$('af-switch').forEach((sw) => {
        const idx = Number(sw.dataset.index);
        const h = (e) => {
          e.stopPropagation();
          this.emit('af-setting-group:change', { index: idx, checked: e.detail.checked, item: this.items[idx] });
        };
        sw.addEventListener('af-switch:change', h);
        this._switchHandlers.push([sw, h]);
      });
    }
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
          this.emit('af-setting-group:itemclick', { index: this._activeIndex, item: this.items[this._activeIndex] });
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
    if (name === 'variant' || name === 'items' || name === 'title' || name === 'loading') {
      this._render();
      this._applyI18n();
    }
  }

  unmounted() {
    this.removeEventListener('keydown', this._onKeydown);
    this._listEl?.removeEventListener('click', this._onClick);
    this._switchHandlers?.forEach(([sw, h]) => sw.removeEventListener('af-switch:change', h));
  }
}

// variant: default / with-switch / with-value
AfElement.defineProp(AfSettingGroup.prototype, 'variant', { type: String, default: 'default' });
AfElement.defineProp(AfSettingGroup.prototype, 'title', { type: String, default: '' });
AfElement.defineProp(AfSettingGroup.prototype, 'items', { type: Array, default: [] });
AfElement.defineProp(AfSettingGroup.prototype, 'loading', { type: Boolean, default: false });
