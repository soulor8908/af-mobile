// af-mobile UI —— af-rate：评分
// Light DOM，复用 L2 .rate 配方（radio + row-reverse 只读/可选）；value/max/readonly/size，键盘原生支持
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';

let rateSeq = 0;

export class AfRate extends AfElement {
  static useShadow = false;

  mounted() {
    this._render();
    this._bindChange();
    this._updateChecked();
  }

  _render() {
    const uid = `af-rate-${++rateSeq}`;
    const sizeClass = this.size === 'sm' ? ' rate-sm' : this.size === 'lg' ? ' rate-lg' : '';
    let stars = '';
    // DOM 逆序（5→1）+ row-reverse → 视觉 1→5；checked 星 + 其后（低值）星同亮
    for (let i = this.max; i >= 1; i--) {
      stars += `<input type="radio" name="${uid}" id="${uid}-${i}" value="${i}"${this.readonly || this.disabled ? ' disabled' : ''}><label for="${uid}-${i}" class="rate-star">★</label>`;
    }
    this.innerHTML = `<div class="rate${sizeClass}${this.readonly ? ' rate-ro' : ''}${this.disabled ? ' rate-dis' : ''}" data-role="rate" role="radiogroup" aria-label="${esc(this.label)}">${stars}</div>`;
  }

  _updateChecked() {
    const group = this.$('[data-role="rate"]');
    if (!group) return;
    const v = this.value;
    const target = Math.round(v);
    // T2.8 半星：value 含 .5 时高位星（ceil）半亮；整数点击后自动消失
    const halfIdx = Number.isInteger(v) ? -1 : Math.ceil(v);
    for (const el of group.querySelectorAll('input, .rate-star')) {
      const val = Number(el.value);
      if (el.tagName === 'INPUT') el.checked = val === target;
      else el.classList.toggle('rate-half', val === halfIdx);
    }
  }

  _bindChange() {
    this._onChange = (e) => {
      const input = e.target.closest('input[type="radio"]');
      if (!input) return;
      const v = Number(input.value);
      if (v !== this.value) {
        this.value = v;
        this.emit('af-rate:change', { value: v });
      }
    };
    this._listen(this, 'change', this._onChange);
  }

  onAttributeChange(name) {
    if (name === 'value') {
      this._updateChecked();
    } else if (name === 'readonly' || name === 'max' || name === 'size' || name === 'disabled') {
      this._render();
      this._updateChecked();
    }
  }
}

AfElement.defineProp(AfRate.prototype, 'value', 0);
AfElement.defineProp(AfRate.prototype, 'max', 5);
AfElement.defineProp(AfRate.prototype, 'readonly', false);
AfElement.defineProp(AfRate.prototype, 'disabled', false);
AfElement.defineProp(AfRate.prototype, 'size', 'md');
AfElement.defineProp(AfRate.prototype, 'label', '评分');
