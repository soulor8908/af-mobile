// af-mobile UI —— af-password-input：密码/验证码格子输入
// Shadow DOM（useShadow=true），纯展示组件：格子 + 掩码圆点 + focused 光标
// 输入由 af-number-keyboard 驱动（页面接线：键盘 input/delete 事件 → value 同步；
// 点击组件时打开键盘并设 focused=true，键盘 close 时设 focused=false）
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';
import { withI18n } from '../lib/with-i18n.js';

const CSS = `
  :host {
    /* 结构尺寸走组件级变量：消费端可覆盖 --af-pi-cell-w 等定制格子 */
    --af-pi-cell-w: 44px;
    --af-pi-cell-h: 50px;
    --af-pi-gap: var(--s-3);
    --af-pi-dot: 10px;
    --af-pi-caret-w: 1px;
    --af-pi-border-w: 1px;
    display: inline-block;
  }
  .cells { display: flex; gap: var(--af-pi-gap); }
  .cell {
    display: flex; align-items: center; justify-content: center;
    width: var(--af-pi-cell-w); height: var(--af-pi-cell-h);
    background: var(--c-card);
    border: var(--af-pi-border-w) solid var(--c-border);
    border-radius: var(--r-s);
    font-size: var(--t-xl); font-weight: var(--fw-semibold); color: var(--c-text); font-family: inherit;
  }
  .dot { width: var(--af-pi-dot); height: var(--af-pi-dot); border-radius: var(--r-f); background: var(--c-text); }
  .caret {
    width: var(--af-pi-caret-w); height: 40%;
    background: var(--c-brand);
    animation: af-pi-blink 1s step-end infinite;
  }
  @keyframes af-pi-blink { 50% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .caret { animation: none; } }
  /* T1.12 Vant 对齐：info 提示行（error-info 红色优先）；：empty 时隐藏 */
  .info { margin-top: var(--s-2); font-size: var(--t-md); color: var(--c-muted); }
  .info.error { color: var(--c-danger); }
  .info:empty { display: none; }
`;

export class AfPasswordInput extends withI18n(AfElement) {
  static useShadow = true;
  // i18n 映射表：cells 容器 aria-label 带输入进度（value/length 变化时经 _applyI18n 刷新）
  static i18n = {
    '.cells': ['aria-label', (host, t) => `${t('pi.al')}，${t('pi.n', { n: (host.value || '').length, total: host.length })}`],
  };

  // 完整 shadow 模板（DSD 声明式封装 + mounted 动态渲染共用同一结构；cell 动态填充）
  shadowHTML() {
    return `${AfElement.cssTag(CSS, 'af-password-input')}<div class="cells" part="cells" role="group"></div><div class="info" part="info"></div>`;
  }

  mounted() {
    // DSD 已在解析阶段挂载 shadow root 时不再覆盖，仅接管事件（hydrate）
    this.shadowRoot.innerHTML ||= this.shadowHTML();
    this._cellsEl = this.$('.cells');
    this._render();
    this._renderInfo();
  }

  // T1.12：info/error-info 提示行（error 优先，红色）；空文案时 ：empty 隐藏
  _renderInfo() {
    const el = this.$('.info');
    if (!el) return;
    const err = this.errorInfo;
    el.textContent = err || this.info || '';
    el.classList.toggle('error', Boolean(err));
  }

  _render() {
    if (!this._cellsEl) return;
    const val = this.value || '';
    const len = this.length;
    // 光标落在首个空格（focused 且未满时）；已满不显示
    const caretIdx = this.focused && val.length < len ? val.length : -1;
    let html = '';
    for (let i = 0; i < len; i++) {
      const ch = val[i];
      const inner = ch != null
        ? (this.mask ? '<span class="dot" part="dot"></span>' : esc(ch))
        : (i === caretIdx ? '<span class="caret" part="caret"></span>' : '');
      html += `<div class="cell" part="cell" data-idx="${i}">${inner}</div>`;
    }
    this._cellsEl.innerHTML = html;
    this._applyI18n();
  }

  onAttributeChange(name, oldVal, newVal) {
    if (!this._cellsEl) return;
    if (name === 'value' || name === 'length' || name === 'mask' || name === 'focused') {
      this._render();
      // 输入完成（恰好填满 length）时通知（仅挂载后，防初始属性解析误发）
      if (name === 'value' && (newVal || '').length === this.length) {
        this.emit('af-password-input:complete', { value: newVal });
      }
    } else if (name === 'info' || name === 'error-info') {
      this._renderInfo();
    }
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfPasswordInput.prototype, 'value', '');
AfElement.defineProp(AfPasswordInput.prototype, 'length', 6);
AfElement.defineProp(AfPasswordInput.prototype, 'mask', true);
AfElement.defineProp(AfPasswordInput.prototype, 'focused', false);
AfElement.defineProp(AfPasswordInput.prototype, 'info', '');
AfElement.defineProp(AfPasswordInput.prototype, 'errorInfo', '');
