import { html, signal, computed, render } from '../../k-flow.js';

export function mount(el) {
  const c = signal(0);
  const sq = computed(() => c() * c());
  render(html`
    <button id="dec" @click=${() => c.set(v => v - 1)}>-</button>
    <span id="c">${c}</span>
    <span id="sq">${sq}</span>
    <button id="inc" @click=${() => c.set(v => v + 1)}>+</button>
  `, el);
}
