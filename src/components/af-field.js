// af-mobile UI —— af-field：结构化表单字段
// Light DOM，复用 L2 .label/.input/.textarea/.form-err 配方
// 职责：label + icon + input/textarea + 校验消息 + 帮助文本，比 .form-row 更完整
// 子元素透传：slot="input" 支持自定义控件（如 select / af-picker），无 slot 时内置 input
// T0.10 Vant 对齐：required 必填星号 / clearable 清除按钮 / showWordLimit+maxlength 字数统计 /
// slot="right" 右侧插槽 / error 12px / disabled muted 色
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';

export class AfField extends AfElement {
  static useShadow = false;

  mounted() {
    this._idCache = 'af-field-' + Math.random().toString(36).slice(2, 9);
    this._render();
    this._bindInput();
  }

  _render() {
    // required：label 前红色星号（aria-hidden，必填语义由 input required attr 承担）
    const labelHtml = this.label
      ? `<label class="label" data-role="label" for="${esc(this._idCache)}">${this.required ? '<span class="f-req" aria-hidden="true">*</span>' : ''}${esc(this.label)}</label>`
      : '';
    const iconHtml = this.icon ? `<span data-role="icon">${esc(this.icon)}</span>` : '';
    // 保存 slotted 自定义控件引用：innerHTML= 会销毁现有子节点，需在重置前抓取再搬入
    const slottedInputs = this.$$('[slot="input"]');
    const slottedRight = this.$$('[slot="right"]');
    const control = this._renderControl();
    const helpHtml = this.help ? `<div class="caption" data-role="help">${esc(this.help)}</div>` : '';
    const errHtml = this.error ? `<div class="form-err" data-role="error" role="alert">${esc(this.error)}</div>` : '';
    // word-limit：maxlength + showWordLimit 时渲染右对齐 n/max（Vant 12px 灰）
    const limitHtml = this.showWordLimit && this.maxlength > 0
      ? `<div class="f-limit" data-role="limit">${String(this.value || '').length}/${this.maxlength}</div>`
      : '';
    this.innerHTML = `
      ${labelHtml}
      <div data-role="control-wrap">
        ${iconHtml}
        ${control}
      </div>
      ${limitHtml}
      ${helpHtml}
      ${errHtml}
    `;
    // 把 slotted 自定义控件搬入 control-wrap（保留外部引用与事件）
    if (slottedInputs.length || slottedRight.length) {
      const wrap = this.$('[data-role="control-wrap"]');
      for (const n of slottedInputs) wrap.appendChild(n);
      for (const n of slottedRight) wrap.appendChild(n);
    }
    this._input = this.$('[data-role="input"]');
    this._errorEl = this.$('[data-role="error"]');
    if (this._input && this.error) this._input.classList.add('input-err');
    this._syncClear();
  }

  _renderControl() {
    // 用户可透传 slot="input" 自定义控件；否则内置 input/textarea
    const slotted = this.$$('[slot="input"]');
    if (slotted.length) return '';
    const isTextarea = this.type === 'textarea';
    const cls = isTextarea ? 'textarea' : 'input';
    const tag = isTextarea ? 'textarea' : 'input';
    const typeAttr = isTextarea ? '' : ` type="${esc(this.inputType)}"`;
    const valueAttr = isTextarea ? '' : ` value="${esc(this.value)}"`;
    const placeholder = this.placeholder ? ` placeholder="${esc(this.placeholder)}"` : '';
    const disabled = this.disabled ? ' disabled' : '';
    const readonly = this.readonly ? ' readonly' : '';
    const required = this.required ? ' required' : '';
    const maxlength = this.maxlength > 0 ? ` maxlength="${this.maxlength}"` : '';
    return `<${tag} class="${cls}" data-role="input" id="${esc(this._idCache)}"${typeAttr}${valueAttr}${placeholder}${disabled}${readonly}${required}${maxlength} aria-label="${esc(this.label || this.ariaLabel)}"></${tag}>`;
  }

