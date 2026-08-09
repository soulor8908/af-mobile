// AIFlow UI —— af-list：长列表虚拟滚动
// Light DOM（useShadow=false），复用 L2 .list/.list-item 配方
// 职责：虚拟滚动 + 下拉刷新 + 上拉加载 + itemclick 事件委托
import { AfElement, escapeHtml as esc, html } from '../lib/af-element.js';

const THROTTLE_MS = 16; // 1 帧
const REFRESH_THRESHOLD = 40;
const REFRESH_MAX = 60;
const LOADINGMORE_DISTANCE = 2; // 距底 N 项触发

export class AfList extends AfElement {
  static useShadow = false;

  constructor() {
    super();
    this._page = 1;
    this._isLoadingMore = false;
    this._hasMore = true;
    this._prevStart = -1;
    this._prevEnd = -1;
    this._renderItem = null;
    this._totalCount = null;
    this._scrollTimer = null;
  }

  get renderItem() { return this._renderItem; }
  set renderItem(fn) {
    this._renderItem = fn;
    this._prevStart = -1; this._prevEnd = -1; // 失效缓存，强制重渲染
    this._render();
  }

  get totalCount() { return this._totalCount ?? Infinity; }
  set totalCount(n) { this._totalCount = n; this._updateAria(); }

  get scrollTop() { return this._scroller ? this._scroller.scrollTop : 0; }

  mounted() {
    this._buildShell();
    this._applyHeight();
    this._render();
    this._bindScroll();
    if (this.refresh) this._bindPullRefresh();
    this._bindClick();
    this._updateAria();
  }

  // 应用 height 属性到宿主（通过 CSS 自定义属性传递，recipes.css af-list 读取）
  _applyHeight() {
    if (this.height) this.style.setProperty('--af-list-h', this.height);
  }

  // 外壳：.list > refresh-indicator + spacer-before + viewport + spacer-after + loadmore
  // 内部辅助元素用 data-role 定位（不污染白名单 class 空间）
  // 宿主 display:block / .list overflow:auto / spacer/refresh 高度均由 recipes.css 提供
  // 动态高度通过 CSS 自定义属性（--af-*）设置，遵守 wc-light-no-style（--* 允许）
  _buildShell() {
    this.innerHTML = `
      <div class="list" role="list">
        <div data-role="refresh-indicator" aria-live="polite" aria-label="正在刷新"></div>
        <div data-role="spacer-before"></div>
        <div data-role="viewport"></div>
        <div data-role="spacer-after"></div>
        <div data-role="loadmore" class="caption t-center p-2"></div>
      </div>
    `;
    this._scroller = this.$('.list');
    this._refreshIndicator = this.$('[data-role="refresh-indicator"]');
    this._spacerBefore = this.$('[data-role="spacer-before"]');
    this._viewport = this.$('[data-role="viewport"]');
    this._spacerAfter = this.$('[data-role="spacer-after"]');
    this._loadmoreEl = this.$('[data-role="loadmore"]');
    // 重建 DOM 后渲染缓存失效，必须重置否则 _updateViewport 跳过渲染
    this._prevStart = -1;
    this._prevEnd = -1;
  }

  _render() {
    if (!this._scroller) return;
    // 空态
    if (this.loading) {
      this._renderSkeleton();
      this.setAttribute('aria-busy', 'true');
      return;
    }
    this.removeAttribute('aria-busy');
    if (!this.data.length) {
      this._spacerBefore.style.setProperty('--af-spacer-before-h', '0px');
      this._spacerAfter.style.setProperty('height', '0px');
      this._viewport.innerHTML = `<div class="empty"><p class="body">${esc(this.emptyText)}</p></div>`;
      this._loadmoreEl.textContent = '';
      return;
    }
    this._updateViewport();
  }

  _renderSkeleton() {
    const lines = Math.max(3, Math.floor(this._scroller.clientHeight / this.itemHeight));
    let html = '';
    for (let i = 0; i < lines; i++) {
      html += `<div class="list-item"><div class="skeleton skeleton-line" style="width:80%"></div></div>`;
    }
    this._spacerBefore.style.setProperty('--af-spacer-before-h', '0px');
    this._spacerAfter.style.setProperty('height', '0px');
    this._viewport.innerHTML = html;
    this._loadmoreEl.textContent = '';
  }

  _updateViewport() {
    const scroller = this._scroller;
    const total = this.totalCount;
    const itemH = this.itemHeight;
    const viewportTop = scroller.scrollTop;
    const viewportH = scroller.clientHeight;
    const visibleCount = Math.ceil(viewportH / itemH);
    let startIndex = Math.max(0, Math.floor(viewportTop / itemH) - this.buffer);
    let endIndex = Math.min(total, startIndex + visibleCount + 2 * this.buffer);

    if (startIndex === this._prevStart && endIndex === this._prevEnd) {
      this._checkLoadmore(scroller, total);
      return;
    }
    this._prevStart = startIndex;
    this._prevEnd = endIndex;

    this._spacerBefore.style.setProperty('--af-spacer-before-h', (startIndex * itemH) + 'px');
    // totalCount 未显式设置（Infinity）时不设 spacerAfter，避免写出非法 "Infinitypx"
    if (Number.isFinite(total)) {
      this._spacerAfter.style.setProperty('--af-spacer-after-h', ((total - endIndex) * itemH) + 'px');
    } else {
      this._spacerAfter.style.setProperty('--af-spacer-after-h', '0px');
    }

    const render = this._renderItem || ((item, idx) => this._defaultRender(item, idx));
    const slice = this.data.slice(startIndex, endIndex);
    let html = '';
    for (let i = 0; i < slice.length; i++) {
      html += render(slice[i], startIndex + i);
    }
    this._viewport.innerHTML = html;

    this._checkLoadmore(scroller, total);
  }

