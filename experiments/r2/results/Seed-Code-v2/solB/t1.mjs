import { html, signal, computed, render } from './k-flow.js';

export function mount(el, opts) {
  const count = signal(0);
  const sq = computed(() => count() * count());

  const app = html`
    <div>
      <span id="c">${count}</span>
      <span id="sq">${sq}</span>
      <button id="inc" @click=${() => count.set(v => v + 1)}>+1</button>
      <button id="dec" @click=${() => count.set(v => v - 1)}>-1</button>
    </div>
  `;

  render(app, el);
}