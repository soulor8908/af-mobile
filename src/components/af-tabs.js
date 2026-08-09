// AIFlow UI —— af-tabs：标签页切换
// Light DOM（useShadow=false），复用 L2 .tabbar/.tab-item 配方
// 职责：选中态 + 内容联动 + WAI-ARIA tab 模式（roving tabindex + 键盘）
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';

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
    this._bindChildChange();
    this.setActive(this.activeIndex, true);
  }

  _buildShell() {
    // 保留 slotted 面板（div[slot^="panel-"]），避免 innerHTML 重置时丢失外部引用与事件
    const slottedPanels = this.$$('div[slot^="panel-"]');
    this.innerHTML = `
      <div class="tabbar" role="tablist"></div>
      <div class="af-tabs-panel-container"></div>
    `;
    // 把 slotted 面板重新挂回（原位，不搬入 container）
    for (const p of slottedPanels) this.appendChild(p);
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
      return `<button class="tab-item" role="tab" id="af-tabs-tab-${i}" aria-controls="af-tabs-panel-${i}" aria-selected="false" tabindex="-1"${disabled}>${esc(tab.label)}</button>`;
    }).join('');
  }

  _renderPanels() {
    if (!this._panelContainer) return; // 挂载前 setter 调用安全跳过（mounted 会再调一次）
    const slotted = this.$$('div[slot^="panel-"]');
    if (this._renderPanel) {
      // renderPanel 函数驱动：内容在 panel container 内（无外部引用，安全搬运）
      this._panelContainer.innerHTML = this.tabs.map((tab, i) => {
        const html = this._renderPanel(tab, i) || '';
        return `<div class="af-tabs-panel" role="tabpanel" id="af-tabs-panel-${i}" aria-labelledby="af-tabs-tab-${i}" hidden>${html}</div>`;
      }).join('');
    } else if (slotted.length) {
      // slot 静态透传：原地加 ARIA，不搬运节点（保留外部引用与事件监听）
      this._panelContainer.innerHTML = '';
      this.tabs.forEach((tab, i) => {
        const panel = this.$(`div[slot="panel-${i}"]`);
        if (!panel) return;
        panel.classList.add('af-tabs-panel');
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('id', `af-tabs-panel-${i}`);
        panel.setAttribute('aria-labelledby', `af-tabs-tab-${i}`);
        panel.hidden = i !== this.activeIndex;
      });
    }
  }

  setActive(idx, silent = false) {
    if (idx < 0 || idx >= this.tabs.length) return;
    if (this.tabs[idx] && this.tabs[idx].disabled) return;
    if (idx === this.activeIndex && !silent) return;

    this.activeIndex = idx;

    this.$$('.tab-item').forEach((tab, i) => {
      const selected = i === idx;
      tab.setAttribute('aria-selected', String(selected));
      tab.setAttribute('tabindex', selected ? '0' : '-1');
    });

    // 切换面板显隐：renderPanel 模式与 slot 模式都给面板加了 .af-tabs-panel + id
    // 用 id 精确匹配（避免两种模式并存时 index 串扰）
    const activePanel = this.$(`#af-tabs-panel-${idx}`);
    if (activePanel) activePanel.hidden = false;
    this.$$('.af-tabs-panel').forEach((panel) => {
      if (panel !== activePanel) panel.hidden = true;
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

  _bindChildChange() {
    // 监听 slotted 面板的增删（Light DOM 无 <slot> 元素，故用 MutationObserver）
    // 仅在 slot 静态面板模式下有意义；renderPanel 函数模式由 tabs 属性变化驱动
    this._onChildChange = () => {
      if (this._renderPanel) return; // 函数模式不处理
      this._renderPanels();
      this.setActive(this.activeIndex, true);
    };
    this._observer = new MutationObserver(this._onChildChange);
    this._observer.observe(this, { childList: true, subtree: false });
  }

  unmounted() {
    // Light DOM 元素随组件销毁，removeEventListener 是为通过 wc-cleanup 检测
    this._tabbar?.removeEventListener('click', this._onClick);
    this._tabbar?.removeEventListener('keydown', this._onKeydown);
    this._observer?.disconnect();
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfTabs.prototype, 'tabs', { type: Array, default: [] });
AfElement.defineProp(AfTabs.prototype, 'activeIndex', { attr: 'active-index', type: Number, default: 0 });
AfElement.defineProp(AfTabs.prototype, 'variant', { type: String, default: 'default' });
AfElement.defineProp(AfTabs.prototype, 'fixed', { type: Boolean, default: false });
