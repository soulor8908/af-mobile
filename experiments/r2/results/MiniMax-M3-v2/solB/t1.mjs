import { html, signal, computed, render } from './k-flow.js';

export function mount(el) {
  const count = signal(0);
  const square = computed(() => count() * count());
  render(() => html`
    <div>
      <span id="c">${() => count()}</span>
      <span id="sq">${() => square()}</span>
      <button id="inc">+</button>
      <button id="dec">-</button>
    </div>
  `, el);
  el.querySelector('#inc').addEventListener('click', () => count.set(c => c + 1));
  el.querySelector('#dec').addEventListener('click', () => count.set(c => c - 1));
}
