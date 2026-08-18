// af-mobile UI —— af-list：长列表虚拟滚动
// Light DOM（useShadow=false），复用 L2 .list/.list-item 配方
// 职责：虚拟滚动 + 下拉刷新 + 上拉加载 + itemclick 事件委托
import { AfElement, escapeHtml as esc, html } from '../lib/af-element.js';
import { t } from '../lib/i18n.js';
import { withI18n } from '../lib/with-i18n.js';

const LOADINGMORE_DISTANCE = 2; // 距底 N 项触发
const REFRESH_THRESHOLD = 40;
const REFRESH_MAX = 60;

export class AfList extends withI18n(AfElement) {
  static useShadow = false;
  static i18n = {
    '[data-role="refresh-indicator"]': ['aria-label', 'ls.rf'],
    '[data-role="loadmore"]': ['', (host, t) =>
      host._hasMore ? (host._isLoadingMore ? t('ls.ld') : '') : t('ls.nm')
    ],
    '.empty p.body': ['', (host, t) => host.emptyText || t('ls.em')],
    '@': ['aria-label', (host, t) => {
      const total = host._totalCount == null ? host.data.length : host.totalCount;
      return t('ls.al', { n: total });
    }],
  };

  constructor() {
    super();
    this._page = 1;
    this._isLoadingMore = false;
    this._hasMore = true;
    this._prevStart = -1;
    this._prevEnd = -1;
    this._renderItem = null;
    this._totalCount = null;
    this._scrollRaf = null;
    this._activeIndex = null;
  }

  get renderItem() { return this._renderItem; }
  set renderItem(fn) {
    this._renderItem = fn;
    this._prevStart = -1; this._prevEnd = -1; // 失效缓存，强制重渲染
    this._render();
  }

  get totalCount() { return this._totalCount ?? Infinity; }
  set totalCount(n) { this._totalCount = n; this._applyI18n(); }

  get scrollTop() { return this._scroller ? this._scroller.scrollTop : 0; }

