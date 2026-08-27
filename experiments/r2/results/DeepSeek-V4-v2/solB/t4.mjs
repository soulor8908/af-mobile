import { html, signal, computed, For } from './k-flow.js';

export function mount(el) {
  const all = ['手机壳', '数据线', '手机膜', '充电器', '手机支架'];
  const kw = signal('');
  const matches = computed(() => all.filter(x => x.includes(kw())));
  el.append(html`
    <input id="kw" @input=${e => kw.set(e.target.value)} />
    <div id="count">${computed(() => `共${matches().length}条`)}</div>
    <ul id="list">${For({ each: matches, kids: it => html`<li>${it}</li>` })}</ul>
  `);
}