// AIFlow UI —— af-swipe-cell：滑动单元格
// Light DOM，复用 L2 .list-item / .btn 配方
// 职责：左滑/右滑显示操作按钮 + 阈值吸附 + 点击收起 + 滑动方向锁定
// 用法：<af-swipe-cell><div slot="content">主内容</div><div slot="right">操作按钮</div></af-swipe-cell>
import { AfElement } from '../lib/af-element.js';

const THRESHOLD = 0.5;

export class AfSwipeCell extends AfElement {
  static useShadow = false;

  constructor() {
    super();
    this._pulling = false;
    this._startX = 0;
    this._startY = 0;
    this._offset = 0;
    this._direction = '';
  }

  mounted() {
    this._render();
    this._bindTouch();
    this._bindClick();
  }

  _render() {
    // 保存 slotted 子节点引用：innerHTML= 会销毁现有子节点，需在重置前抓取再搬入
    const slottedContent = this.$$('[slot="content"]');
    const slottedRight = this.$$('[slot="right"]');
    this.innerHTML = `
      <div data-role="track">
        <div data-role="content"></div>
        <div data-role="right"></div>
      </div>
    `;
    this._track = this.$('[data-role="track"]');
    this._content = this.$('[data-role="content"]');
    this._right = this.$('[data-role="right"]');
    for (const n of slottedContent) this._content.appendChild(n);
    for (const n of slottedRight) this._right.appendChild(n);
  }

  _bindTouch() {
    this._onTouchStart = (e) => {
      this._pulling = true;
      this._startX = e.touches[0].clientX;
      this._startY = e.touches[0].clientY;
      this._direction = '';
      // 拖拽中禁用过渡：用 data-dragging 属性让 CSS 关闭 transition（避免 setProperty 设非 CSS 变量）
      this._track.setAttribute('data-dragging', '');
    };

    this._onTouchMove = (e) => {
      if (!this._pulling) return;
      const dx = e.touches[0].clientX - this._startX;
      const dy = e.touches[0].clientY - this._startY;
      // 方向锁定：首次移动确定主轴，之后不切换
      if (!this._direction) {
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
        this._direction = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      if (this._direction === 'y') return;
      // 仅允许向左滑动显示右侧操作
      let next = dx;
      if (next > 0) next = next * 0.3;
      const maxLeft = this._right.offsetWidth;
      if (next < -maxLeft) next = -maxLeft;
      this._offset = next;
      this._track.style.setProperty('--af-swipe-x', next + 'px');
      if (e.cancelable) e.preventDefault();
    };

    this._onTouchEnd = () => {
      if (!this._pulling) return;
      this._pulling = false;
      // 恢复过渡：移除 data-dragging 属性，CSS 自动恢复 transition
      this._track.removeAttribute('data-dragging');
      if (this._direction !== 'x') return;
      const maxLeft = this._right.offsetWidth;
      const threshold = maxLeft * THRESHOLD;
      // 超过阈值吸附到完全打开，否则回弹收起
      if (this._offset <= -threshold) {
        this._offset = -maxLeft;
      } else {
        this._offset = 0;
      }
      this._track.style.setProperty('--af-swipe-x', this._offset + 'px');
    };

    this.addEventListener('touchstart', this._onTouchStart, { passive: true });
    this.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.addEventListener('touchend', this._onTouchEnd);
  }

  _bindClick() {
    this._onClick = (e) => {
      const action = e.target.closest('[data-action]');
      if (!action) {
        // 点击非操作区域时收起
        if (this._offset !== 0) this.close();
        return;
      }
      this.emit('af-swipe-cell:action', { action: action.dataset.action });
      this.close();
    };
    this.addEventListener('click', this._onClick);
  }

  open() {
    if (!this._right) return;
    this._offset = -this._right.offsetWidth;
    this._track.style.setProperty('--af-swipe-x', this._offset + 'px');
  }

  close() {
    this._offset = 0;
    this._track.style.setProperty('--af-swipe-x', '0px');
  }

  unmounted() {
    this.removeEventListener('touchstart', this._onTouchStart);
    this.removeEventListener('touchmove', this._onTouchMove);
    this.removeEventListener('touchend', this._onTouchEnd);
    this.removeEventListener('click', this._onClick);
  }
}

AfElement.defineProp(AfSwipeCell.prototype, 'disabled', { type: Boolean, default: false });
