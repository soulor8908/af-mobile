import { html, signal, render } from './k-flow.js'

export function mount(el) {
  const n = signal(0)
  render(html`
    <div>
      <button id="dec" @click=${() => n.set(v => v - 1)}>-1</button>
      <span id="c">${n}</span>
      <span id="sq">${() => n() * n()}</span>
      <button id="inc" @click=${() => n.set(v => v + 1)}>+1</button>
    </div>
  `, el)
}
