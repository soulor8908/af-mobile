// AIFlow UI —— af-field：结构化表单字段
// Light DOM，复用 L2 .label/.input/.textarea/.form-err 配方
// 职责：label + icon + input/textarea + 校验消息 + 帮助文本，比 .form-row 更完整
// 子元素透传：slot="input" 支持自定义控件（如 select / af-picker），无 slot 时内置 input
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';

export class AfField extends AfElement {
  static useShadow = false;

  mounted() {
    this._idCache = 'af-field-' + Math.random().toString(36).slice(2, 9);
    this._render();
    this._bindInput();
  }

  _render() {
    const labelHtml = this.label
      ? `<label class="label" data-role="label" for="${esc(this._idCache)}">${esc(this.label)}</label>`
      : '';
    const iconHtml = this.icon ? `<span data-role="icon">${esc(this.icon)}</span>` : '';
    // 保存 slotted 自定义控件引用：innerHTML= 会销毁现有子节点，需在重置前抓取再搬入
    const slottedInputs = this.$$('[slot="input"]');
    const control = this._renderControl();
    const helpHtml = this.help ? `<div class="caption" data-role="help">${esc(this.help)}</div>` : '';
    const errHtml = this.error ? `<div class="form-err" data-role="error" role="alert">${esc(this.error)}</div>` : '';
    this.innerHTML = `
      ${labelHtml}
      <div data-role="control-wrap">
        ${iconHtml}
        ${control}
      </div>
      ${helpHtml}
      ${errHtml}
    `;
    // 把 slotted 自定义控件搬入 control-wrap（保留外部引用与事件）
    if (slottedInputs.length) {
      const wrap = this.$('[data-role="control-wrap"]');
      for (const n of slottedInputs) wrap.appendChild(n);
    }
    this._input = this.$('[data-role="input"]');
    this._errorEl = this.$('[data-role="error"]');
    if (this._input && this.error) this._input.classList.add('input-err');
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
    return `<${tag} class="${cls}" data-role="input" id="${esc(this._idCache)}"${typeAttr}${valueAttr}${placeholder}${disabled}${readonly} aria-label="${esc(this.label || this.ariaLabel)}"></${tag}>`;
  }

  _bindInput() {
    if (!this._input) return;
    this._onInput = () => {
      this.value = this._input.value;
      this.emit('af-field:input', { value: this.value });
    };
    this._onChange = () => {
      this.value = this._input.value;
      this.emit('af-field:change', { value: this.value });
    };
    this._input.addEventListener('input', this._onInput);
    this._input.addEventListener('change', this._onChange);
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
    if (name === 'label' || name === 'icon' || name === 'type' || name === 'input-type' || name === 'help') {
      this._render();
      this._bindInput();
    } else if (name === 'value') {
      if (this._input) this._input.value = this.value;
    } else if (name === 'placeholder') {
      if (this._input) this._input.placeholder = this.placeholder;
    } else if (name === 'disabled') {
      if (this._input) this._input.disabled = this.disabled;
    } else if (name === 'readonly') {
      if (this._input) this._input.readOnly = this.readonly;
    } else if (name === 'error') {
      this.setError(this.error);
    }
  }

  unmounted() {
    this._input?.removeEventListener('input', this._onInput);
    this._input?.removeEventListener('change', this._onChange);
  }
}

AfElement.defineProp(AfField.prototype, 'label', { type: String, default: '' });
AfElement.defineProp(AfField.prototype, 'icon', { type: String, default: '' });
AfElement.defineProp(AfField.prototype, 'type', { type: String, default: 'input' });
AfElement.defineProp(AfField.prototype, 'inputType', { attr: 'input-type', type: String, default: 'text' });
AfElement.defineProp(AfField.prototype, 'value', { type: String, default: '' });
AfElement.defineProp(AfField.prototype, 'placeholder', { type: String, default: '' });
AfElement.defineProp(AfField.prototype, 'help', { type: String, default: '' });
AfElement.defineProp(AfField.prototype, 'error', { type: String, default: '' });
AfElement.defineProp(AfField.prototype, 'disabled', { type: Boolean, default: false });
AfElement.defineProp(AfField.prototype, 'readonly', { type: Boolean, default: false });
AfElement.defineProp(AfField.prototype, 'ariaLabel', { attr: 'aria-label', type: String, default: '' });
