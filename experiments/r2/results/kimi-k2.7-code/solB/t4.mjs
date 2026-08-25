import { html, signal, computed, For, render } from './k-flow.js';

export function mount(el) {
  const all = ["手机壳", "数据线", "手机膜", "充电器", "手机支架"];
  const kw = signal('');
  const list = computed(() => all.filter(item => item.includes(kw())));

  render(html`
    <div>
      <input id="kw" placeholder="搜索" @input=${e => kw.set(e.target.value)}>
      <div id="count">共${() => list().length}条</div>
      <ul id="list">
        ${() => For({ each: list, kids: (item) => html`<li>${item}</li>` })}
      </ul>
    </div>
  `, el);
}
