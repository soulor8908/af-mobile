import { html, signal, computed, render } from './k-flow.js'

export function mount(el) {
  const n = signal(0)
  const sq = computed(() => n() * n())
  render(html`
    <button id="dec" @click=${() => n.set(v => v - 1)}>-</button>
    <span id="c">${() => n()}</span>
    <span id="sq">${() => sq()}</span>
    <button id="inc" @click=${() => n.set(v => v + 1)}>+</button>
  `, el)
}