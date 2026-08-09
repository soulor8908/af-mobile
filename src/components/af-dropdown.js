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
    this._bindEvents();
  }

  _bindEvents() {
    this._onTriggerClick = () => {
      if (this.disabled) return;
      this._list.showPopover();
    };
    this._trigger.addEventListener('click', this._onTriggerClick);

    this._onListClick = (e) => {
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
    };
    this._list.addEventListener('click', this._onListClick);

    this._onToggle = (e) => {
      this._trigger.setAttribute('aria-expanded', String(e.newState === 'open'));
      if (e.newState === 'closed') {
        this.emit('af-dropdown:close', {});
      }
    };
    this._list.addEventListener('toggle', this._onToggle);
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
    this._trigger = this.$('.af-dropdown-trigger');
    this._list = this.$('.list');
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
    this._bindEvents();
  }

  unmounted() {
    // Light DOM 元素随组件销毁，removeEventListener 是为通过 wc-cleanup 检测
    this._trigger?.removeEventListener('click', this._onTriggerClick);
    this._list?.removeEventListener('click', this._onListClick);
    this._list?.removeEventListener('toggle', this._onToggle);
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfDropdown.prototype, 'options', { type: Array, default: [] });
AfElement.defineProp(AfDropdown.prototype, 'value', { type: String, default: '' });
AfElement.defineProp(AfDropdown.prototype, 'placeholder', { type: String, default: '请选择' });
AfElement.defineProp(AfDropdown.prototype, 'triggerClass', { attr: 'trigger-class', type: String, default: 'input' });
AfElement.defineProp(AfDropdown.prototype, 'disabled', { type: Boolean, default: false });
