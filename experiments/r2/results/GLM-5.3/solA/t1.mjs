import { signal, computed, effect, html } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = html`
    <span id="c">0</span>
    <span id="sq">0</span>
    <button id="dec">-</button>
    <button id="inc">+</button>
  `;
  const c = el.querySelector('#c');
  const sq = el.querySelector('#sq');
  const count = signal(0);
  const square = computed(() => count() * count());
  effect(() => { c.textContent = count(); });
  effect(() => { sq.textContent = square(); });
  el.querySelector('#inc').addEventListener('click', () => count.set(v => v + 1));
  el.querySelector('#dec').addEventListener('click', () => count.set(v => v - 1));
}
