import { html, signal, computed, render, For } from './k-flow.js'

export function mount(el) {
  const items = ['手机壳', '数据线', '手机膜', '充电器', '手机支架']
  const kw = signal('')
  const filtered = computed(() => items.filter(x => x.includes(kw())))

  render(() => html`
    <div>
      <input id="kw" @input=${(e) => kw.set(e.target.value)} />
      <span id="count">${() => `共${filtered().length}条`}</span>
      <ul id="list">
        ${() => For({
          each: filtered,
          kids: (item) => html`<li>${item}</li>`
        })}
      </ul>
    </div>
  `, el)
}
