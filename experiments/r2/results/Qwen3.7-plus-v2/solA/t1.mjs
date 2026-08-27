import { signal, effect, html } from '@af-mobile/ui';
export function mount(el) {
  el.innerHTML = html`<button id="dec">-1</button><span id="c">0</span><button id="inc">+1</button><span id="sq">0</span>`;
  const count = signal(0);
  const c = el.querySelector('#c'), sq = el.querySelector('#sq');
  effect(() => { c.textContent = count(); sq.textContent = count() ** 2; });
  el.querySelector('#inc').onclick = () => count.set(count() + 1);
  el.querySelector('#dec').onclick = () => count.set(count() - 1);
}
