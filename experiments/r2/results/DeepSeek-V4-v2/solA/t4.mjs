import { signal, effect, html } from '@af-mobile/ui';
export function mount(el) {
  const data = ['手机壳', '数据线', '手机膜', '充电器', '手机支架'];
  el.innerHTML = html`<input id="kw"><div id="count"></div><ul id="list"></ul>`;
  const kw = el.querySelector('#kw');
  const count = el.querySelector('#count');
  const list = el.querySelector('#list');
  const q = signal('');
  effect(() => {
    const hit = data.filter(it => it.includes(q()));
    count.textContent = '共' + hit.length + '条';
    list.innerHTML = hit.map(it => html`<li>${it}</li>`).join('');
  });
  kw.addEventListener('input', () => q.set(kw.value));
}