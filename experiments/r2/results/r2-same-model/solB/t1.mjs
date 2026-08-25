import { html, signal, render } from './k-flow.js';

export function mount(el, opts) {
  const n = signal(0);
  render(html`
    <button id="inc" @click=${() => n.set(v => v + 1)}>+1</button>
    <button id="dec" @click=${() => n.set(v => v - 1)}>-1</button>
    <div id="c">${n}</div>
    <div id="sq">${() => n() ** 2}</div>
  `, el);
}
