// t4.mjs
import { html, signal, computed, For } from './k-flow.js'
export function mount(el) {
  const kw = signal('')
  const all = ['手机壳', '数据线', '手机膜', '充电器', '手机支架']
  const list = computed(() => all.filter(x => x.includes(kw())))
  el.append(html`
    <input id="kw" @input=${e => kw.set(e.target.value)}>
    <div id="count">共${() => list().length}条</div>
    <ul id="list">${For({ each: list, kids: t => html`<li>${t}</li>` })}</ul>
  `)
}