// t1.mjs
import { html, signal, computed } from './k-flow.js';

export function mount(el, opts) {
  const count = signal(0);
  const square = computed(() => count() * count());

  el.append(html`
    <span id="c">${() => count()}</span>
    <span id="sq">${() => square()}</span>
    <button id="inc" @click=${() => count.set(c => c + 1)}>+</button>
    <button id="dec" @click=${() => count.set(c => c - 1)}>-</button>
  `);
}