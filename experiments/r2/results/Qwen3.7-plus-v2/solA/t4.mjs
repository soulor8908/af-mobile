import { signal, effect, html } from '@af-mobile/ui';
export function mount(el) {
  const items = ['手机壳', '数据线', '手机膜', '充电器', '手机支架'];
  el.innerHTML = html`<input id="kw"><div id="count"></div><ul id="list"></ul>`;
  const kw = signal('');
  const count = el.querySelector('#count'), list = el.querySelector('#list');
  effect(() => {
    const filtered = items.filter(it => it.includes(kw()));
    count.textContent = `共${filtered.length}条`;
    list.innerHTML = filtered.map(it => html`<li>${it}</li>`).join('');
  });
  el.querySelector('#kw').oninput = e => kw.set(e.target.value);
}
