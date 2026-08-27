import { html, signal, computed, render } from './k-flow.js';

export function mount(el) {
  const count = signal(0);
  const sq = computed(() => count() * count());
  render(html`
    <div>
      <span id="c">${() => String(count())}</span>
      <span id="sq">${() => String(sq())}</span>
      <button id="inc" @click=${() => count.set(v => v + 1)}>+</button>
      <button id="dec" @click=${() => count.set(v => v - 1)}>-</button>
    </div>
  `, el);
}
