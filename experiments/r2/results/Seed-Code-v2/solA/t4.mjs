import { signal, effect, html } from '@af-mobile/ui';
export function mount(el) {
  const all = ['手机壳', '数据线', '手机膜', '充电器', '手机支架'];
  el.innerHTML = html`<input id="kw" placeholder="搜索" /><div id="count"></div><ul id="list"></ul>`;
  const kw = el.querySelector('#kw');
  const count = el.querySelector('#count');
  const list = el.querySelector('#list');
  const keyword = signal('');
  kw.addEventListener('input', () => keyword.set(kw.value));
  effect(() => {
    const k = keyword().trim();
    const hit = k === '' ? all : all.filter((x) => x.includes(k));
    count.textContent = `共${hit.length}条`;
    list.innerHTML = hit.map((x) => html`<li>${x}</li>`).join('');
  });
}