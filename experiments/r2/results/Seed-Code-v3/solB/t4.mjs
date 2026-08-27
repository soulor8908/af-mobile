import { html, signal, computed, render, For } from './k-flow.js'

const DATA = ['手机壳', '数据线', '手机膜', '充电器', '手机支架']

export function mount(el) {
  const kw = signal('')
  const result = computed(() => DATA.filter(s => s.includes(kw())))

  render(html`
    <div>
      <input id="kw" placeholder="搜索" .value=${() => kw()} @input=${e => kw.set(e.target.value)}>
      <span id="count">${() => `共${result().length}条`}</span>
      <ul id="list">
        ${For({ each: result, kids: item => html`<li>${item}</li>` })}
      </ul>
    </div>
  `, el)
}
