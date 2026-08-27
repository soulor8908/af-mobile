// t1.mjs
import { signal, effect } from '@af-mobile/ui';
export function mount(el) {
  el.innerHTML = '<span id="c"></span><span id="sq"></span><button id="inc">+1</button><button id="dec">-1</button>';
  const n = signal(0);
  const c = el.querySelector('#c'), sq = el.querySelector('#sq');
  effect(() => { c.textContent = n(); sq.textContent = n() ** 2; });
  el.querySelector('#inc').onclick = () => n.set(v => v + 1);
  el.querySelector('#dec').onclick = () => n.set(v => v - 1);
}