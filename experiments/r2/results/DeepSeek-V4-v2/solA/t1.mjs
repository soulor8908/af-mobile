import { signal, effect, html } from '@af-mobile/ui';
export function mount(el) {
  el.innerHTML = html`<span id="c">0</span><span id="sq">0</span><button id="inc">+1</button><button id="dec">-1</button>`;
  const n = signal(0);
  const c = el.querySelector('#c');
  const sq = el.querySelector('#sq');
  effect(() => { c.textContent = n(); sq.textContent = n() * n(); });
  el.querySelector('#inc').addEventListener('click', () => n.set(n() + 1));
  el.querySelector('#dec').addEventListener('click', () => n.set(n() - 1));
}