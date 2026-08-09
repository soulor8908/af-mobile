// AIFlow UI —— af-tabs：标签页切换
// Light DOM（useShadow=false），复用 L2 .tabbar/.tab-item 配方
// 职责：选中态 + 内容联动 + WAI-ARIA tab 模式（roving tabindex + 键盘）
import { AfElement } from '../lib/af-element.js';

export class AfTabs extends AfElement {
  static useShadow = false;

  constructor() {
    super();
    this._renderPanel = null;
  }

  get renderPanel() { return this._renderPanel; }
  set renderPanel(fn) { this._renderPanel = fn; this._renderPanels(); }

  mounted() {
    this._buildShell();
    this._renderTabs();
    this._renderPanels();
    this._bindClick();
    this._bindKeydown();
    this.setActive(this.activeIndex, true);
  }

  _buildShell() {
    this.innerHTML = `
      <div class="tabbar" role="tablist"></div>
      <div class="af-tabs-panel-container"></div>
    `;
    this._tabbar = this.$('.tabbar');
    this._panelContainer = this.$('.af-tabs-panel-container');
    if (this.fixed) this._tabbar.classList.add('tabbar-fixed');
    if (this.getAttribute('aria-label')) {
      this._tabbar.setAttribute('aria-label', this.getAttribute('aria-label'));
    } else {
      this._tabbar.setAttribute('aria-label', '标签页');
    }
  }

  _renderTabs() {
    this._tabbar.innerHTML = this.tabs.map((tab, i) => {
      const disabled = tab.disabled ? ' disabled' : '';
      return `<button class="tab-item" role="tab" id="af-tabs-tab-${i}" aria-controls="af-tabs-panel-${i}" aria-selected="false" tabindex="-1"${disabled}>${tab.label}</button>`;
    }).join('');
  }

  _renderPanels() {
    // slot 静态面板
    const slotted = this.$$('div[slot^="panel-"]');
    if (this._renderPanel) {
      // renderPanel 函数驱动：覆盖 slot 内容
      this._panelContainer.innerHTML = this.tabs.map((tab, i) => {
        const html = this._renderPanel(tab, i) || '';
        return `<div class="af-tabs-panel" role="tabpanel" id="af-tabs-panel-${i}" aria-labelledby="af-tabs-tab-${i}" hidden>${html}</div>`;
      }).join('');
    } else if (slotted.length) {
      // slot 静态透传：移动到 panel container 并加 ARIA
      this._panelContainer.innerHTML = '';
      this.tabs.forEach((tab, i) => {
        let panel = this.$(`div[slot="panel-${i}"]`);
        if (!panel) {
          panel = document.createElement('div');
          panel.setAttribute('slot', `panel-${i}`);
          this.appendChild(panel);
        }
        panel.className = (panel.className || '') + ' af-tabs-panel';
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('id', `af-tabs-panel-${i}`);
        panel.setAttribute('aria-labelledby', `af-tabs-tab-${i}`);
        this._panelContainer.appendChild(panel);
      });
    }
  }

  setActive(idx, silent = false) {
    if (idx < 0 || idx >= this.tabs.length) return;
    if (this.tabs[idx] && this.tabs[idx].disabled) return;
    if (idx === this.activeIndex && !silent) return;

    this.activeIndex = idx;
    this.setAttribute('active-index', String(idx));

    this.$$('.tab-item').forEach((tab, i) => {
      const selected = i === idx;
      tab.setAttribute('aria-selected', String(selected));
      tab.setAttribute('tabindex', selected ? '0' : '-1');
    });

    this.$$('.af-tabs-panel, div[slot^="panel-"]').forEach((panel, i) => {
      panel.hidden = i !== idx;
    });

    if (!silent) {
      const tab = this.tabs[idx];
      this.emit('af-tabs:change', { index: idx, value: tab ? tab.value : idx });
    }
  }

  _bindClick() {
    this._onClick = (e) => {
      const tab = e.target.closest('.tab-item');
      if (!tab || tab.disabled) return;
      const idx = this.$$('.tab-item').indexOf(tab);
      if (idx >= 0) this.setActive(idx);
    };
    this._tabbar.addEventListener('click', this._onClick);
  }

  _bindKeydown() {
    this._onKeydown = (e) => {
      const tabs = this.$$('.tab-item:not([disabled])');
      if (!tabs.length) return;
      let idx = tabs.indexOf(document.activeElement);
      if (idx < 0) idx = this.activeIndex;
      switch (e.key) {
        case 'ArrowRight': idx = (idx + 1) % tabs.length; break;
        case 'ArrowLeft':  idx = (idx - 1 + tabs.length) % tabs.length; break;
        case 'Home':       idx = 0; break;
        case 'End':        idx = tabs.length - 1; break;
        default: return;
      }
      e.preventDefault();
      const realIdx = this.$$('.tab-item').indexOf(tabs[idx]);
      this.setActive(realIdx);
      tabs[idx].focus();
    };
    this._tabbar.addEventListener('keydown', this._onKeydown);
  }

  onAttributeChange(name, oldVal, newVal) {
    if (!this._tabbar) return;
    if (name === 'tabs') {
      this._renderTabs();
      this._renderPanels();
      this.setActive(this.activeIndex, true);
    } else if (name === 'active-index') {
      this.setActive(Number(newVal));
    } else if (name === 'fixed') {
      this._tabbar.classList.toggle('tabbar-fixed', this.fixed);
    }
  }

  unmounted() {
    // Light DOM 元素随组件销毁，removeEventListener 是为通过 wc-cleanup 检测
    this._tabbar?.removeEventListener('click', this._onClick);
    this._tabbar?.removeEventListener('keydown', this._onKeydown);
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfTabs.prototype, 'tabs', { type: Array, default: [] });
AfElement.defineProp(AfTabs.prototype, 'activeIndex', { attr: 'active-index', type: Number, default: 0 });
AfElement.defineProp(AfTabs.prototype, 'variant', { type: String, default: 'default' });
AfElement.defineProp(AfTabs.prototype, 'fixed', { type: Boolean, default: false });
