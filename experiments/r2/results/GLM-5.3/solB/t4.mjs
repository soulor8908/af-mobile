import { html, signal, computed, For, render } from './k-flow.js'

export function mount(el) {
  const data = ['手机壳', '数据线', '手机膜', '充电器', '手机支架']
  const kw = signal('')
  const hits = computed(() => data.filter(s => s.includes(kw())))
  render(html`
    <input id="kw" @input=${e => kw.set(e.target.value)}>
    <div id="count">${() => `共${hits().length}条`}</div>
    <ul id="list">
      ${For({ each: hits, kids: item => html`<li>${item}</li>` })}
    </ul>
  `, el)
}
