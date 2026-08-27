import { html, signal, computed, render } from './k-flow.js';

export function mount(el) {
  const count = signal(0);
  const sq = computed(() => count() ** 2);
  render(html`
    <button id="dec" @click=${() => count.set(c => c - 1)}>-</button>
    <span id="c">${count}</span>
    <button id="inc" @click=${() => count.set(c => c + 1)}>+</button>
    <span id="sq">${sq}</span>
  `, el);
}
