// AIFlow UI —— af-dropdown：下拉菜单
// Light DOM，复用 L2 .input/.list/.list-item 配方 + 原生 popover API
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';
import { withI18n } from '../lib/with-i18n.js';

export class AfDropdown extends withI18n(AfElement) {
  static useShadow = false;
  // i18n 映射表：trigger 内 .flex-1 textContent，selectedLabel > placeholder > 字典兜底
  static i18n = {
    '.af-dropdown-trigger > .flex-1': ['', (host, t) =>
      host.selectedLabel || host.placeholder || t('dd.ph')
    ],
  };

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
    this._listen(this._trigger, 'click', this._onTriggerClick);

    this._onListClick = (e) => {
      const item = e.target.closest('.list-item');
      if (!item || item.disabled) return;
      const idx = Number(item.dataset.idx);
      const option = this.options[idx];
      if (!option) return;
      this.value = option.value;
      this._updateTrigger();
      this._list.hidePopover();
      this.emit('af-dropdown:select', { index: idx, value: option.value });
    };
    this._listen(this._list, 'click', this._onListClick);

    this._onToggle = (e) => {
      this._trigger.setAttribute('aria-expanded', String(e.newState === 'open'));
      if (e.newState === 'open') {
        // 打开后移焦入 listbox 首项（与 af-action-sheet 一致）
        this._rafId = requestAnimationFrame(() => {
          this._rafId = null;
          const first = this._list.querySelector('.list-item');
          if (first && !first.disabled) first.focus();
        });
      } else if (e.newState === 'closed') {
        // 焦点还原到触发器（覆盖 light dismiss：点遮罩/Esc 绕过 close() 的场景）
        this._trigger?.focus();
        this.emit('af-dropdown:close', {});
      }
    };
    this._listen(this._list, 'toggle', this._onToggle);

    // 方向键导航（WAI-ARIA combobox 期望 ↑↓ 选择）
    this._onKeydown = (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const items = [...this._list.querySelectorAll('.list-item')].filter(it => !it.disabled);
      if (!items.length) return;
      const cur = document.activeElement;
      let idx = items.indexOf(cur);
      if (e.key === 'ArrowDown') idx = idx < 0 ? 0 : Math.min(idx + 1, items.length - 1);
      else idx = idx <= 0 ? items.length - 1 : idx - 1;
      items[idx].focus();
    };
    this._listen(this._list, 'keydown', this._onKeydown);
  }

  _render() {
    const disabledAttr = this.disabled ? ' disabled' : '';
    // 生成唯一 id 供 aria-controls 指向 listbox（WAI-ARIA combobox 规范）
    if (!this._listboxId) this._listboxId = 'af-dropdown-listbox-' + Math.random().toString(36).slice(2, 9);
    this.innerHTML = `
      <button class="${esc(this.triggerClass)} af-dropdown-trigger" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-controls="${this._listboxId}"${disabledAttr}>
        <span class="flex-1"></span>
        <span aria-hidden="true">▾</span>
      </button>
      <div class="list" popover role="listbox" id="${this._listboxId}"></div>
    `;
    this._trigger = this.$('.af-dropdown-trigger');
    this._list = this.$('.list');
    this._renderList();
  }

  // 仅重渲染列表项（保留 _list 元素及其事件监听，不关闭已打开的浮层）
  // 取舍：listbox option 用 <button role="option"> 而非纯 <div role="option">
  // —— 严格 WAI-ARIA listbox 的 option 应非 focusable（由 listbox 管理 active descendant）
  //   但移动端无 Tab 键、原生 button 的点击/禁用语义更可靠，且 ↑↓ 键导航已自实现
  _renderList() {
    if (!this._list) return;
    const opts = this.options || [];
    const itemsHtml = opts.map((opt, i) => {
      const selected = String(opt.value) === String(this.value);
      const disabled = opt.disabled ? ' disabled' : '';
      return `<button class="list-item" data-idx="${i}" role="option" aria-selected="${selected}"${disabled}><span class="flex-1">${esc(opt.label)}</span>${selected ? '<span class="text-brand">✓</span>' : ''}</button>`;
    }).join('');
    this._list.innerHTML = itemsHtml;
  }

  _updateTrigger() {
    if (!this._trigger) return;
    // textContent 由 _applyI18n 设置（selectedLabel > placeholder > t('dd.ph')）
    this._applyI18n();
    if (this.disabled) this._trigger.setAttribute('disabled', '');
    else this._trigger.removeAttribute('disabled');
  }

  open() { this._list?.showPopover(); }
  close() {
    // 焦点还原由 toggle 'closed' 处理器统一负责（覆盖 close() + light dismiss 两条路径）
    this._list?.hidePopover();
  }

  // 按属性做最小更新，避免整树重建关闭已打开的浮层 + 丢失滚动位置
  onAttributeChange(name, oldVal, newVal) {
    if (!this._trigger) return;
    if (name === 'options') {
      this._renderList();
    } else if (name === 'value') {
      this._renderList();
      this._updateTrigger();
    } else if (name === 'placeholder') {
      this._updateTrigger();
    } else if (name === 'trigger-class') {
      this._trigger.className = this.triggerClass + ' af-dropdown-trigger';
    } else if (name === 'disabled') {
      this._updateTrigger();
    }
  }

  unmounted() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfDropdown.prototype, 'options', []);
AfElement.defineProp(AfDropdown.prototype, 'value', '');
AfElement.defineProp(AfDropdown.prototype, 'placeholder', null);
AfElement.defineProp(AfDropdown.prototype, 'triggerClass', 'input');
AfElement.defineProp(AfDropdown.prototype, 'disabled', false);
