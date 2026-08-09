// AIFlow UI —— af-dropdown：下拉菜单
// Light DOM，复用 L2 .input/.list/.list-item 配方 + 原生 popover API
import { AfElement } from '../lib/af-element.js';

export class AfDropdown extends AfElement {
  static useShadow = false;

  constructor() {
    super();
  }

  get selectedLabel() {
    const opt = (this.options || []).find(o => String(o.value) === String(this.value));
    return opt ? opt.label : '';
  }

  mounted() {
    this._render();
    this._trigger = this.$('.af-dropdown-trigger');
    this._list = this.$('.list');

    this._trigger.addEventListener('click', () => {
      if (this.disabled) return;
      this._list.showPopover();
    });

    this._list.addEventListener('click', (e) => {
      const item = e.target.closest('.list-item');
      if (!item || item.disabled) return;
      const idx = Number(item.dataset.idx);
      const option = this.options[idx];
      if (!option) return;
      this.value = option.value;
      this.setAttribute('value', String(option.value));
      this._updateTrigger();
      this._list.hidePopover();
      this.emit('af-dropdown:select', { index: idx, value: option.value });
    });

    this._list.addEventListener('toggle', (e) => {
      this._trigger.setAttribute('aria-expanded', String(e.newState === 'open'));
      if (e.newState === 'closed') {
        this.emit('af-dropdown:close', {});
      }
    });
  }

  _render() {
    const opts = this.options || [];
    const itemsHtml = opts.map((opt, i) => {
      const selected = String(opt.value) === String(this.value);
      const disabled = opt.disabled ? ' disabled' : '';
      return `<button class="list-item" data-idx="${i}" role="option" aria-selected="${selected}"${disabled}><span class="flex-1">${opt.label}</span>${selected ? '<span class="text-brand">✓</span>' : ''}</button>`;
    }).join('');

    const disabledAttr = this.disabled ? ' disabled' : '';
    this.innerHTML = `
      <button class="${this.triggerClass} af-dropdown-trigger" role="combobox" aria-haspopup="listbox" aria-expanded="false"${disabledAttr}>
        <span class="flex-1">${this.selectedLabel || this.placeholder}</span>
        <span aria-hidden="true">▾</span>
      </button>
      <div class="list" popover role="listbox">${itemsHtml}</div>
    `;
  }

  _updateTrigger() {
    if (!this._trigger) return;
    const label = this.$('.af-dropdown-trigger > .flex-1');
    if (label) label.textContent = this.selectedLabel || this.placeholder;
  }

  open() { this._list?.showPopover(); }
  close() { this._list?.hidePopover(); }

  onAttributeChange(name, oldVal, newVal) {
    if (!this._trigger) return;
    this._render();
    this._trigger = this.$('.af-dropdown-trigger');
    this._list = this.$('.list');
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfDropdown.prototype, 'options', { type: Array, default: [] });
AfElement.defineProp(AfDropdown.prototype, 'value', { type: String, default: '' });
AfElement.defineProp(AfDropdown.prototype, 'placeholder', { type: String, default: '请选择' });
AfElement.defineProp(AfDropdown.prototype, 'triggerClass', { attr: 'trigger-class', type: String, default: 'input' });
AfElement.defineProp(AfDropdown.prototype, 'disabled', { type: Boolean, default: false });
