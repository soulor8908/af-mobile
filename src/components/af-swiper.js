// AIFlow UI —— af-swiper：横向滑动卡片
// Shadow DOM（useShadow=true），CSS 嵌入 JS 字符串
// 职责：touch 拖拽 + 自动播放 + 循环 + dots + 键盘 + 尺寸响应
import { AfElement } from '../lib/af-element.js';

const CSS = `
  :host { display: block; overflow: hidden; position: relative; }
  .viewport { overflow: hidden; }
  .track { display: flex; transition: transform var(--dur-base) var(--ease-out); will-change: transform; }
  .track.dragging { transition: none; }
  ::slotted(*) { flex-shrink: 0; width: 100%; }
  .dots { display: flex; gap: var(--s-1); justify-content: center; padding: var(--s-2); }
  .dot {
    width: var(--s-2); height: var(--s-2); border-radius: var(--r-f);
    background: var(--c-border); border: none; cursor: pointer; padding: 0;
    transition: background var(--dur-fast) var(--ease-out);
  }
  .dot.active { background: var(--c-brand); }
  :host([show-dots="false"]) .dots { display: none; }
`;

export class AfSwiper extends AfElement {
  static useShadow = true;

  constructor() {
    super();
    this._dragOffset = 0;
    this._isHorizontal = null;
    this._autoplayTimer = null;
    this._resumeTimer = null;
  }

  get slideCount() {
    return this.shadowRoot.querySelector('slot')?.assignedElements().length ?? 0;
  }

  mounted() {
    const style = document.createElement('style');
    style.textContent = CSS;
    this.shadowRoot.appendChild(style);

    this.shadowRoot.innerHTML += `
      <div class="viewport" part="viewport">
        <div class="track" part="track"><slot></slot></div>
      </div>
      <div class="dots" part="dots"></div>
    `;
    this._viewport = this.$('.viewport');
    this._track = this.$('.track');
    this._dots = this.$('.dots');

    this.setAttribute('role', 'region');

    // 等待 slot 子元素就绪
    this._rafId = requestAnimationFrame(() => {
      this._renderDots();
      this._updateTransform();
      this._updateAria();
    });

    this._bindTouch();
    this._bindDots();
    this._bindKeydown();
    this._bindResize();
    this._startAutoplay();
    this._onTransitionEnd = () => {
      this.emit('af-swiper:change', { index: this.activeIndex });
    };
    this._track.addEventListener('transitionend', this._onTransitionEnd);
  }

  _renderDots() {
    const n = this.slideCount;
    if (!n) return;
    this._dots.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const btn = document.createElement('button');
      btn.className = 'dot' + (i === this.activeIndex ? ' active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(i === this.activeIndex));
      btn.setAttribute('aria-label', `第 ${i + 1} 张，共 ${n} 张`);
      btn.dataset.idx = String(i);
      this._dots.appendChild(btn);
    }
  }

  _updateDots() {
    this.$$('.dot').forEach((dot, i) => {
      const active = i === this.activeIndex;
      dot.classList.toggle('active', active);
      dot.setAttribute('aria-selected', String(active));
    });
  }

  _updateTransform() {
    const w = this.offsetWidth;
    if (w > 0) {
      this._track.style.transform = `translateX(${-(this.activeIndex * w) + this._dragOffset}px)`;
    }
  }

  goTo(index) {
    const n = this.slideCount;
    if (!n) return;
    if (this.loop) {
      index = (index + n) % n;
    } else {
      index = Math.max(0, Math.min(index, n - 1));
    }
    if (index === this.activeIndex) return;
    this.activeIndex = index;
    this.setAttribute('active-index', String(index));
    this._dragOffset = 0;
    this._updateTransform();
    this._updateDots();
    this._updateAria();
  }

  next() { this.goTo(this.activeIndex + 1); }
  prev() { this.goTo(this.activeIndex - 1); }

  _bindTouch() {
    if (this.disabled) return;
    let startX = 0, startY = 0;

    this._onTouchStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      this._isHorizontal = null;
      this._dragOffset = 0;
      this._track.classList.add('dragging');
      this._stopAutoplay();
      clearTimeout(this._resumeTimer);
    };

