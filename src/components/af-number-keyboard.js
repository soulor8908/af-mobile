// af-mobile UI —— af-number-keyboard：数字键盘
// Shadow DOM（useShadow=true），原生 <dialog showModal> 底部弹层（与 af-picker 同范式）
// 职责：数字输入 + 删除 + random 随机布局（支付防肩窥）+ maxlength 完成 + 焦点管理
// 配对组件：af-password-input（格子展示，页面接线 value 同步）
import { AfElement } from '../lib/af-element.js';
import { withI18n } from '../lib/with-i18n.js';

const CSS = `
  :host { display: contents; }
  .kb {
    border: none;
    border-radius: var(--r-l) var(--r-l) 0;
    max-width: 100vw; width: 100%;
    margin: auto 0 0 0;
    padding: 0 0 env(safe-area-inset-bottom);
    background: var(--c-muted-bg);
    box-shadow: var(--shadow-lg);
  }
  .kb::backdrop { background: rgba(0,0,0,.4); }
  .header {
    display: flex; align-items: center; justify-content: center; position: relative;
    padding: var(--s-3) var(--s-4); border-bottom: 1px solid var(--c-border);
  }
  .title { font-size: var(--t-md); font-weight: var(--fw-medium); color: var(--c-text); }
  .close {
    position: absolute; right: var(--s-3); top: 50%; transform: translateY(-50%);
    background: none; border: none; color: var(--c-brand);
    font-size: var(--t-lg); cursor: pointer; padding: var(--s-1); line-height: 1;
  }
  .keys { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-2); padding: var(--s-3); }
  .key {
    height: var(--af-key-h, 48px);
    display: flex; align-items: center; justify-content: center;
    font-size: var(--af-key-fs, 28px); font-weight: var(--fw-medium); color: var(--c-text); font-family: inherit;
    background: var(--c-card); border: none;
    border-radius: var(--r-m); cursor: pointer;
    transition: background var(--dur-fast) var(--ease-out);
  }
  .key:active { background: var(--c-muted-bg); }
  .key:focus-visible { outline: 2px solid var(--c-brand); outline-offset: -2px; }
  .key.blank { visibility: hidden; pointer-events: none; }
  .key-del { font-size: var(--t-md); }
  @media (prefers-reduced-motion: reduce) { .key { transition: none; } }
`;

export class AfNumberKeyboard extends withI18n(AfElement) {
  static useShadow = true;
  // i18n 映射表：dialog aria-label 优先用 title，否则字典；标题/关闭/删除同理
  // .key-del 与 button.key-del 双选择器命中同一元素：分别设 aria-label 与 textContent
  static i18n = {
    '.kb':             ['aria-label', 'nk.al', 'title'],
    '.title':          ['', 'nk.al', 'title'],
    'button.close':    ['aria-label', 'nk.cl'],
    '.key-del':        ['aria-label', 'nk.del'],
    'button.key-del':  ['', 'nk.del'],
  };

  // 完整 shadow 模板（DSD 声明式封装 + mounted 动态渲染共用同一结构；keys 动态填充）
  shadowHTML() {
    return `${AfElement.cssTag(CSS, 'af-number-keyboard')}<dialog class="kb" part="keyboard" role="dialog"><div class="header" part="header"><div class="title"></div><button class="close" part="close" type="button">×</button></div><div class="keys" part="keys"></div></dialog>`;
  }

  get isOpen() { return this._kb ? this._kb.open : false; }

  mounted() {
    // DSD 已在解析阶段挂载 shadow root 时不再覆盖，仅接管事件（hydrate）
    this.shadowRoot.innerHTML ||= this.shadowHTML();
    this._kb = this.$('.kb');

    // dialog showModal 的 light dismiss：Esc 触发 cancel，backdrop 点击 target===dialog
    this._listen(this._kb, 'cancel', (e) => {
      e.preventDefault();
      this.close('esc');
    });
    this._listen(this._kb, 'click', (e) => {
      if (e.target === this._kb) this.close('backdrop');
    });
    // 焦点陷阱补强（部分浏览器原生 showModal 焦点陷阱行为不一致）
    this._listen(this._kb, 'keydown', (e) => this._trapTab(e, this._kb));

    this._renderKeys();
    this._listen(this.$('.keys'), 'click', (e) => this._onKeyClick(e));
    this._listen(this.$('.close'), 'click', () => this.close('close'));
  }

  // 渲染按键：1-9（random 时洗牌）+ 空位 + 0 + 删除
  _renderKeys() {
    const keys = this.$('.keys');
    if (!keys) return;
    let digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    if (this.random) {
      for (let i = digits.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [digits[i], digits[j]] = [digits[j], digits[i]];
      }
    }
    keys.innerHTML =
      digits.map((d) => `<button class="key" type="button" data-key="${d}">${d}</button>`).join('') +
      '<div class="key blank" aria-hidden="true"></div>' +
      '<button class="key" type="button" data-key="0">0</button>' +
      '<button class="key key-del" type="button" data-key="delete"></button>';
    this._applyI18n();
  }

  _onKeyClick(e) {
    const key = e.target.closest('.key');
    if (!key || key.classList.contains('blank')) return;
    const k = key.dataset.key;
    if (k === 'delete') {
      if (!this.value) return;
      this.value = this.value.slice(0, -1);
      this.emit('af-number-keyboard:delete', { value: this.value });
      return;
    }
    if (this.maxlength > 0 && this.value.length >= this.maxlength) return;
    this.value = this.value + k;
    this.emit('af-number-keyboard:input', { key: k, value: this.value });
    if (this.maxlength > 0 && this.value.length === this.maxlength) {
      this.emit('af-number-keyboard:complete', { value: this.value });
    }
  }

  open() {
    if (!this._kb || this._kb.open) return;
    if (this.random) this._renderKeys(); // 每次打开重新洗牌（防肩窥）
    this.saveFocus();
    this._kb.showModal();
    this._lockScroll();
  }
  close(source = 'close') {
    if (!this._kb || !this._kb.open) return;
    this._kb.close();
    this._unlockScroll();
    this.restoreFocus();
    this.emit('af-number-keyboard:close', { source });
  }

  onAttributeChange(name) {
    if (!this._kb) return;
    if (name === 'title') {
      this._applyI18n();
    } else if (name === 'random') {
      this._renderKeys();
    }
  }

  unmounted() {
    this._unlockScroll();
    if (this._kb && this._kb.open) this._kb.close();
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfNumberKeyboard.prototype, 'value', '');
AfElement.defineProp(AfNumberKeyboard.prototype, 'maxlength', 0);
AfElement.defineProp(AfNumberKeyboard.prototype, 'random', false);
AfElement.defineProp(AfNumberKeyboard.prototype, 'title', null);
