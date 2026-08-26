// af-mobile UI —— L3.5 Block 共享基座：列表型 Block 五态骨架
// 收敛 af-product-card / af-setting-group 逐字重复的 loading/error/empty/success
// 渲染 + 键盘导航 + 事件绑定（P1-2）。子类只需提供 static i18n、_renderItem、
// onAttributeChange、defineProp；需扩展点击绑定时覆写 _bindItemClicks 并调 super。
import { escapeHtml as esc } from '../lib/af-element.js';

const ARROW = '›';
const SKEL_ROWS = 4;

export { ARROW };

// 工厂：Base 须为 withI18n(AfElement)（依赖 _applyI18n）；
// tag 与组件标签一致，用于派生事件名 `${tag}:itemclick` / `${tag}:retry`
export function withBlockList(Base, tag) {
  return class extends Base {
    static useShadow = false;

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

    // 子类可覆写的渲染钩子：列表容器 class（默认 .list 边框列表；网格类 Block 可改 'grid g-2'）
    _listClass() { return 'list'; }

    // 子类可覆写的渲染钩子：条目选择器（键盘导航/焦点管理用，须与 _renderItem 根元素匹配）
    _itemSel() { return '.list-item[data-index]'; }

    _render() {
      if (this.loading) {
        this.setAttribute('aria-busy', 'true');
        const rows = '<div class="list-item"><div class="sk sk-ln"></div></div>'.repeat(SKEL_ROWS);
        this.innerHTML = this._wrap(`<div class="list" data-role="loading" aria-live="polite">${rows}<div class="caption t-center p-2" data-role="loading-text"></div></div>`);
        return;
      }
      this.removeAttribute('aria-busy');
      if (this._error) {
        this.innerHTML = this._wrap(`<div class="empty" data-role="error" aria-live="assertive"><div class="body" data-role="error-text"></div><button class="btn btn-ghost btn-sm" data-role="retry-btn" type="button"></button></div>`);
        this._listen(this.$('[data-role="retry-btn"]'), 'click', () => {
          this._error = null;
          this.emit(`${tag}:retry`, {});
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
      this.innerHTML = this._wrap(`<div class="${this._listClass()}" role="list" tabindex="0" data-role="list">${rows}</div>`, 'aria-live="polite"');
      this._listEl = this.$('[data-role="list"]');
      this._itemEls = this.$$(this._itemSel());
      this._bindItemClicks();
    }

    _bindItemClicks() {
      this._onClick = (e) => {
        const row = e.target.closest(this._itemSel());
        if (!row || row.hasAttribute('aria-disabled')) return;
        const idx = Number(row.dataset.index);
        this.emit(`${tag}:itemclick`, { index: idx, item: this.items[idx] });
      };
      this._listen(this._listEl, 'click', this._onClick);
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
            this.emit(`${tag}:itemclick`, { index: this._activeIndex, item: this.items[this._activeIndex] });
          }
        }
      };
      this._listen(this, 'keydown', this._onKeydown);
    }

    setError(err) {
      this._error = err;
      this._render();
      this._applyI18n();
    }
  };
}
