// t4.mjs
import { signal, effect, html } from '@af-mobile/ui';

export function mount(el, opts) {
  const data = ['手机壳', '数据线', '手机膜', '充电器', '手机支架'];
  const kw = signal('');

  el.innerHTML = html`
    <div>
      <input id="kw" placeholder="搜索关键词" />
      <div id="count">共0条</div>
      <ul id="list"></ul>
    </div>
  `;

  const input = el.querySelector('#kw');
  const countEl = el.querySelector('#count');
  const listEl = el.querySelector('#list');

  input.addEventListener('input', () => kw.set(input.value));

  effect(() => {
    const k = kw().trim();
    const filtered = k ? data.filter((it) => it.includes(k)) : data.slice();
    countEl.textContent = `共${filtered.length}条`;
    listEl.innerHTML = filtered.map((it) => html`<li>${it}</li>`).join('');
  });
}