  _bindInput() {
    if (!this._input) return;
    this._onInput = () => {
      this.value = this._input.value;
      this._syncClear();
      this._syncLimit();
      this.emit('af-field:input', { value: this.value });
    };
    this._onChange = () => {
      this.value = this._input.value;
      this.emit('af-field:change', { value: this.value });
    };
    this._listen(this._input, 'input', this._onInput);
    this._listen(this._input, 'change', this._onChange);
    // clearable：清除按钮（事件委托，重渲染后仍可用）。
    // 必须用实例具名 handler：升级期 attributeChangedCallback 与 mounted 会两次调 _bindInput，
    // 匿名函数会双注册；同引用 _listen + DOM addEventListener 自动去重
    this._onClearClick ??= (e) => {
      if (!e.target.closest('.f-clear') || !this._input) return;
      this._input.value = '';
      this.value = '';
      this._syncClear();
      this._syncLimit();
      this.emit('af-field:input', { value: '' });
      this.emit('af-field:change', { value: '' });
      this._input.focus();
    };
    this._listen(this, 'click', this._onClearClick);
  }

  // clearable：有值且非 disabled/readonly 时显示清除按钮（data-clear 属性驱动 input 右留白）
  _syncClear() {
    const wrap = this.$('[data-role="control-wrap"]');
    if (!wrap) return;
    const has = this.$('.f-clear');
    const need = this.clearable && !this.disabled && !this.readonly && !!this._input?.value;
    if (need && !has) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'f-clear';
      btn.setAttribute('aria-label', '清空');
      btn.textContent = '×';
      wrap.appendChild(btn);
    } else if (!need && has) {
      has.remove();
    }
    if (this.$('.f-clear')) wrap.setAttribute('data-clear', '');
    else wrap.removeAttribute('data-clear');
  }

  // word-limit：n/max 同步
  _syncLimit() {
    const el = this.$('[data-role="limit"]');
    if (el) el.textContent = `${String(this.value || '').length}/${this.maxlength}`;
  }

  setError(msg) {
    this.error = msg || '';
    if (this._errorEl) {
      if (msg) {
        this._errorEl.textContent = msg;
        this._errorEl.hidden = false;
      } else {
        this._errorEl.hidden = true;
      }
    } else if (msg) {
      const div = document.createElement('div');
      div.className = 'form-err';
      div.dataset.role = 'error';
      div.setAttribute('role', 'alert');
      div.textContent = msg;
      this.appendChild(div);
      this._errorEl = div;
    }
    if (this._input) this._input.classList.toggle('input-err', !!msg);
  }

  focus() { this._input?.focus(); }

  onAttributeChange(name) {
    if (!this.$root) return;
    if (name === 'label' || name === 'icon' || name === 'type' || name === 'input-type' || name === 'help'
      || name === 'required' || name === 'maxlength' || name === 'show-word-limit') {
      this._render();
      this._bindInput();
    } else if (name === 'value') {
      if (this._input) this._input.value = this.value;
      this._syncClear();
      this._syncLimit();
    } else if (name === 'placeholder') {
      if (this._input) this._input.placeholder = this.placeholder;
    } else if (name === 'disabled') {
      if (this._input) this._input.disabled = this.disabled;
      this._syncClear();
    } else if (name === 'readonly') {
      if (this._input) this._input.readOnly = this.readonly;
      this._syncClear();
    } else if (name === 'error') {
      this.setError(this.error);
    }
  }
}

AfElement.defineProp(AfField.prototype, 'label', '');
AfElement.defineProp(AfField.prototype, 'icon', '');
AfElement.defineProp(AfField.prototype, 'type', 'input');
AfElement.defineProp(AfField.prototype, 'inputType', 'text');
AfElement.defineProp(AfField.prototype, 'value', '');
AfElement.defineProp(AfField.prototype, 'placeholder', '');
AfElement.defineProp(AfField.prototype, 'help', '');
AfElement.defineProp(AfField.prototype, 'error', '');
AfElement.defineProp(AfField.prototype, 'disabled', false);
AfElement.defineProp(AfField.prototype, 'readonly', false);
AfElement.defineProp(AfField.prototype, 'ariaLabel', '');
AfElement.defineProp(AfField.prototype, 'required', false);
AfElement.defineProp(AfField.prototype, 'clearable', false);
AfElement.defineProp(AfField.prototype, 'showWordLimit', { attr: 'show-word-limit', default: false });
AfElement.defineProp(AfField.prototype, 'maxlength', 0);
