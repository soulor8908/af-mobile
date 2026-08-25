import { signal, computed, effect, html } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = html`
    <div>
      <div id="c">0</div>
      <div id="sq">0</div>
      <button id="inc">+1</button>
      <button id="dec">-1</button>
    </div>
  `;
  const cEl = el.querySelector('#c');
  const sqEl = el.querySelector('#sq');
  const incBtn = el.querySelector('#inc');
  const decBtn = el.querySelector('#dec');

  const count = signal(0);
  const sq = computed(() => count() * count());

  effect(() => { cEl.textContent = count(); });
  effect(() => { sqEl.textContent = sq(); });

  incBtn.addEventListener('click', () => count.set(v => v + 1));
  decBtn.addEventListener('click', () => count.set(v => v - 1));
}
