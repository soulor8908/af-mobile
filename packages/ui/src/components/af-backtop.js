// AIFlow UI —— af-backtop：回到顶部
// Light DOM，复用 L2 .btn 配方；内置 fixed 定位（开箱即用）
// 职责：滚动监听显隐 + 点击平滑滚动到顶部
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';
import { withI18n } from '../lib/with-i18n.js';

export class AfBacktop extends withI18n(AfElement) {
  static useShadow = false;
  static i18n = {
    'button': ['aria-label', 'bt.al', 'ariaLabelText'],
  };

  constructor() {
    super();
    this._visible = false;
  }

  get visible() { return this._visible; }

  mounted() {
    this._scrollTarget = this.target
      ? document.querySelector(this.target)
      : window;

    this.innerHTML = `<button class="btn btn-ghost">${esc(this.text)}</button>`;
    // fixed 定位由 recipes.css af-backtop 规则提供（position/z-index/bottom/left|right）
    // 项目级样式覆盖用 af-backtop 元素选择器或 af-backtop[position="left-bottom"] 属性选择器做 hook
    // （不再添加未登记白名单的标记类，遵守 Light DOM 仅用 L2 白名单 class 的约束）

    this._scrollTimer = null;
    this._onScroll = () => {
      clearTimeout(this._scrollTimer);
      this._scrollTimer = setTimeout(() => this._updateVisibility(), 100);
    };

    this._scrollTarget.addEventListener('scroll', this._onScroll);
    // 用 hidden 属性控制显隐，遵守 Light DOM 不可设内联样式的约束
    this._updateVisibility();

    this._onClick = () => {
      this.scrollToTop();
      this.emit('af-backtop:click', {});
    };
    this.$('button').addEventListener('click', this._onClick);
  }

  _updateVisibility() {
    const scrollTop = this._scrollTarget === window
      ? window.scrollY
      : this._scrollTarget.scrollTop;
    const shouldShow = scrollTop > this.threshold;
    if (shouldShow !== this._visible) {
      this._visible = shouldShow;
      this.toggleAttribute('hidden', !shouldShow);
      this.emit(shouldShow ? 'af-backtop:show' : 'af-backtop:hide', {});
    } else if (!shouldShow && !this.hasAttribute('hidden')) {
      // 初始默认隐藏
      this.setAttribute('hidden', '');
    }
  }

  scrollToTop() {
    const opts = { top: 0, behavior: 'smooth' };
    if (this._scrollTarget === window) window.scrollTo(opts);
    else this._scrollTarget.scrollTo(opts);
  }

  onAttributeChange(name, oldVal, newVal) {
    if (!this._scrollTarget) return;
    if (name === 'threshold') {
      this._updateVisibility();
    } else if (name === 'target') {
      if (this._scrollTarget) {
        this._scrollTarget.removeEventListener('scroll', this._onScroll);
      }
      this._scrollTarget = this.target ? document.querySelector(this.target) : window;
      this._scrollTarget.addEventListener('scroll', this._onScroll);
      this._updateVisibility();
    } else if (name === 'text') {
      const btn = this.$('button');
      if (btn) btn.textContent = newVal;
    } else if (name === 'aria-label-text') {
      this._applyI18n();
    }
  }

  unmounted() {
    this._scrollTarget?.removeEventListener('scroll', this._onScroll);
    if (this._scrollTimer) clearTimeout(this._scrollTimer);
    this.$('button')?.removeEventListener('click', this._onClick);
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfBacktop.prototype, 'threshold', { type: Number, default: 200 });
AfElement.defineProp(AfBacktop.prototype, 'target', { type: String, default: '' });
AfElement.defineProp(AfBacktop.prototype, 'text', { type: String, default: '↑' });
AfElement.defineProp(AfBacktop.prototype, 'ariaLabelText', { attr: 'aria-label-text', type: String, default: null });
AfElement.defineProp(AfBacktop.prototype, 'position', { type: String, default: 'right-bottom' });
