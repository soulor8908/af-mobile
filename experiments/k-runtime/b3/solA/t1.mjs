import { signal, computed, effect } from '../../../../src/lib/state.js';

export function mount(el) {
  el.innerHTML = `
    <p>当前：<span id="c"></span></p>
    <p>平方：<span id="sq"></span></p>
    <button id="dec">-</button>
    <button id="inc">+</button>
  `;
  const c = signal(0);
  const sq = computed(() => c() * c());
  const cEl = el.querySelector('#c');
  const sqEl = el.querySelector('#sq');
  effect(() => { cEl.textContent = c(); });
  effect(() => { sqEl.textContent = sq(); });
  el.querySelector('#inc').addEventListener('click', () => c.set(v => v + 1));
  el.querySelector('#dec').addEventListener('click', () => c.set(v => v - 1));
}
