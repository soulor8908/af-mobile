import { signal, effect, html } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = html`<button id="dec">-</button><span id="c">0</span><span id="sq">0</span><button id="inc">+</button>`;
  const c = el.querySelector('#c');
  const sq = el.querySelector('#sq');
  const count = signal(0);
  effect(() => {
    const n = count();
    c.textContent = n;
    sq.textContent = n * n;
  });
  el.querySelector('#inc').addEventListener('click', () => count.set(v => v + 1));
  el.querySelector('#dec').addEventListener('click', () => count.set(v => v - 1));
}
