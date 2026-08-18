// af-mobile UI —— af-badge：徽标角标
// Light DOM，复用 L2 .badge 配方；content/max/dot 控制，data-color 变体，可包裹内容作角标
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';

export class AfBadge extends AfElement {
  static useShadow = false;

  mounted() {
    this._update();
  }

  // 数值超过 max 显示 max+；dot 模式隐藏文字
  _displayText() {
    if (this.dot) return '';
    const n = Number(this.content);
    const capped = this.max != null && Number.isFinite(n) && n > this.max;
    return capped ? `${this.max}+` : String(this.content);
  }

  _update() {
    // 包裹内容 = slot 已分配节点（重渲染后）或渲染前的裸子节点（首次挂载）
    const slot = this.$('slot');
    const wrapped = slot ? slot.assignedNodes().length > 0 : this.childNodes.length > 0;
    // 有包裹内容时切换 data-corner 角标定位，否则内联展示
    this.toggleAttribute('data-corner', wrapped);
    const text = this._displayText();
    this.innerHTML = `<slot></slot><span class="badge" data-role="badge"${text ? ' role="status"' : ' aria-hidden="true"'}>${esc(text)}</span>`;
  }

  onAttributeChange() {
    this._update();
  }
}

AfElement.defineProp(AfBadge.prototype, 'content', '');
AfElement.defineProp(AfBadge.prototype, 'max', { type: Number, default: null });
AfElement.defineProp(AfBadge.prototype, 'dot', false);
AfElement.defineProp(AfBadge.prototype, 'color', { attr: 'data-color', type: String, default: 'danger' });
