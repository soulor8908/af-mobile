// t1.mjs
import { signal, effect, html } from '@af-mobile/ui';

export function mount(el, opts) {
  const count = signal(0);

  el.innerHTML = html`
    <div>
      <div>当前值：<span id="c">0</span></div>
      <div>平方：<span id="sq">0</span></div>
      <button id="inc">+1</button>
      <button id="dec">-1</button>
    </div>
  `;

  const c = el.querySelector('#c');
  const sq = el.querySelector('#sq');
  el.querySelector('#inc').addEventListener('click', () => count.set(count() + 1));
  el.querySelector('#dec').addEventListener('click', () => count.set(count() - 1));

  effect(() => { c.textContent = String(count()); });
  effect(() => { sq.textContent = String(count() * count()); });
}