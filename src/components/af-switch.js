// af-mobile UI —— af-switch：开关切换
// Light DOM，role=switch，支持 loading 禁用态与 size 变体
import { AfElement } from '../lib/af-element.js';

export class AfSwitch extends AfElement {
  static useShadow = false;

  mounted() {
    this._render();
    this._btn = this.$('.switch');
    this._bindClick();
    this._bindKeydown();
    this._updateView();
  }

  _render() {
    const sizeClass = this.size === 'sm' ? ' switch-sm' : '';
    this.innerHTML = `<button class="switch${sizeClass}" role="switch" aria-checked="${this.checked}" tabindex="0"${this.disabled || this.loading ? ' disabled' : ''}><span class="switch-thumb"></span></button>`;
  }

  toggle(force) {
    const next = force != null ? force : !this.checked;
    if (next === this.checked || this.disabled || this.loading) return;
    this.checked = next;
    this._updateView();
    this.emit('af-switch:change', { checked: next });
  }

  _updateView() {
    if (!this._btn) return;
    this._btn.setAttribute('aria-checked', String(this.checked));
    this._btn.classList.toggle('switch-on', this.checked);
    this._btn.disabled = this.disabled || this.loading;
    this._btn.classList.toggle('switch-loading', this.loading);
  }

  _bindClick() {
    this._onClick = () => this.toggle();
    this._listen(this._btn, 'click', this._onClick);
  }

  _bindKeydown() {
    this._onKeydown = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.toggle();
      }
    };
    this._listen(this._btn, 'keydown', this._onKeydown);
  }

  onAttributeChange(name) {
    if (!this._btn) return;
    if (name === 'checked' || name === 'disabled' || name === 'loading') {
      this._updateView();
    } else if (name === 'size') {
      this._render();
      this._btn = this.$('.switch');
    }
  }
}

AfElement.defineProp(AfSwitch.prototype, 'checked', false);
AfElement.defineProp(AfSwitch.prototype, 'disabled', false);
AfElement.defineProp(AfSwitch.prototype, 'loading', false);
AfElement.defineProp(AfSwitch.prototype, 'size', 'md');
