import { html, signal, computed, For, render } from './k-flow.js';

const DATA = ["手机壳", "数据线", "手机膜", "充电器", "手机支架"];

export function mount(el) {
  const kw = signal('');
  const filtered = computed(() => {
    const k = kw();
    return k ? DATA.filter(d => d.includes(k)) : DATA;
  });
  render(() => html`
    <div>
      <input id="kw" type="text" @input=${(e) => kw.set(e.target.value)} />
      <div id="count">${() => `共${filtered().length}条`}</div>
      <ul id="list">
        ${For({ each: () => filtered(), kids: (item) => html`<li>${item}</li>` })}
      </ul>
    </div>
  `, el);
}
