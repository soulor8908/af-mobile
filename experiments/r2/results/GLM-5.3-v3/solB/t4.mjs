import { html, signal, computed, For, render } from './k-flow.js'

const DATA = ['手机壳', '数据线', '手机膜', '充电器', '手机支架']

export function mount(el) {
  const kw = signal('')
  const hits = computed(() => DATA.filter(x => x.includes(kw())))
  render(html`
    <input id="kw" @input=${e => kw.set(e.target.value)}>
    <div id="count">${() => `共${hits().length}条`}</div>
    <ul id="list">${For({ each: hits, kids: x => html`<li>${x}</li>` })}</ul>
  `, el)
}