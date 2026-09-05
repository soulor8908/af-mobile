// af-mobile UI —— af-tabbar：底部标签栏
// Light DOM，复用 L2 .tabbar/.tab-item 配方；active 状态管理 + badge 支持 + 路由联动
// 职责：active 索引管理 + 选中态 ARIA + 数值徽标 + 键盘导航（Home/End/Arrow）
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';
import { withI18n } from '../lib/with-i18n.js';

export class AfTabbar extends withI18n(AfElement) {
  static useShadow = false;
  // i18n 映射表：tabbar aria-label 优先用 ariaLabel 属性，否则字典兜底
  static i18n = {
    '.tabbar': ['aria-label', 'bb.al', 'ariaLabel'],
  };

  mounted() {
    this._render();
    this._bindClick();
    this._bindKeydown();
    this.setActive(this.activeIndex, true);
  }

  _render() {
    this.innerHTML = `<div class="tabbar" role="tablist">${this._renderItems()}</div>`;
    this._tabbar = this.$('.tabbar');
    if (this.fixed) this._tabbar.classList.add('tabbar-fixed');
  }

  _renderItems() {
    return this.tabs.map((tab, i) => {
      const selected = i === this.activeIndex ? 'true' : 'false';
      const tabindex = i === this.activeIndex ? '0' : '-1';
      // T1.4（Vant 对齐）：badge 挂在 icon 容器内 absolute 右上角（van-badge--fixed 同款），
      // 不再作为 .tab-item（flex column）的流内子项——此前 badge 从无到有会把 label 下推一整行
      const badge = tab.badge != null && tab.badge !== '' ? `<span class="badge">${esc(tab.badge)}</span>` : '';
      const icon = tab.icon || badge ? `<span data-role="icon">${esc(tab.icon || '')}${badge}</span>` : '';
      const label = tab.label ? `<span data-role="label">${esc(tab.label)}</span>` : '';
      return `<button class="tab-item" role="tab" type="button" aria-selected="${selected}" tabindex="${tabindex}" data-index="${i}">${icon}${label}</button>`;
    }).join('');
  }

  setActive(idx, silent = false) {
    if (idx < 0 || idx >= this.tabs.length) return;
    if (idx === this.activeIndex && !silent) return;
    this.activeIndex = idx;
    this.$$('.tab-item').forEach((item, i) => {
      const selected = i === idx;
      item.setAttribute('aria-selected', String(selected));
      item.setAttribute('tabindex', selected ? '0' : '-1');
    });
    if (!silent) {
      const tab = this.tabs[idx];
      this.emit('af-tabbar:change', { index: idx, value: tab ? tab.value : idx });
    }
  }

  _bindClick() {
    this._onClick = (e) => {
      const item = e.target.closest('.tab-item');
      if (!item) return;
      const idx = Number(item.dataset.index);
      if (idx >= 0) this.setActive(idx);
    };
    this._listen(this._tabbar, 'click', this._onClick);
  }

  _bindKeydown() {
    this._onKeydown = (e) => {
      const items = this.$$('.tab-item');
      if (!items.length) return;
      let idx = items.indexOf(document.activeElement);
      if (idx < 0) idx = this.activeIndex;
      switch (e.key) {
        case 'ArrowRight': idx = (idx + 1) % items.length; break;
        case 'ArrowLeft':  idx = (idx - 1 + items.length) % items.length; break;
        case 'Home':       idx = 0; break;
        case 'End':        idx = items.length - 1; break;
        default: return;
      }
      e.preventDefault();
      this.setActive(idx);
      items[idx].focus();
    };
    this._listen(this._tabbar, 'keydown', this._onKeydown);
  }

  onAttributeChange(name) {
    if (!this._tabbar) return;
    if (name === 'tabs') {
      this._render();
      this._bindClick();
      this._bindKeydown();
      this.setActive(this.activeIndex, true);
      // 重建 DOM 后重新应用 aria-label
      this._applyI18n();
    } else if (name === 'active-index') {
      this.setActive(this.activeIndex);
    } else if (name === 'fixed') {
      this._tabbar.classList.toggle('tabbar-fixed', this.fixed);
    } else if (name === 'aria-label') {
      this._applyI18n();
    }
  }
}

AfElement.defineProp(AfTabbar.prototype, 'tabs', []);
AfElement.defineProp(AfTabbar.prototype, 'activeIndex', 0);
AfElement.defineProp(AfTabbar.prototype, 'fixed', true);
AfElement.defineProp(AfTabbar.prototype, 'ariaLabel', null);
