// t4.mjs
import { signal, effect } from '@af-mobile/ui';
export function mount(el, opts) {
  const list = ['手机壳', '数据线', '手机膜', '充电器', '手机支架'];
  el.innerHTML = `<input id="kw"><div id="count"></div><ul id="list"></ul>`;
  const kw = signal('');
  const kwEl = el.querySelector('#kw');
  const countEl = el.querySelector('#count');
  const listEl = el.querySelector('#list');
  effect(() => {
    const hit = list.filter((t) => t.includes(kw()));
    countEl.textContent = `共${hit.length}条`;
    listEl.innerHTML = hit.map((t) => `<li>${t}</li>`).join('');
  });
  kwEl.addEventListener('input', () => kw.set(kwEl.value));
}