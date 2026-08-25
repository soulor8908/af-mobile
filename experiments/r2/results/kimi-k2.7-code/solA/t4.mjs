import { signal, effect, html, escapeHtml } from '@af-mobile/ui';

const all = ['手机壳', '数据线', '手机膜', '充电器', '手机支架'];

export function mount(el) {
  el.innerHTML = html`
    <div>
      <input id="kw" placeholder="搜索">
      <div id="count">共${all.length}条</div>
      <ul id="list"></ul>
    </div>
  `;
  const kw = el.querySelector('#kw');
  const count = el.querySelector('#count');
  const list = el.querySelector('#list');

  const keyword = signal('');

  effect(() => {
    const k = keyword().trim();
    const filtered = k ? all.filter(it => it.includes(k)) : all;
    count.textContent = `共${filtered.length}条`;
    list.innerHTML = filtered.map(it => `<li>${escapeHtml(it)}</li>`).join('');
  });

  kw.addEventListener('input', () => keyword.set(kw.value));
}
