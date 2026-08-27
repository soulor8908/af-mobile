import { html, signal, computed, render } from './k-flow.js'

export function mount(el) {
  const count = signal(0)
  const sq = computed(() => count() * count())

  render(html`
    <div>
      <div id="c">${() => count()}</div>
      <div id="sq">${() => sq()}</div>
      <button id="inc" @click=${() => count.set(v => v + 1)}>+1</button>
      <button id="dec" @click=${() => count.set(v => v - 1)}>-1</button>
    </div>
  `, el)
}

export default mount
