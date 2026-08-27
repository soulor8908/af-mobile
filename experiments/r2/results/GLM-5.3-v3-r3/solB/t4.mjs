import { html, signal, computed, For, render } from './k-flow.js'

export function mount(el) {
  const all = ['手机壳', '数据线', '手机膜', '充电器', '手机支架']
  const kw = signal('')
  const hits = computed(() => all.filter(s => s.includes(kw())))
  render(html`
    <div>
      <input id="kw" @input=${e => kw.set(e.target.value)} />
      <div id="count">${() => `共${hits().length}条`}</div>
      <ul id="list">
        ${For({ each: () => hits(), kids: s => html`<li>${s}</li>` })}
      </ul>
    </div>
  `, el)
}
