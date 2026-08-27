import { html, signal, computed, For, render } from './k-flow.js';

export function mount(el, opts) {
  const builtin = ["手机壳","数据线","手机膜","充电器","手机支架"];
  const kw = signal('');
  const filtered = computed(() => builtin.filter(item => item.includes(kw())));

  const app = html`
    <div>
      <input id="kw" .value=${kw} @input=${e => kw.set(e.target.value)} />
      <span id="count">共${computed(() => filtered().length)}条</span>
      <ul id="list">
        ${For({ each: filtered, kids: (item) => html`<li>${item}</li>` })}
      </ul>
    </div>
  `;

  render(app, el);
}