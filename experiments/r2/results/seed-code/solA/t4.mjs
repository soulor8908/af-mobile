// t4.mjs
import { signal, effect, html } from '@af-mobile/ui';

const ALL = ["手机壳", "数据线", "手机膜", "充电器", "手机支架"];

export function mount(el, opts) {
  el.innerHTML = html`
    <div>
      <input id="kw" placeholder="输入关键词搜索" />
      <span id="count"></span>
      <ul id="list"></ul>
    </div>
  `;
  const kw = signal('');
  const kwEl = el.querySelector('#kw');
  const countEl = el.querySelector('#count');
  const listEl = el.querySelector('#list');
  effect(() => {
    const filtered = ALL.filter(it => it.includes(kw()));
    countEl.textContent = `共${filtered.length}条`;
    listEl.innerHTML = filtered.map(it => html`<li>${it}</li>`).join('');
  });
  kwEl.addEventListener('input', (e) => kw.set(e.target.value));
}