    this._onTouchMove = (e) => {
      const deltaX = e.touches[0].clientX - startX;
      const deltaY = e.touches[0].clientY - startY;
      if (this._isHorizontal === null) {
        this._isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
      }
      if (!this._isHorizontal) return;
      e.preventDefault();
      let offset = deltaX;
      if (!this.loop) {
        if (this.activeIndex === 0 && deltaX > 0) offset = deltaX * 0.3;
        if (this.activeIndex === this.slideCount - 1 && deltaX < 0) offset = deltaX * 0.3;
      }
      this._dragOffset = offset;
      this._updateTransform();
    };

    this._onTouchEnd = () => {
      this._track.classList.remove('dragging');
      const w = this.offsetWidth;
      const threshold = w * 0.2;
      if (this._dragOffset < -threshold) this.next();
      else if (this._dragOffset > threshold) this.prev();
      else { this._dragOffset = 0; this._updateTransform(); }
      // 2s 后恢复自动播放
      if (this.autoplay > 0) {
        clearTimeout(this._resumeTimer);
        this._resumeTimer = setTimeout(() => this._startAutoplay(), 2000);
      }
    };

    this.addEventListener('touchstart', this._onTouchStart, { passive: true });
    this.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.addEventListener('touchend', this._onTouchEnd);
  }

  _bindDots() {
    this._dots.addEventListener('click', (e) => {
      const dot = e.target.closest('.dot');
      if (!dot) return;
      this.goTo(Number(dot.dataset.idx));
    });
  }

  _bindKeydown() {
    this.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); this.next(); break;
        case 'ArrowLeft':  e.preventDefault(); this.prev(); break;
        case 'Home':       e.preventDefault(); this.goTo(0); break;
        case 'End':        e.preventDefault(); this.goTo(this.slideCount - 1); break;
      }
    });
  }

  _bindResize() {
    this._resizeObserver = new ResizeObserver(() => this._updateTransform());
    this._resizeObserver.observe(this);
  }

  _startAutoplay() {
    if (this.autoplay <= 0) return;
    this._stopAutoplay();
    this._autoplayTimer = setInterval(() => {
      if (this.loop || this.activeIndex < this.slideCount - 1) this.next();
      else this._stopAutoplay();
    }, this.autoplay);
  }

  _stopAutoplay() {
    clearInterval(this._autoplayTimer);
    this._autoplayTimer = null;
  }

  _updateAria() {
    const n = this.slideCount;
    if (n) {
      this.setAttribute('aria-label', `轮播图，共 ${n} 张，当前第 ${this.activeIndex + 1} 张`);
    }
  }

  onAttributeChange(name, oldVal, newVal) {
    if (!this._track) return;
    if (name === 'active-index') {
      this.goTo(Number(newVal));
    } else if (name === 'autoplay') {
      this.autoplay = Number(newVal) || 0;
      this._stopAutoplay();
      this._startAutoplay();
    } else if (name === 'loop') {
      this.loop = newVal != null;
    } else if (name === 'disabled') {
      this.disabled = newVal != null;
    }
  }

  onThemeChange() {
    this._updateTransform();
  }

  unmounted() {
    this._stopAutoplay();
    clearInterval(this._autoplayTimer);
    clearTimeout(this._resumeTimer);
    if (this._rafId != null) cancelAnimationFrame(this._rafId);
    this._resizeObserver?.disconnect();
    this._track?.removeEventListener('transitionend', this._onTransitionEnd);
    this.removeEventListener('touchstart', this._onTouchStart);
    this.removeEventListener('touchmove', this._onTouchMove);
    this.removeEventListener('touchend', this._onTouchEnd);
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfSwiper.prototype, 'activeIndex', { attr: 'active-index', type: Number, default: 0 });
AfElement.defineProp(AfSwiper.prototype, 'autoplay', { type: Number, default: 0 });
AfElement.defineProp(AfSwiper.prototype, 'loop', { type: Boolean, default: false });
AfElement.defineProp(AfSwiper.prototype, 'duration', { type: Number, default: 250 });
AfElement.defineProp(AfSwiper.prototype, 'showDots', { attr: 'show-dots', type: String, default: 'true' });
AfElement.defineProp(AfSwiper.prototype, 'disabled', { type: Boolean, default: false });
