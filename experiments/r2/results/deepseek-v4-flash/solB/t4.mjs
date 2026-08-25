import { html, signal, computed, render, For } from './k-flow.js';

export function mount(el, opts) {
  const all = ['手机壳', '数据线', '手机膜', '充电器', '手机支架'];
  const kw = signal('');
  const list = computed(() => all.filter(x => x.includes(kw())));
  render(html`
    <input id="kw" @input=${(e) => kw.set(e.target.value)} />
    <div id="count">${() => `共${list().length}条`}</div>
    <ul id="list">${For({ each: list, kids: (x) => html`<li>${x}</li>` })}</ul>
  `, el);
}
