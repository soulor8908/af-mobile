import { html, signal, computed, render } from './k-flow.js';

export function mount(el) {
  const c = signal(0);
  const sq = computed(() => c() * c());

  render(html`
    <div>
      <div id="c">${() => c()}</div>
      <div id="sq">${() => sq()}</div>
      <button id="inc" @click=${() => c.set(v => v + 1)}>+1</button>
      <button id="dec" @click=${() => c.set(v => v - 1)}>-1</button>
    </div>
  `, el);
}
