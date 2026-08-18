// af-mobile UI —— af-steps：步骤条
// Light DOM，复用 L2 .steps 纯 CSS 配方；steps（字符串数组或 {label} 数组）+ current 高亮当前步
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';

export class AfSteps extends AfElement {
  static useShadow = false;

  mounted() {
    this._render();
  }

  _render() {
    const items = Array.isArray(this.steps) ? this.steps : [];
    const current = Math.max(0, Math.min(this.current, items.length - 1));
    const html = items.map((s, i) => {
      const label = typeof s === 'string' ? s : (s && s.label) || '';
      const state = i < current ? ' step-done' : i === current ? ' step-active' : '';
      const circle = i < current ? '✓' : String(i + 1);
      return `<div class="step${state}"><div class="step-circle">${circle}</div><div class="step-label">${esc(label)}</div></div>`;
    }).join('');
    this.innerHTML = `<div class="steps" data-role="steps">${html}</div>`;
  }

  onAttributeChange() {
    this._render();
  }
}

AfElement.defineProp(AfSteps.prototype, 'steps', []);
AfElement.defineProp(AfSteps.prototype, 'current', 0);