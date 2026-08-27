// t2.mjs
import { html, signal, Show, For } from './k-flow.js'
export function mount(el) {
  const todos = signal([])
  const add = (e) => {
    if (e.key === 'Enter') {
      const v = e.target.value.trim()
      if (v) {
        todos.set(t => [...t, v])
        e.target.value = ''
      }
    }
  }
  const remove = (item) => todos.set(t => t.filter(x => x !== item))
  el.appendChild(html`
    <div>
      <input id="new" @keydown=${add} />
      <ul id="list">
        ${For({ each: () => todos(), kids: (item) => html`<li @click=${() => remove(item)}>${item}</li>` })}
      </ul>
      ${Show({ when: () => todos().length === 0, kids: () => html`<div id="empty">暂无待办</div>` })}
    </div>
  `)
}