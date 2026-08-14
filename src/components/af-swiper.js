// AIFlow UI —— af-swiper：横向滑动卡片
// Shadow DOM（useShadow=true），CSS 嵌入 JS 字符串
// 职责：touch 拖拽 + 自动播放 + 循环 + dots + 键盘 + 尺寸响应
import { AfElement } from '../lib/af-element.js';
import { withI18n } from '../lib/with-i18n.js';

const CSS = `
  :host { display: block; overflow: hidden; position: relative; }
  .viewport { overflow: hidden; }
  .track { display: flex; transition: transform var(--af-swipe-dur, var(--dur-base)) var(--ease-out); will-change: transform; }
  .track.dragging { transition: none; }
  .track > *, ::slotted(*) { flex-shrink: 0; width: 100%; }
  .dots { display: flex; gap: var(--s-1); justify-content: center; padding: var(--s-2); }
  .dot {
    width: var(--s-2); height: var(--s-2); border-radius: var(--r-f);
    background: var(--c-border); border: none; cursor: pointer; padding: 0;
    transition: background var(--dur-fast) var(--ease-out);
  }
  .dot.active { background: var(--c-brand); }
  :host(:not([show-dots])) .dots { display: none; }
  @media (prefers-reduced-motion: reduce) {
    .track, .dot { transition: none; }
  }
`;

export class AfSwiper extends withI18n(AfElement) {
  static useShadow = true;
  static i18n = {
    '@': ['aria-label', (host, t) => {
      const n = host._dots?.children?.length || 0;
      return t('sw.al', { total: n, current: host.activeIndex + 1 });
    }],
    'button.dot': ['aria-label', (host, t, el, i) => {
      const n = host._dots?.children?.length || 0;
      return t('sw.dot', { current: i + 1, total: n });
    }],
  };

  constructor() {
    super();
    this._dragOffset = 0;
    this._isHorizontal = null;
    this._autoplayTimer = null;
    this._resumeTimer = null;
    this._visualIndex = null;
    this._pendingCorrect = false;
    this._correctTimer = null;
  }

  get slideCount() {
    return this.shadowRoot.querySelector('slot')?.assignedElements().length ?? 0;
  }

  mounted() {
    this.shadowRoot.innerHTML = `
      ${AfElement.cssTag(CSS, 'af-swiper')}
      <div class="viewport" part="viewport">
        <div class="track" part="track"><slot></slot></div>
      </div>
      <div class="dots" part="dots" role="tablist"></div>
    `;
    this._viewport = this.$('.viewport');
    this._track = this.$('.track');
    this._dots = this.$('.dots');

    this._applyDuration();
    this.setAttribute('role', 'region');

    // P2-5: slotchange 监听——动态增删 slide 时重建 clone + dots
    this._onSlotChange = () => {
      this._setupLoopClones();
      this._renderDots();
      this._updateDots();
      this._updateTransform();
      this._applyI18n();
    };
    this.shadowRoot.querySelector('slot')?.addEventListener('slotchange', this._onSlotChange);

    // 等待 slot 子元素就绪
    this._rafId = requestAnimationFrame(() => {
      this._setupLoopClones();
      this._renderDots();
      this._updateTransform();
      this._applyI18n();
    });

    this._bindTouch();
    this._bindDots();
    this._bindKeydown();
    this._bindResize();
    this._startAutoplay();
    this._onTransitionEnd = () => {
      this._correctTransform();
      this.emit('af-swiper:change', { index: this.activeIndex });
    };
    this._track.addEventListener('transitionend', this._onTransitionEnd);
  }

