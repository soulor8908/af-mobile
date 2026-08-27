import { html, signal, computed } from './k-flow.js';

export function mount(el) {
  const n = signal(0);
  const sq = computed(() => n() * n());
  el.append(html`
    <button id="inc" @click=${() => n.set(x => x + 1)}>+1</button>
    <button id="dec" @click=${() => n.set(x => x - 1)}>-1</button>
    <div id="c">${n}</div>
    <div id="sq">${sq}</div>
  `);
}