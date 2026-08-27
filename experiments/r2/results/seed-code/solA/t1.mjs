// t1.mjs
import { signal, effect, html } from '@af-mobile/ui';

export function mount(el, opts) {
  el.innerHTML = html`
    <div>
      <span id="c">0</span>
      <span id="sq">0</span>
      <button id="inc">+1</button>
      <button id="dec">-1</button>
    </div>
  `;
  const value = signal(0);
  const cEl = el.querySelector('#c');
  const sqEl = el.querySelector('#sq');
  effect(() => {
    const v = value();
    cEl.textContent = v;
    sqEl.textContent = v * v;
  });
  el.querySelector('#inc').addEventListener('click', () => value.set(v => v + 1));
  el.querySelector('#dec').addEventListener('click', () => value.set(v => v - 1));
}