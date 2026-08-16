// AIFlow UI —— af-stepper：数量选择器
// Light DOM，复用 L2 .btn 配方；min/max/step/禁用态，比 input[type=number] 体验更好
// 职责：±按钮 + 数值边界 + 步长 + 禁用态 + 键盘可访问
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';
import { withI18n } from '../lib/with-i18n.js';

export class AfStepper extends withI18n(AfElement) {
  static useShadow = false;
  // i18n 映射表：减/加按钮 aria-label 用字典；input aria-label 优先用属性，否则字典
  static i18n = {
    '[data-role="minus"]': ['aria-label', 'st.mn'],
    '[data-role="plus"]':  ['aria-label', 'st.pl'],
    '[data-role="input"]': ['aria-label', 'st.al', 'ariaLabel'],
  };

  mounted() {
    this.innerHTML = `
      <button class="btn btn-ghost btn-sm" data-role="minus" type="button"${this._minusDisabled() ? ' disabled' : ''}>-</button>
      <input class="input" data-role="input" type="number" inputmode="numeric" value="${esc(this.value)}" min="${esc(this.min)}" max="${esc(this.max)}" step="${esc(this.step)}"${this.disabled ? ' disabled' : ''} />
      <button class="btn btn-ghost btn-sm" data-role="plus" type="button"${this._plusDisabled() ? ' disabled' : ''}>+</button>
    `;
    this._minusBtn = this.$('[data-role="minus"]');
    this._plusBtn = this.$('[data-role="plus"]');
    this._input = this.$('[data-role="input"]');
    this._bindClick();
    this._bindInput();
  }

  _minusDisabled() {
    return this.disabled || (this.value - this.step < this.min);
  }
  _plusDisabled() {
    return this.disabled || (this.value + this.step > this.max);
  }

  _clamp(v) {
    if (Number.isNaN(v)) return this.value;
    const stepped = Math.round((v - this.min) / this.step) * this.step + this.min;
    return Math.min(this.max, Math.max(this.min, stepped));
  }

  setValue(v, silent = false) {
    const next = this._clamp(v);
    if (next === this.value) return;
    this.value = next;
    if (this._input) this._input.value = String(next);
    this._updateDisabled();
    if (!silent) this.emit('af-stepper:change', { value: next });
  }

  _updateDisabled() {
    if (!this._minusBtn) return;
    this._minusBtn.disabled = this._minusDisabled();
    this._plusBtn.disabled = this._plusDisabled();
    this._input.disabled = this.disabled;
  }

  _bindClick() {
    this._onClick = (e) => {
      const btn = e.target.closest('[data-role]');
      if (!btn) return;
      const role = btn.dataset.role;
      if (role === 'minus') this.setValue(this.value - this.step);
      else if (role === 'plus') this.setValue(this.value + this.step);
    };
    this._listen(this, 'click', this._onClick);
  }

  _bindInput() {
    this._onChange = () => {
      const raw = this._input.value;
      // type=number 输入非法值时浏览器清空 value（''），Number('')=0 会误触发 setValue
      // 空串或 NaN 都视为无效，回退到当前值
      if (raw === '') { this._input.value = String(this.value); return; }
      const v = Number(raw);
      if (!Number.isNaN(v)) this.setValue(v);
      else this._input.value = String(this.value);
    };
    this._listen(this._input, 'change', this._onChange);
  }

  onAttributeChange(name) {
    if (!this._input) return;
    if (name === 'value' || name === 'min' || name === 'max' || name === 'step' || name === 'disabled') {
      this._input.value = String(this.value);
      this._input.min = String(this.min);
      this._input.max = String(this.max);
      this._input.step = String(this.step);
      this._updateDisabled();
    } else if (name === 'aria-label') {
      this._applyI18n();
    }
  }
}

AfElement.defineProp(AfStepper.prototype, 'value', 0);
AfElement.defineProp(AfStepper.prototype, 'min', 0);
AfElement.defineProp(AfStepper.prototype, 'max', 99);
AfElement.defineProp(AfStepper.prototype, 'step', 1);
AfElement.defineProp(AfStepper.prototype, 'disabled', false);
AfElement.defineProp(AfStepper.prototype, 'ariaLabel', null);