  // P1-2: loop 无缝循环——在 slot 前后插入首尾 clone
  // 不变量：track 结构 = [clone(last), slide0, slide1, ..., slideN-1, clone(first)]
  // activeIndex 始终指向真实 slide（0..N-1），视觉偏移 = activeIndex + 1（loop 时多 1 个 clone 前缀）
  // 边界处理：next 到末张 → 视觉跳到 clone(first) → transitionend 无动画修正回 slide0
  //          prev 到首张 → 视觉跳到 clone(last) → transitionend 无动画修正回 slideN-1
  // 详见 _goToWithClone / _correctTransform
  _setupLoopClones() {
    if (!this._track) return;
    this._track.querySelectorAll('.af-swiper-clone').forEach(e => e.remove());
    if (!this.loop) return;
    const s = this.shadowRoot.querySelector('slot'), ss = s?.assignedElements() || [];
    if (ss.length < 2) return;
    const mk = (e) => { e.classList.add('af-swiper-clone'); e.setAttribute('aria-hidden', 'true'); return e; };
    this._track.append(mk(ss[0].cloneNode(true)));
    this._track.insertBefore(mk(ss.at(-1).cloneNode(true)), s);
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
      btn.setAttribute('tabindex', i === this.activeIndex ? '0' : '-1');
      btn.dataset.idx = String(i);
      this._dots.appendChild(btn);
    }
  }

  _updateDots() {
    this.$$('.dot').forEach((dot, i) => {
      const active = i === this.activeIndex;
      dot.classList.toggle('active', active);
      dot.setAttribute('aria-selected', String(active));
      dot.setAttribute('tabindex', active ? '0' : '-1');
    });
  }

  _updateTransform() {
    const w = this.offsetWidth;
    if (w > 0) {
      const offset = this.loop ? 1 : 0;
      const idx = this._visualIndex ?? this.activeIndex;
      this._track.style.transform = `translateX(${-(idx + offset) * w + this._dragOffset}px)`;
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
    // 如果在 clone 过渡中，先无动画修正到真实位置
    this._correctTransform();
    if (index === this.activeIndex) return;
    this.activeIndex = index;
    this.setAttribute('active-index', String(index));
    this._dragOffset = 0;
    this._updateTransform();
    this._updateDots();
    this._applyI18n();
  }

  next() {
    const n = this.slideCount;
    if (this.loop && this.activeIndex === n - 1) return this._goToWithClone(0, n);
    this.goTo(this.activeIndex + 1);
  }

  prev() {
    if (this.loop && this.activeIndex === 0) return this._goToWithClone(this.slideCount - 1, -1);
    this.goTo(this.activeIndex - 1);
  }

  // P1-2: 跨边界无缝过渡——activeIndex 立即设为真实值，transform 指向 clone 位置
  _goToWithClone(realIndex, visualIndex) {
    this.activeIndex = realIndex;
    this.setAttribute('active-index', String(realIndex));
    this._visualIndex = visualIndex;
    this._dragOffset = 0;
    this._updateTransform();
    this._updateDots();
    this._applyI18n();
    this._pendingCorrect = true;
    clearTimeout(this._correctTimer);
    this._correctTimer = setTimeout(() => this._correctTransform(), this.duration + 100);
  }

  // P1-2: transitionend 后无动画修正——从 clone 位置瞬移到真实位置
  _correctTransform() {
    if (!this._pendingCorrect) return;
    this._pendingCorrect = false;
    clearTimeout(this._correctTimer);
    this._visualIndex = null;
    this._track.classList.add('dragging');
    this._updateTransform();
    this._track.offsetHeight; // force reflow
    this._track.classList.remove('dragging');
  }

  _bindTouch() {
    let startX = 0, startY = 0;

    this._onTouchStart = (e) => {
      if (this.disabled) return;
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
    this._onKeydown = (e) => {
      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); this.next(); this._focusActiveDot(); break;
        case 'ArrowLeft':  e.preventDefault(); this.prev(); this._focusActiveDot(); break;
        case 'Home':       e.preventDefault(); this.goTo(0); this._focusActiveDot(); break;
        case 'End':        e.preventDefault(); this.goTo(this.slideCount - 1); this._focusActiveDot(); break;
      }
    };
    this.addEventListener('keydown', this._onKeydown);
  }

  _focusActiveDot() {
    this.$('.dot.active')?.focus();
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

  // 把 duration 属性接到 track 的 transition 时长（CSS 变量 --af-swipe-dur）
  _applyDuration() {
    if (this._track) this._track.style.setProperty('--af-swipe-dur', this.duration + 'ms');
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
      this._setupLoopClones();
      this._updateTransform();
    } else if (name === 'disabled') {
      this.disabled = newVal != null;
    } else if (name === 'duration') {
      this._applyDuration();
    }
  }

  onThemeChange() {
    this._updateTransform();
  }

  unmounted() {
    this._stopAutoplay();
    clearInterval(this._autoplayTimer);
    clearTimeout(this._resumeTimer);
    clearTimeout(this._correctTimer);
    if (this._rafId != null) cancelAnimationFrame(this._rafId);
    this._resizeObserver?.disconnect();
    this._track?.removeEventListener('transitionend', this._onTransitionEnd);
    this.shadowRoot?.querySelector('slot')?.removeEventListener('slotchange', this._onSlotChange);
    this.removeEventListener('touchstart', this._onTouchStart);
    this.removeEventListener('touchmove', this._onTouchMove);
    this.removeEventListener('touchend', this._onTouchEnd);
    this.removeEventListener('keydown', this._onKeydown);
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfSwiper.prototype, 'activeIndex', { attr: 'active-index', type: Number, default: 0 });
AfElement.defineProp(AfSwiper.prototype, 'autoplay', { type: Number, default: 0 });
AfElement.defineProp(AfSwiper.prototype, 'loop', { type: Boolean, default: false });
AfElement.defineProp(AfSwiper.prototype, 'duration', { type: Number, default: 250 });
AfElement.defineProp(AfSwiper.prototype, 'showDots', { attr: 'show-dots', type: Boolean, default: true });
AfElement.defineProp(AfSwiper.prototype, 'disabled', { type: Boolean, default: false });
