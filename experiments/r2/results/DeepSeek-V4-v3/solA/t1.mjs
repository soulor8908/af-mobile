import { signal, effect, html } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = html`
    <span id="c"></span>
    <span id="sq"></span>
    <button id="inc">+1</button>
    <button id="dec">-1</button>
  `;
  const c = el.querySelector('#c');
  const sq = el.querySelector('#sq');
  const n = signal(0);

  effect(() => {
    c.textContent = n();
    sq.textContent = n() * n();
  });

  el.querySelector('#inc').addEventListener('click', () => n.set(v => v + 1));
  el.querySelector('#dec').addEventListener('click', () => n.set(v => v - 1));
}
