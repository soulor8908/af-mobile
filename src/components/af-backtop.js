// AIFlow UI —— af-backtop：回到顶部
// Light DOM，复用 L2 .btn 配方 + 项目级 .af-backtop-fixed 扩展
// 职责：滚动监听显隐 + 点击平滑滚动到顶部
import { AfElement } from '../lib/af-element.js';

export class AfBacktop extends AfElement {
  static useShadow = false;

  constructor() {
    super();
    this._visible = false;
  }

  get visible() { return this._visible; }

  mounted() {
    this._scrollTarget = this.target
      ? document.querySelector(this.target)
      : window;

    this.innerHTML = `<button class="btn btn-ghost" aria-label="${this.ariaLabelText}">${this.text}</button>`;
    // 项目级扩展类（默认 right-bottom）
    if (this.position === 'left-bottom') this.classList.add('af-backtop-fixed', 'af-backtop-left');
    else this.classList.add('af-backtop-fixed');

    let scrollTimer = null;
    this._onScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => this._updateVisibility(), 100);
    };

    this._scrollTarget.addEventListener('scroll', this._onScroll);
    this._updateVisibility();

    this.$('button').addEventListener('click', () => {
      this.scrollToTop();
      this.emit('af-backtop:click', {});
    });
  }

  _updateVisibility() {
    const scrollTop = this._scrollTarget === window
      ? window.scrollY
      : this._scrollTarget.scrollTop;
    const shouldShow = scrollTop > this.threshold;
    if (shouldShow !== this._visible) {
      this._visible = shouldShow;
      this.style.display = shouldShow ? '' : 'none';
      this.emit(shouldShow ? 'af-backtop:show' : 'af-backtop:hide', {});
    } else if (!shouldShow && this.style.display === '') {
      // 初始默认隐藏
      this.style.display = 'none';
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
      const btn = this.$('button');
      if (btn) btn.setAttribute('aria-label', newVal);
    }
  }

  unmounted() {
    this._scrollTarget?.removeEventListener('scroll', this._onScroll);
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfBacktop.prototype, 'threshold', { type: Number, default: 200 });
AfElement.defineProp(AfBacktop.prototype, 'target', { type: String, default: '' });
AfElement.defineProp(AfBacktop.prototype, 'text', { type: String, default: '↑' });
AfElement.defineProp(AfBacktop.prototype, 'ariaLabelText', { attr: 'aria-label-text', type: String, default: '回到顶部' });
AfElement.defineProp(AfBacktop.prototype, 'position', { type: String, default: 'right-bottom' });
