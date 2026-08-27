import { signal, effect, html } from '@af-mobile/ui';

export function mount(el, opts) {
  el.innerHTML = html`<span id="c">0</span> <span id="sq">0</span><button id="inc">+1</button><button id="dec">-1</button>`;
  const c = el.querySelector('#c');
  const sq = el.querySelector('#sq');
  const count = signal(0);
  effect(() => {
    c.textContent = count();
    sq.textContent = count() * count();
  });
  el.querySelector('#inc').addEventListener('click', () => count.set(v => v + 1));
  el.querySelector('#dec').addEventListener('click', () => count.set(v => v - 1));
}