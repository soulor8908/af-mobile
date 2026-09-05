// af-mobile UI —— af-progress：进度条
// Light DOM，div 结构（T0.7 Vant 对齐）：4px 轨道 + 填充条 + 可选 pivot 百分比气泡
// 宽度经 --af-pct 变量派发（af-list/af-picker 同款变量通道），禁内联 style
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';

export class AfProgress extends AfElement {
  static useShadow = false;

  mounted() {
    this._render();
  }

  get _pct() {
    return Math.min(100, Math.max(0, (+this.value || 0) / (+this.max || 100) * 100));
  }

  _render() {
    const v = this.color && this.color !== 'brand' ? ` progress-${esc(this.color)}` : '';
    const pct = this._pct;
    this.innerHTML = `<div class="progress${v}" data-role="progress" role="progressbar" aria-valuemax="${esc(this.max)}" aria-valuenow="${esc(this.value)}"><div class="progress-bar" data-role="bar"></div>${this.showPivot ? `<span class="progress-pivot">${Math.round(pct)}%</span>` : ''}</div>`;
    this.style.setProperty('--af-pct', pct + '%');
  }

  onAttributeChange() {
    this._render();
  }
}

AfElement.defineProp(AfProgress.prototype, 'value', 0);
AfElement.defineProp(AfProgress.prototype, 'max', 100);
AfElement.defineProp(AfProgress.prototype, 'color', 'brand');
AfElement.defineProp(AfProgress.prototype, 'showPivot', false);
