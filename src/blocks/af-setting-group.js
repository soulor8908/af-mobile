// af-mobile UI —— L3.5 Block：af-setting-group（设置分组）
// Light DOM，五态（loading/error/empty/success）+ a11y + 键盘导航（骨架复用 list-block.js）
// variant: default / with-switch / with-value
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';
import { withI18n } from '../lib/with-i18n.js';
import { withBlockList, ARROW } from './list-block.js';

export class AfSettingGroup extends withBlockList(withI18n(AfElement), 'af-setting-group') {
  static i18n = {
    '@': ['aria-label', 'sg.al'],
    '[data-role="empty-text"]': ['', 'sg.em'],
    '[data-role="loading-text"]': ['', 'sg.ld'],
    '[data-role="error-text"]': ['', 'sg.er'],
    '[data-role="retry-btn"]': ['', 'sg.rt'],
  };

  _renderItem(item, i) {
    const dis = item.disabled ? ' aria-disabled="true"' : '';
    const icon = item.icon ? `<span class="caption" aria-hidden="true">${esc(item.icon)}</span>` : '';
    const label = `<span class="body">${esc(item.label ?? '')}</span>`;
    let tail = '';
    if (this.variant === 'with-switch') {
      const c = item.checked ? ' checked' : '';
      const d = item.disabled ? ' disabled' : '';
      tail = `<af-switch${c}${d} data-index="${i}" aria-label="${esc(item.label ?? '')}"></af-switch>`;
    } else if (this.variant === 'with-value' || item.value != null) {
      tail = `<span class="caption t-right">${esc(item.value ?? '')}</span><span class="caption" aria-hidden="true">${ARROW}</span>`;
    } else if (item.action === 'arrow') {
      tail = `<span class="caption" aria-hidden="true">${ARROW}</span>`;
    }
    return `<div class="list-item" role="listitem" data-index="${i}" tabindex="-1"${dis}>${icon}${label}${tail}</div>`;
  }

  // 基座点击绑定 + with-switch 变体的 af-switch:change 转发
  _bindItemClicks() {
    super._bindItemClicks();
    if (this.variant === 'with-switch') {
      this.$$('af-switch').forEach((sw) => {
        const idx = Number(sw.dataset.index);
        this._listen(sw, 'af-switch:change', (e) => {
          e.stopPropagation();
          this.emit('af-setting-group:change', { index: idx, checked: e.detail.checked, item: this.items[idx] });
        });
      });
    }
  }

  onAttributeChange(name) {
    if (!this._mounted) return;
    if (name === 'variant' || name === 'items' || name === 'title' || name === 'loading') {
      this._render();
      this._applyI18n();
    }
  }
}

// variant: default / with-switch / with-value
AfElement.defineProp(AfSettingGroup.prototype, 'variant', 'default');
AfElement.defineProp(AfSettingGroup.prototype, 'title', '');
AfElement.defineProp(AfSettingGroup.prototype, 'items', []);
AfElement.defineProp(AfSettingGroup.prototype, 'loading', false);
