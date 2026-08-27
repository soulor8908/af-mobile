// t1.mjs
import { signal, effect } from '@af-mobile/ui';
export function mount(el, opts) {
  el.innerHTML = `<div id="c">0</div><div id="sq">0</div><button id="inc">+1</button><button id="dec">-1</button>`;
  const c = signal(0);
  const cEl = el.querySelector('#c');
  const sqEl = el.querySelector('#sq');
  effect(() => { cEl.textContent = c(); });
  effect(() => { sqEl.textContent = c() * c(); });
  el.querySelector('#inc').addEventListener('click', () => c.set(c() + 1));
  el.querySelector('#dec').addEventListener('click', () => c.set(c() - 1));
}