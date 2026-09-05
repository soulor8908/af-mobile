// af-mobile UI —— af-swipe-cell：滑动单元格
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
    this._bindGlobalClose();
    this._bindKeydown();
    if (this.disabled) this.setAttribute('aria-disabled', 'true');
  }

  _render() {
    // 保存 slotted 子节点引用：innerHTML= 会销毁现有子节点，需在重置前抓取再搬入
    const slottedContent = this.$$('[slot="content"]');
    const slottedRight = this.$$('[slot="right"]');
    this.innerHTML = `
      <div data-role="track" tabindex="0">
        <div data-role="content"></div>
        <div data-role="right"></div>
      </div>
    `;
    this._track = this.$('[data-role="track"]');
    this._content = this.$('[data-role="content"]');
    this._right = this.$('[data-role="right"]');
    for (const n of slottedContent) this._content.appendChild(n);
    // 摊平 slot="right" 包装层：操作项直接挂到 right 区，参与 flex 拉伸/居中
    // （<div slot="right"><button>…</button></div> → [data-role="right"] 直接含 button，
    //   否则按钮被块级包装层包住，align-items:stretch 失效导致按钮不垂直居中）
    for (const n of slottedRight) {
      const items = n.children.length ? [...n.children] : [n];
      for (const it of items) this._right.appendChild(it);
    }
  }

  _bindTouch() {
    this._onTouchStart = (e) => {
      if (this.disabled) return;
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

    this._listen(this, 'touchstart', this._onTouchStart, { passive: true });
    this._listen(this, 'touchmove', this._onTouchMove, { passive: false });
    this._listen(this, 'touchend', this._onTouchEnd);
  }

  _bindClick() {
    this._onClick = (e) => {
      if (this.disabled) return;
      const action = e.target.closest('[data-action]');
      if (!action) {
        // 点击非操作区域时收起
        if (this._offset !== 0) this.close();
        return;
      }
      this.emit('af-swipe-cell:action', { action: action.dataset.action });
      this.close();
    };
    this._listen(this, 'click', this._onClick);
  }

  // T2.2 Vant 对齐：全局点击关闭——打开态下点击组件外任意区域自动收起
  // （多实例共存：各自 document 监听，_listen 登记 unmounted 自动解绑）
  _bindGlobalClose() {
    this._onDocClick = (e) => {
      if (this._offset !== 0 && !this.contains(e.target)) this.close();
    };
    this._listen(document, 'click', this._onDocClick);
  }

  _bindKeydown() {
    this._listen(this._track, 'keydown', (e) => {
      if (this.disabled) return;
      if ((e.key === 'Enter' || e.key === 'ArrowLeft') && this._offset === 0) {
        e.preventDefault();
        this.open();
      } else if ((e.key === 'Escape' || e.key === 'ArrowRight') && this._offset !== 0) {
        e.preventDefault();
        this.close();
      }
    });
  }

  open() {
    if (this.disabled || !this._right) return;
    this._offset = -this._right.offsetWidth;
    this._track.style.setProperty('--af-swipe-x', this._offset + 'px');
  }

  close() {
    this._offset = 0;
    this._track.style.setProperty('--af-swipe-x', '0px');
  }

  onAttributeChange(name) {
    if (name !== 'disabled' || !this._track) return;
    if (this.disabled) {
      this.setAttribute('aria-disabled', 'true');
      if (this._offset !== 0) this.close();
    } else {
      this.removeAttribute('aria-disabled');
    }
  }
}

AfElement.defineProp(AfSwipeCell.prototype, 'disabled', false);
