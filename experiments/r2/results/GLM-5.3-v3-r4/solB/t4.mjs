import { html, signal, computed, For, render } from './k-flow.js'

const ALL = ['手机壳', '数据线', '手机膜', '充电器', '手机支架']

export function mount(el) {
  const kw = signal('')
  const hits = computed(() => {
    const k = kw().trim()
    return k ? ALL.filter(s => s.includes(k)) : ALL
  })

  render(html`
    <div>
      <input id="kw" .value=${() => kw()} @input=${e => kw.set(e.target.value)} />
      <div id="count">${() => `共${hits().length}条`}</div>
      <ul id="list">${For({ each: () => hits(), kids: s => html`<li>${s}</li>` })}</ul>
    </div>
  `, el)
}

export default mount
