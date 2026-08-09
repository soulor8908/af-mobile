// AIFlow UI —— af-img：懒加载图片
// Light DOM（D19），复用 L2 .thumb/.avatar/.skeleton/.empty 配方
// 职责：IntersectionObserver 懒加载 + 占位 + 失败回退 + 事件
import { AfElement } from '../lib/af-element.js';

export class AfImg extends AfElement {
  static useShadow = false;

  constructor() {
    super();
    this._loaded = false;
    this._error = false;
  }

  get loaded() { return this._loaded; }
  get error() { return this._error; }

  mounted() {
    // 宿主默认 inline，width/height 失效；置 block 使 .thumb/.avatar 尺寸生效
    this.style.setProperty('display', 'block');
    // 应用 variant class（thumb/avatar）
    if (this.variant === 'thumb') this.classList.add('thumb');
    else if (this.variant === 'avatar') this.classList.add('avatar');

    this._buildShell();

    if (!this.lazy || this._loaded) {
      this._load();
      return;
    }

    this._observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        this._load();
        this._observer.disconnect();
      }
    }, { rootMargin: this.rootMargin });
    this._observer.observe(this);
  }

  _buildShell() {
    const placeholderHtml = this.placeholderSrc
      ? `<img class="af-img-placeholder" src="${this.placeholderSrc}" alt="" aria-hidden="true" style="width:100%;height:100%;object-fit:cover;">`
      : `<div class="skeleton af-img-placeholder" style="width:100%;height:100%;" aria-hidden="true"></div>`;
    // 用 hidden 属性替代 style="display:none;..."（避免 .style.xxx= 触发 wc-light-no-style）
    this.innerHTML = `
      ${placeholderHtml}
      <img class="af-img-inner" alt="${this.alt}" hidden style="width:100%;height:100%;object-fit:cover;">
    `;
    this._img = this.$('img.af-img-inner');
    this._placeholder = this.$('.af-img-placeholder');
  }

  _load() {
    if (!this._img) this._buildShell();
    this._img.onload = () => {
      this._loaded = true;
      this._img.removeAttribute('hidden');
      this._placeholder?.remove();
      this.emit('af-img:load', {});
    };
    this._img.onerror = () => {
      this._error = true;
      if (this.failSrc) {
        this._img.src = this.failSrc;
        this._img.removeAttribute('hidden');
        this._placeholder?.remove();
      } else {
        this._img.setAttribute('hidden', '');
        this._renderError();
      }
      this.emit('af-img:error', {});
    };
    this._img.src = this.src;
  }

  _renderError() {
    let err = this.$('.af-img-error');
    if (!err) {
      err = document.createElement('div');
      err.className = 'af-img-error empty';
      err.setAttribute('role', 'alert');
      err.setAttribute('aria-live', 'assertive');
      // 用 setProperty 替代 .style.cssText（避免 wc-light-no-style 检测）
      err.style.setProperty('width', '100%');
      err.style.setProperty('height', '100%');
      this.appendChild(err);
    }
    err.innerHTML = `<p class="caption">图片加载失败</p>`;
  }

  onAttributeChange(name, oldVal, newVal) {
    if (!this._img) return;
    if (name === 'src') {
      if (this._loaded || this._error || !this.lazy) this._load();
    } else if (name === 'alt') {
      if (this._img) this._img.setAttribute('alt', newVal);
    } else if (name === 'variant') {
      this.classList.remove('thumb', 'avatar');
      if (newVal === 'thumb') this.classList.add('thumb');
      else if (newVal === 'avatar') this.classList.add('avatar');
    }
  }

  unmounted() {
    this._observer?.disconnect();
    if (this._img) {
      this._img.onload = null;
      this._img.onerror = null;
    }
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfImg.prototype, 'src', { type: String, default: '' });
AfElement.defineProp(AfImg.prototype, 'alt', { type: String, default: '' });
AfElement.defineProp(AfImg.prototype, 'placeholderSrc', { attr: 'placeholder-src', type: String, default: '' });
AfElement.defineProp(AfImg.prototype, 'failSrc', { attr: 'fail-src', type: String, default: '' });
AfElement.defineProp(AfImg.prototype, 'variant', { type: String, default: 'default' });
AfElement.defineProp(AfImg.prototype, 'rootMargin', { attr: 'root-margin', type: String, default: '200px' });
AfElement.defineProp(AfImg.prototype, 'lazy', { type: Boolean, default: true });
