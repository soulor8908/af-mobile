import { signal, effect } from '@af-mobile/ui';

export function mount(el, opts) {
  el.innerHTML = '<span id="c">0</span> <span id="sq">0</span> <button id="inc">+1</button> <button id="dec">-1</button>';
  const c = el.querySelector('#c');
  const sq = el.querySelector('#sq');
  const n = signal(0);
  effect(() => { c.textContent = n(); });
  effect(() => { sq.textContent = n() * n(); });
  el.querySelector('#inc').addEventListener('click', () => n.set(v => v + 1));
  el.querySelector('#dec').addEventListener('click', () => n.set(v => v - 1));
}
