import { signal, effect, html } from '@af-mobile/ui';

export function mount(el) {
  const all = ['手机壳', '数据线', '手机膜', '充电器', '手机支架'];
  el.innerHTML = html`<input id="kw" type="text"><span id="count"></span><ul id="list"></ul>`;
  const kw = el.querySelector('#kw');
  const count = el.querySelector('#count');
  const list = el.querySelector('#list');
  const keyword = signal('');
  effect(() => {
    const hits = all.filter(it => it.includes(keyword()));
    count.textContent = `共${hits.length}条`;
    list.innerHTML = hits.map(it => html`<li>${it}</li>`).join('');
  });
  kw.addEventListener('input', () => keyword.set(kw.value));
}
