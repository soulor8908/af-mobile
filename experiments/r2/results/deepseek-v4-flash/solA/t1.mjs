import { signal, effect, html } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = `
    <div id="app">
      <div>计数：<span id="c">0</span></div>
      <div>平方：<span id="sq">0</span></div>
      <button id="inc">+1</button>
      <button id="dec">-1</button>
    </div>
  `;

  const count = signal(0);
  const cEl = el.querySelector('#c');
  const sqEl = el.querySelector('#sq');

  effect(() => {
    const v = count();
    cEl.textContent = v;
    sqEl.textContent = v * v;
  });

  el.querySelector('#inc').addEventListener('click', () => count.set(v => v + 1));
  el.querySelector('#dec').addEventListener('click', () => count.set(v => v - 1));
}
