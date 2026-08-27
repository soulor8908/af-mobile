import { signal, effect, html } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = html`
    <button id="dec">-1</button>
    <span id="c">0</span>
    <span id="sq">0</span>
    <button id="inc">+1</button>
  `;
  const c = el.querySelector('#c');
  const sq = el.querySelector('#sq');
  const count = signal(0);
  effect(() => {
    const v = count();
    c.textContent = String(v);
    sq.textContent = String(v * v);
  });
  el.querySelector('#inc').addEventListener('click', () => count.set(n => n + 1));
  el.querySelector('#dec').addEventListener('click', () => count.set(n => n - 1));
}
