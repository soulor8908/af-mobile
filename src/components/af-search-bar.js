// af-mobile UI —— af-search-bar：搜索栏
// Light DOM，复用 L2 .search-input，内置搜索图标、清除按钮、防抖 input 事件、回车 search 事件
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';
import { withI18n } from '../lib/with-i18n.js';

const ICON = '<svg class="sb-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm6.32 8.32a1 1 0 0 1 1.36 0l3 3a1 1 0 0 1-1.36 1.36l-3-3a1 1 0 0 1 0-1.36z" fill="currentColor"/></svg>';
const CLEAR_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" width="12" height="12"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm5 13.59L13.59 15 15 13.59 17 11.59 15 9.59 13.59 8 12 9.59 10.41 8 9 9.59 11 11.59 9 13.59 10.41 15 12 13.59 14 15 13.59 17 12 15.41z" fill="currentColor"/></svg>';

export class AfSearchBar extends withI18n(AfElement) {
  static useShadow = false;
  // i18n 映射表：input placeholder 优先用属性，否则字典；清除按钮 aria-label 用字典
  // clear 按钮仅在 clearable=true 时渲染；querySelectorAll 返回空则跳过
  static i18n = {
    'input.search-input': ['placeholder', 'sb.ph', 'placeholder'],
    '.sb-clear':  ['aria-label',  'sb.clr'],
    '.sb-action': ['',            'sb.cancel', 'cancelText'],
  };

  mounted() {
    const clearBtn = this.clearable ? `<button class="sb-clear" type="button" hidden>${CLEAR_ICON}</button>` : '';
    // T0.11 Vant 对齐：外层 .sb-bar 通栏（padding 10px 12px、card 底）+ 右侧取消区（showAction）
    const actionHtml = this.showAction
      ? `<button class="sb-action" type="button">${esc(this.cancelText || '取消')}</button>`
      : '';
    this.innerHTML = `<div class="sb-bar"><div class="sb-wrap">${ICON}<input class="search-input" type="search" />${clearBtn}</div>${actionHtml}</div>`;
    this._input = this.$('.search-input');
    this._clear = this.$('.sb-clear');
    this._action = this.$('.sb-action');
    this._input.value = this.value;
    this._debounceTimer = null;
    this._bindInput();
    this._bindKeydown();
    this._bindClear();
    this._bindAction();
    this._syncClear();
  }

  _emitInput() {
    this.value = this._input.value;
    this._syncClear();
    this.emit('af-search-bar:input', { value: this.value });
  }

  _syncClear() {
    if (this._clear) this._clear.hidden = !this._input.value;
  }

  _bindInput() {
    this._onInput = () => {
      if (this.debounce > 0) {
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => this._emitInput(), this.debounce);
      } else {
        this._emitInput();
      }
    };
    this._listen(this._input, 'input', this._onInput);
  }

  _bindKeydown() {
    this._onKeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(this._debounceTimer);
        this._emitInput();
        this.emit('af-search-bar:search', { value: this.value });
      }
    };
    this._listen(this._input, 'keydown', this._onKeydown);
  }

  _bindClear() {
    if (!this._clear) return;
    this._onClear = () => {
      this._input.value = '';
      this.value = '';
      this._syncClear();
      this._input.focus();
      this.emit('af-search-bar:clear', { value: '' });
      this.emit('af-search-bar:input', { value: '' });
    };
    this._listen(this._clear, 'click', this._onClear);
  }

  _bindAction() {
    if (!this._action) return;
    this._onAction = () => {
      this.emit('af-search-bar:cancel', { value: this.value });
    };
    this._listen(this._action, 'click', this._onAction);
  }

  focus() { this._input?.focus(); }

  onAttributeChange(name) {
    if (!this._input) return;
    if (name === 'value') this._input.value = this.value;
    if (name === 'placeholder' || name === 'cancel-text') {
      this._applyI18n();
      // cancel-text 优先级高于字典：直接写 textContent（i18n 回退字典值）
      if (name === 'cancel-text' && this._action && this.cancelText) {
        this._action.textContent = this.cancelText;
      }
    }
  }

  unmounted() {
    clearTimeout(this._debounceTimer);
  }
}

AfElement.defineProp(AfSearchBar.prototype, 'value', '');
AfElement.defineProp(AfSearchBar.prototype, 'placeholder', null);
AfElement.defineProp(AfSearchBar.prototype, 'clearable', true);
AfElement.defineProp(AfSearchBar.prototype, 'debounce', 300);
AfElement.defineProp(AfSearchBar.prototype, 'showAction', false);
AfElement.defineProp(AfSearchBar.prototype, 'cancelText', null);
