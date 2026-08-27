// t1.mjs
import { html, signal } from './k-flow.js'
export function mount(el) {
  const n = signal(0)
  el.append(html`
    <div id="c">${n}</div>
    <div id="sq">${() => n() ** 2}</div>
    <button id="dec" @click=${() => n.set(v => v - 1)}>-1</button>
    <button id="inc" @click=${() => n.set(v => v + 1)}>+1</button>
  `)
}