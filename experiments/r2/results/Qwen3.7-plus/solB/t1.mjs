// t1.mjs
import { html, signal } from './k-flow.js'
export function mount(el) {
  const count = signal(0)
  el.appendChild(html`
    <div>
      <span id="c">${count}</span>
      <span id="sq">${() => count() ** 2}</span>
      <button id="inc" @click=${() => count.set(c => c + 1)}>+</button>
      <button id="dec" @click=${() => count.set(c => c - 1)}>-</button>
    </div>
  `)
}