import { html, signal, render, For } from './k-flow.js'

let uid = 0

export function mount(el) {
  const todos = signal([])

  const add = e => {
    if (e.key !== 'Enter') return
    const v = e.target.value.trim()
    if (!v) return
    todos.set(list => [...list, { id: ++uid, text: v }])
    e.target.value = ''
  }

  render(html`
    <div>
      <input id="new" placeholder="输入待办，回车添加" @keydown=${add}>
      <ul id="list">
        ${For({
          each: todos,
          key: 'id',
          kids: item => html`<li @click=${() => todos.set(list => list.filter(t => t.id !== item.id))}>${item.text}</li>`
        })}
      </ul>
      <div id="empty" hidden=${() => todos().length > 0}>暂无待办</div>
    </div>
  `, el)
}
