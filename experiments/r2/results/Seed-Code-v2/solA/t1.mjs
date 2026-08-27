import { signal, effect, html } from '@af-mobile/ui';
export function mount(el) {
  el.innerHTML = html`<button id="dec">-</button><button id="inc">+</button><div id="c">0</div><div id="sq">0</div>`;
  const c = el.querySelector('#c');
  const sq = el.querySelector('#sq');
  const inc = el.querySelector('#inc');
  const dec = el.querySelector('#dec');
  const count = signal(0);
  effect(() => { c.textContent = count(); });
  effect(() => { sq.textContent = count() * count(); });
  inc.addEventListener('click', () => count.set(count() + 1));
  dec.addEventListener('click', () => count.set(count() - 1));
}