  mounted() {
    this._buildShell();
    this._applyHeight();
    this._render();
    this._bindScroll();
    if (this.refresh) this._bindPullRefresh();
    this._bindClick();
    this._bindKeydown();
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
      <div class="list" role="list" tabindex="0">
        <div data-role="refresh-indicator" aria-live="polite"></div>
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
      this._spacerAfter.style.setProperty('--af-spacer-after-h', '0px');
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
      html += `<div class="list-item"><div class="skeleton skeleton-line skeleton-w-80"></div></div>`;
    }
    this._spacerBefore.style.setProperty('--af-spacer-before-h', '0px');
    this._spacerAfter.style.setProperty('--af-spacer-after-h', '0px');
    this._viewport.innerHTML = html;
    this._loadmoreEl.textContent = '';
  }

  _updateViewport() {
    const scroller = this._scroller;
    const total = this.totalCount;
    const dataLen = this.data.length;
    const itemH = this.itemHeight;
    const viewportTop = scroller.scrollTop;
    const viewportH = scroller.clientHeight;
    const visibleCount = Math.ceil(viewportH / itemH);
    let startIndex = Math.max(0, Math.floor(viewportTop / itemH) - this.buffer);
    // endIndex 以实际数据长度为界：totalCount 仅用于 aria 提示与"是否还有更多"判断，
    // 不参与视窗裁剪，否则 totalCount>data.length 时 slice 越界返回空、viewport 空白
    let endIndex = Math.min(dataLen, startIndex + visibleCount + 2 * this.buffer);

    if (startIndex === this._prevStart && endIndex === this._prevEnd) {
      this._checkLoadmore(scroller, total);
      return;
    }
    this._prevStart = startIndex;
    this._prevEnd = endIndex;

    this._spacerBefore.style.setProperty('--af-spacer-before-h', (startIndex * itemH) + 'px');
    // 尾部 spacer 基于实际已有数据长度，使滚动条总高反映真实数据：
    // 滚到真实数据末尾即触发 loadmore；避免 totalCount>data.length 时撑出大段空白
    // 导致 viewport 空白且 distanceToBottom 始终过大、loadmore 永不触发
    this._spacerAfter.style.setProperty('--af-spacer-after-h', (Math.max(0, dataLen - endIndex) * itemH) + 'px');

    const render = this._renderItem || ((item, idx) => this._defaultRender(item, idx));
    const slice = this.data.slice(startIndex, endIndex);
    let html = '';
    for (let i = 0; i < slice.length; i++) {
      html += render(slice[i], startIndex + i);
    }
    this._viewport.innerHTML = html;

    // 键盘导航的活跃项可能随滚动移出渲染窗：重渲染后补设 aria-activedescendant，
    // 防止目标项在窗外时 querySelector 为 null 导致的永久丢失（P2 无障碍）
    if (this._activeIndex != null) this._updateAriaActive(this._activeIndex);

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
      this._loadmoreEl.textContent = t('ls.nm');
      this._hasMore = false;
      return;
    }
    const distanceToBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    if (distanceToBottom < this.itemHeight * LOADINGMORE_DISTANCE) {
      this._isLoadingMore = true;
      this._page += 1;
      this._loadmoreEl.textContent = t('ls.ld');
      this.emit('af-list:loadmore', { page: this._page });
    }
  }

  endLoadMore(hasMore) {
    this._isLoadingMore = false;
    this._hasMore = !!hasMore;
    this._loadmoreEl.textContent = hasMore ? '' : t('ls.nm');
  }

  endRefresh() {
    this._refreshIndicator.style.setProperty('--af-refresh-h', '0px');
  }

  _bindScroll() {
    this._onScroll = () => {
      if (this._scrollRaf) return;
      // rAF 节流：每帧最多更新一次视口，比 setTimeout(16) 更贴合渲染时机
      this._scrollRaf = requestAnimationFrame(() => {
        this._scrollRaf = null;
        this._updateViewport();
      });
    };
    // passive: 不调 preventDefault，浏览器可并行滚动合成，提升滚动性能
    this._listen(this._scroller, 'scroll', this._onScroll, { passive: true });
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
    this._listen(this._scroller, 'touchstart', this._onTouchStart, { passive: true });
    this._listen(this._scroller, 'touchmove', this._onTouchMove, { passive: false });
    this._listen(this._scroller, 'touchend', this._onTouchEnd);
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
    this._listen(this._scroller, 'click', this._onClick);
  }

  // 键盘导航：↑↓ 移动活跃项（滚动入视）+ Enter 触发 itemclick
  _bindKeydown() {
    this._onKeydown = (e) => {
      if (!this.data.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const cur = this._activeIndex ?? -1;
        let next;
        if (e.key === 'ArrowDown') next = Math.min(cur + 1, this.data.length - 1);
        else next = Math.max(cur - 1, 0);
        if (next === cur) return;
        this._activeIndex = next;
        this._scrollToIndex(next);
        this._updateAriaActive(next);
      } else if (e.key === 'Enter') {
        const idx = this._activeIndex;
        if (idx != null && this.data[idx] != null) {
          e.preventDefault();
          this.emit('af-list:itemclick', { index: idx, item: this.data[idx] });
        }
      }
    };
    this._listen(this._scroller, 'keydown', this._onKeydown);
  }

  // 滚动使指定索引项进入视口（虚拟滚动下会触发 scroll→_updateViewport 重渲染）
  _scrollToIndex(idx) {
    const itemH = this.itemHeight;
    const scrollTop = this._scroller.scrollTop;
    const viewportH = this._scroller.clientHeight;
    const itemTop = idx * itemH;
    const itemBottom = itemTop + itemH;
    if (itemTop < scrollTop) {
      this._scroller.scrollTop = itemTop;
    } else if (itemBottom > scrollTop + viewportH) {
      this._scroller.scrollTop = itemBottom - viewportH;
    }
  }

  // 更新 aria-activedescendant 指向当前活跃项（仅当该项已渲染时）
  _updateAriaActive(idx) {
    const item = this._viewport.querySelector(`[data-list-index="${idx}"]`);
    if (item) {
      if (!item.id) item.id = `af-list-item-${idx}`;
      this._scroller.setAttribute('aria-activedescendant', item.id);
    }
  }

  onAttributeChange(name, oldVal, newVal) {
    if (!this._scroller) return;
    // data/mode/item-height/empty-text 变化会让可见区内容或 spacer 高度改变，
    // 必须失效 _updateViewport 的 startIndex/endIndex 缓存，否则滚动位置不变时早返回导致旧内容残留
    if (name === 'data' || name === 'mode' || name === 'item-height' || name === 'empty-text') {
      this._prevStart = -1;
      this._prevEnd = -1;
    }
    if (name === 'height') {
      this._applyHeight();
    } else {
      this._render();
    }
    // 重渲染后更新 i18n 文本（aria-label 总数 / 空态文案 / loadmore 状态文本）
    this._applyI18n();
  }

  unmounted() {
    if (this._scrollRaf) { cancelAnimationFrame(this._scrollRaf); this._scrollRaf = null; }
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfList.prototype, 'data', []);
AfElement.defineProp(AfList.prototype, 'pageSize', 20);
AfElement.defineProp(AfList.prototype, 'itemHeight', 48);
AfElement.defineProp(AfList.prototype, 'buffer', 5);
AfElement.defineProp(AfList.prototype, 'mode', 'normal');
AfElement.defineProp(AfList.prototype, 'refresh', true);
AfElement.defineProp(AfList.prototype, 'loading', false);
AfElement.defineProp(AfList.prototype, 'emptyText', null);
AfElement.defineProp(AfList.prototype, 'height', '');
