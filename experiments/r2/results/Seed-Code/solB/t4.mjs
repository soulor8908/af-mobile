// t4.mjs
import { html, signal, computed, For, render } from './k-flow.js';
export function mount(el) {
  const ALL_ITEMS = ["手机壳", "数据线", "手机膜", "充电器", "手机支架"];
  const kw = signal('');
  const filtered = computed(() => ALL_ITEMS.filter(x => x.includes(kw())));
  const countText = computed(() => `共${filtered().length}条`);
  render(() => html`
    <input id="kw" .prop=${kw} @input=${e => kw.set(e.target.value)} />
    <div id="count">${countText}</div>
    <ul id="list">
      ${For({ each: () => filtered(), kids: (item) => html`<li>${item}</li>` })}
    </ul>
  `, el);
}