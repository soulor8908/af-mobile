// AIFlow UI —— af-img：懒加载图片
// Light DOM（D19），复用 L2 .thumb/.avatar/.skeleton/.empty 配方
// 职责：IntersectionObserver 懒加载 + 占位 + 失败回退 + 事件
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';

export class AfImg extends AfElement {
  static useShadow = false;

  constructor() {
    super();
    this._loaded = false;
    this._error = false;
    this._triedFail = false;
  }

  get loaded() { return this._loaded; }
  get error() { return this._error; }

  mounted() {
    // 宿主 display:block 由 recipes.css af-img 规则提供
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
    // 尺寸（width/height/object-fit/aspect-ratio）由 recipes.css af-img 宿主规则提供，
    // 按宿主 variant class（thumb/avatar/default）区分，遵守 Light DOM 不可设内联样式的约束
    // 内部元素用 data-role 定位（同 af-list），避免内部类污染白名单
    const placeholderHtml = this.placeholderSrc
      ? `<img data-role="placeholder" src="${esc(this.placeholderSrc)}" alt="" aria-hidden="true">`
      : `<div class="skeleton" data-role="placeholder" aria-hidden="true"></div>`;
    // 用 hidden 属性控制显隐，遵守 Light DOM 不可设内联样式的约束
    this.innerHTML = `
      ${placeholderHtml}
      <img class="af-img-inner" alt="${esc(this.alt)}" hidden>
    `;
    this._img = this.$('img.af-img-inner');
    this._placeholder = this.$('[data-role="placeholder"]');
  }

  _load() {
    if (!this._img) this._buildShell();
    this._triedFail = false; // 新 src 重置 fallback 守卫
    this._img.onload = () => {
      this._loaded = true;
      this._img.removeAttribute('hidden');
      this._placeholder?.remove();
      this.emit('af-img:load', {});
    };
    this._img.onerror = () => {
      // failSrc 也失败时停止重试，避免 onerror → setSrc → onerror 无限循环
      if (this._triedFail) return;
      this._error = true;
      if (this.failSrc) {
        this._triedFail = true;
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
    let err = this.$('[data-role="error"]');
    if (!err) {
      // 尺寸由 recipes.css af-img [data-role="error"] 规则提供（width/height:100%）
      this.insertAdjacentHTML('beforeend', `<div class="empty" data-role="error" role="alert" aria-live="assertive"></div>`);
      err = this.$('[data-role="error"]');
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
