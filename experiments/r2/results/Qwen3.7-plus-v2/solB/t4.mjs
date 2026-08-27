import { html, signal, computed, For, render } from './k-flow.js';

export function mount(el) {
  const all = ['手机壳', '数据线', '手机膜', '充电器', '手机支架'];
  const kw = signal('');
  const hits = computed(() => all.filter(x => x.includes(kw())));
  render(html`
    <input id="kw" .value=${kw()} @input=${e => kw.set(e.target.value)} />
    <span id="count">${() => `共${hits().length}条`}</span>
    <ul id="list">
      ${For({ each: hits, kids: item => html`<li>${item}</li>` })}
    </ul>
  `, el);
}
