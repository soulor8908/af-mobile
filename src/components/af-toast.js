// af-mobile UI —— af-toast：轻提示
// Light DOM，模块级单例（新替旧，不排队），自动消失 + aria-live + 退场动画
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';

let instance = null;
const EXIT_ANIM_MS = 200;

export class AfToast extends AfElement {
  static useShadow = false;

  constructor() {
    super();
    this._message = '';
    this._timer = null;
    this._exiting = false;
    this._closeOnClick = false;
  }

  mounted() {
    // closeOnClick：点击 toast 主体即关闭（冒泡到宿主，unmounted 时由 _listen 自动解绑）
    this._listen(this, 'click', (e) => {
      if (this._closeOnClick && e.target.closest('.toast')) this.dismiss();
    });
  }

  get message() { return this._message; }

  show(message, options) {
    if (instance && instance !== this) instance.dismiss();
    instance = this;
    this._exiting = false;
    this._message = message;
    const opts = options && typeof options === 'object' ? options : { duration: options };
    const type = opts.type || 'info';
    const duration = opts.duration ?? this.duration;
    const closeOnClick = opts.closeOnClick === true;
    this._closeOnClick = closeOnClick;
    // T1.11 Vant 对齐：icon / loading 态切图标布局（88×88 盒、36px 图标、8px 间距）
    // icon 仅接受纯文本（emoji/字符），esc 后渲染；loading 态复用 CSS spinner 结构
    const loading = type === 'loading';
    const icon = opts.icon;
    const cls = 'toast' + (icon || loading ? ' toast-ico-box' : '') + ' toast-' + esc(type);
    const iconHtml = loading
      ? '<span class="toast-loading-ico" aria-hidden="true"></span>'
      : icon ? `<span class="toast-ico" aria-hidden="true">${esc(icon)}</span>` : '';
    // type 经模板写入（不做 HTML 解析），esc 后的字面 &lt; 等保留在 className 中，
    // 即使 type 含 <img> 也无法注入节点或逃逸 class 属性
    this.innerHTML = `<div class="${cls}" role="status" aria-live="polite">${iconHtml}${esc(message)}</div>`;
    const toastEl = this.$('.toast');
    // closeOnClick：通过 CSS 变量切换 hit-testing（Light DOM 组件禁止内联 style 属性）
    toastEl.style.setProperty('--toast-pointer-events', closeOnClick ? 'auto' : 'none');
    clearTimeout(this._timer);
    // duration > 0 才设自动关闭；duration === 0 表示常驻，需手动 dismiss()
    // （与 Vant / Ant Design Mobile 业界惯例一致，demo 中 type:loading 用法即此意图）
    if (duration > 0) {
      this._timer = setTimeout(() => this.dismiss(), duration);
    }
  }

  dismiss() {
    if (!this._message || this._exiting) return;
    this._exiting = true;
    clearTimeout(this._timer);
    const msg = this._message;
    // 退场动画：opacity 淡出后清空 innerHTML（无 toastEl 时立即清理）
    const el = this.$('.toast');
    const done = () => {
      this.innerHTML = '';
      this._message = '';
      this._exiting = false;
      if (instance === this) instance = null;
      this.emit('af-toast:dismiss', { message: msg });
    };
    if (el) {
      el.style.setProperty('--toast-transition', `opacity ${EXIT_ANIM_MS}ms var(--ease-out)`);
      el.style.setProperty('--toast-opacity', '0');
      setTimeout(done, EXIT_ANIM_MS);
    } else done();
  }

  unmounted() {
    clearTimeout(this._timer);
    if (instance === this) instance = null;
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfToast.prototype, 'duration', 2500);
