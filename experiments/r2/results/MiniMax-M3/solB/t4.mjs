// t4.mjs
import { html, signal, computed, For } from './k-flow.js';

export function mount(el, opts) {
  const items = ['手机壳', '数据线', '手机膜', '充电器', '手机支架'];
  const kw = signal('');
  const filtered = computed(() => {
    const k = kw().trim();
    return k ? items.filter(i => i.includes(k)) : items;
  });

  el.append(html`
    <input id="kw" @input=${(e) => kw.set(e.target.value)} />
    <span id="count">${() => '共' + filtered().length + '条'}</span>
    <ul id="list">
      ${() => For({
        each: filtered,
        kids: (item) => html`<li>${item}</li>`
      })}
    </ul>
  `);
}