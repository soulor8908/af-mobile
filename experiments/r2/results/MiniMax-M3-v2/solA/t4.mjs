import { signal, effect, html, escapeHtml } from '@af-mobile/ui';

export function mount(el) {
  const all = ['手机壳', '数据线', '手机膜', '充电器', '手机支架'];
  el.innerHTML = html`
    <input id="kw" type="text" />
    <div id="count"></div>
    <ul id="list"></ul>
  `;
  const kw = signal('');
  const count = el.querySelector('#count');
  const list = el.querySelector('#list');
  effect(() => {
    const k = kw();
    const filtered = all.filter(it => it.includes(k));
    count.textContent = `共${filtered.length}条`;
    list.innerHTML = filtered.map(it => html`<li>${escapeHtml(it)}</li>`).join('');
  });
  el.querySelector('#kw').addEventListener('input', (e) => kw.set(e.target.value));
}
