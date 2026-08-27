import { signal, computed, effect, html } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = html`<button id="dec">-</button><span id="c">0</span><span id="sq">0</span><button id="inc">+</button>`;
  const c = el.querySelector('#c');
  const sq = el.querySelector('#sq');
  const n = signal(0);
  const square = computed(() => n() * n());
  effect(() => {
    c.textContent = n();
    sq.textContent = square();
  });
  el.querySelector('#inc').addEventListener('click', () => n.set(n() + 1));
  el.querySelector('#dec').addEventListener('click', () => n.set(n() - 1));
}