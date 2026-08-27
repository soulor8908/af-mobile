import { html, signal, computed, render } from './k-flow.js'

export function mount(el) {
  const n = signal(0)
  const sq = computed(() => n() * n())
  render(html`
    <div>
      <button id="dec" @click=${() => n.set(v => v - 1)}>-1</button>
      <span id="c">${() => String(n())}</span>
      <span id="sq">${() => String(sq())}</span>
      <button id="inc" @click=${() => n.set(v => v + 1)}>+1</button>
    </div>
  `, el)
}
