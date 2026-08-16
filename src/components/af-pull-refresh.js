// AIFlow UI —— af-pull-refresh：下拉刷新容器
// Light DOM，复用 L2 .skeleton/.spinner/.empty 配方
// 职责：触摸下拉刷新 + 阻尼系数 + 阈值激活 + 加载态指示器
// 用法：<af-pull-refresh><div class="list">...</div></af-pull-refresh>
import { AfElement } from '../lib/af-element.js';
import { t } from '../lib/i18n.js';
import { withI18n } from '../lib/with-i18n.js';

const THRESHOLD = 60;
const MAX_PULL = 100;

export class AfPullRefresh extends withI18n(AfElement) {
  static useShadow = false;
  static i18n = {
    '[data-role="indicator"]': ['aria-label', (host, t) => {
      if (host.refreshing) return t('pr.ld');
      const h = parseFloat(host._indicator?.style.getPropertyValue('--af-pull-h')) || 0;
      return h >= THRESHOLD ? t('pr.rl') : t('pr.pl');
    }],
  };

  constructor() {
    super();
    this._pulling = false;
    this._startY = 0;
  }

  mounted() {
    // 保存 slotted 子节点引用：innerHTML= 会销毁现有子节点，需在重置前抓取再搬入
    const slotted = [...this.childNodes].filter((n) =>
      n.nodeType !== Node.TEXT_NODE || n.textContent.trim()
    );
    this.innerHTML = `
      <div data-role="indicator" aria-live="polite" hidden></div>
      <div data-role="content"></div>
    `;
    this._indicator = this.$('[data-role="indicator"]');
    this._content = this.$('[data-role="content"]');
    // 把 slotted 子节点搬入 content 容器（保留外部引用与事件）
    for (const node of slotted) this._content.appendChild(node);
    this._bindTouch();
  }

  _bindTouch() {
    this._onTouchStart = (e) => {
      if (this.refreshing) return;
      // 仅在内容顶部（scrollTop=0）时启动下拉
      const scroller = this._content;
      if (scroller && scroller.scrollTop > 0) return;
      this._pulling = true;
      this._startY = e.touches[0].clientY;
    };

    this._onTouchMove = (e) => {
      if (!this._pulling) return;
      const deltaY = e.touches[0].clientY - this._startY;
      if (deltaY <= 0) {
        this._setPull(0);
        return;
      }
      // 阻尼：超出 MAX_PULL 后衰减
      const damped = deltaY <= MAX_PULL ? deltaY * 0.5 : MAX_PULL * 0.5 + (deltaY - MAX_PULL) * 0.2;
      this._setPull(damped);
      // 下拉过程中阻止页面滚动
      if (e.cancelable) e.preventDefault();
    };

    this._onTouchEnd = () => {
      if (!this._pulling) return;
      this._pulling = false;
      const height = parseFloat(this._indicator.style.getPropertyValue('--af-pull-h')) || 0;
      if (height >= THRESHOLD) {
        this._startRefresh();
      } else {
        this._setPull(0);
      }
    };

    this._listen(this, 'touchstart', this._onTouchStart, { passive: true });
    this._listen(this, 'touchmove', this._onTouchMove, { passive: false });
    this._listen(this, 'touchend', this._onTouchEnd);
  }

  _setPull(h) {
    if (!this._indicator) return;
    this._indicator.style.setProperty('--af-pull-h', h + 'px');
    this._indicator.hidden = h <= 0;
    if (h > 0) {
      this._indicator.setAttribute('aria-label',
        this.refreshing ? t('pr.ld') : (h >= THRESHOLD ? t('pr.rl') : t('pr.pl'))
      );
    }
  }

  _startRefresh() {
    // 防重入：refreshing=true 会触发 onAttributeChange → _startRefresh，需阻止二次调用
    if (this.refreshing) return;
    this.refreshing = true;
    this._setPull(THRESHOLD);
    this._indicator.innerHTML = `<span class="spinner spinner-sm"></span><span class="caption">${t('pr.ld')}</span>`;
    this.emit('af-pull-refresh:refresh', {});
  }

  endRefresh() {
    this.refreshing = false;
    this._indicator.innerHTML = '';
    this._setPull(0);
  }

  onAttributeChange(name) {
    if (name === 'refreshing') {
      if (this.refreshing && !this._pulling) this._startRefresh();
      else if (!this.refreshing) this._setPull(0);
    }
  }
}

AfElement.defineProp(AfPullRefresh.prototype, 'refreshing', false);