  // 默认渲染：用 html 标签自动转义插值，防 XSS
  // 自定义 renderItem 时强烈建议用 html 标签，或手动 esc() 转义不可信数据
  _defaultRender(item, idx) {
    const cls = this.mode === 'compact' ? 'list-item-compact' : 'list-item';
    return html`<div class="${cls}" data-list-index="${idx}">
      <div class="flex-1">
        <div class="body">${item.title}</div>
        ${item.subtitle ? html`<div class="subtitle">${item.subtitle}</div>` : ''}
      </div>
    </div>`;
  }

  _checkLoadmore(scroller, total) {
    if (this._isLoadingMore || !this._hasMore) return;
    if (this.data.length >= total) {
      this._loadmoreEl.textContent = '没有更多了';
      this._hasMore = false;
      return;
    }
    const distanceToBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    if (distanceToBottom < this.itemHeight * LOADINGMORE_DISTANCE) {
      this._isLoadingMore = true;
      this._page += 1;
      this._loadmoreEl.textContent = '加载中…';
      this.emit('af-list:loadmore', { page: this._page });
    }
  }

  endLoadMore(hasMore) {
    this._isLoadingMore = false;
    this._hasMore = !!hasMore;
    this._loadmoreEl.textContent = hasMore ? '' : '没有更多了';
  }

  endRefresh() {
    this._refreshIndicator.style.setProperty('--af-refresh-h', '0px');
  }

  _bindScroll() {
    this._onScroll = () => {
      if (this._scrollTimer) return;
      this._scrollTimer = setTimeout(() => {
        this._scrollTimer = null;
        this._updateViewport();
      }, THROTTLE_MS);
    };
    this._scroller.addEventListener('scroll', this._onScroll);
  }

  _bindPullRefresh() {
    let startY = 0;
    let dragging = false;
    this._onTouchStart = (e) => {
      if (this._scroller.scrollTop > 0) return;
      startY = e.touches[0].clientY;
      dragging = true;
    };
    this._onTouchMove = (e) => {
      if (!dragging) return;
      const deltaY = e.touches[0].clientY - startY;
      if (deltaY > 0) {
        e.preventDefault();
        const h = Math.min(deltaY * 0.5, REFRESH_MAX);
        this._refreshIndicator.style.setProperty('--af-refresh-h', h + 'px');
      }
    };
    this._onTouchEnd = () => {
      if (!dragging) return;
      dragging = false;
      const h = parseFloat(this._refreshIndicator.style.getPropertyValue('--af-refresh-h')) || 0;
      if (h > REFRESH_THRESHOLD) {
        this._refreshIndicator.style.setProperty('--af-refresh-h', REFRESH_THRESHOLD + 'px');
        this.emit('af-list:refresh', {});
      } else {
        this._refreshIndicator.style.setProperty('--af-refresh-h', '0px');
      }
    };
    this._scroller.addEventListener('touchstart', this._onTouchStart, { passive: true });
    this._scroller.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this._scroller.addEventListener('touchend', this._onTouchEnd);
  }

  _bindClick() {
    this._onClick = (e) => {
      const itemEl = e.target.closest('.list-item, .list-item-compact');
      if (!itemEl || !this._scroller.contains(itemEl)) return;
      const idx = Number(itemEl.dataset.listIndex);
      if (!Number.isNaN(idx) && this.data[idx] != null) {
        this.emit('af-list:itemclick', { index: idx, item: this.data[idx] });
      }
    };
    this._scroller.addEventListener('click', this._onClick);
  }

  _updateAria() {
    // totalCount 未显式设置（Infinity）时用 data.length 展示，避免 aria 出现 "Infinity"
    const total = this._totalCount == null ? this.data.length : this.totalCount;
    this.setAttribute('aria-label', `列表，共 ${total} 项`);
  }

  onAttributeChange(name, oldVal, newVal) {
    if (!this._scroller) return;
    if (name === 'data') {
      this._render();
    } else if (name === 'loading') {
      this._render();
    } else if (name === 'height') {
      this._applyHeight();
    } else if (name === 'mode' || name === 'empty-text' || name === 'item-height') {
      this._render();
    }
  }

  unmounted() {
    if (this._scrollTimer) { clearTimeout(this._scrollTimer); this._scrollTimer = null; }
    this._scroller?.removeEventListener('scroll', this._onScroll);
    this._scroller?.removeEventListener('click', this._onClick);
    if (this.refresh) {
      this._scroller?.removeEventListener('touchstart', this._onTouchStart);
      this._scroller?.removeEventListener('touchmove', this._onTouchMove);
      this._scroller?.removeEventListener('touchend', this._onTouchEnd);
    }
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfList.prototype, 'data', { type: Array, default: [] });
AfElement.defineProp(AfList.prototype, 'pageSize', { attr: 'page-size', type: Number, default: 20 });
AfElement.defineProp(AfList.prototype, 'itemHeight', { attr: 'item-height', type: Number, default: 48 });
AfElement.defineProp(AfList.prototype, 'buffer', { type: Number, default: 5 });
AfElement.defineProp(AfList.prototype, 'mode', { type: String, default: 'normal' });
AfElement.defineProp(AfList.prototype, 'refresh', { type: Boolean, default: true });
AfElement.defineProp(AfList.prototype, 'loading', { type: Boolean, default: false });
AfElement.defineProp(AfList.prototype, 'emptyText', { attr: 'empty-text', type: String, default: '暂无数据' });
AfElement.defineProp(AfList.prototype, 'height', { type: String, default: '' });
