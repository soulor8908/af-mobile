import { html, signal, render, Show, For } from './k-flow.js'

export function mount(el) {
  let nextId = 0
  const todos = signal([])

  const add = (e) => {
    if (e.key !== 'Enter') return
    const v = e.target.value.trim()
    if (!v) return
    todos.set(t => [...t, { id: nextId++, text: v }])
    e.target.value = ''
  }

  const remove = (id) => todos.set(t => t.filter(x => x.id !== id))

  render(() => html`
    <div>
      <input id="new" @keydown=${add} />
      <ul id="list">
        ${() => For({
          each: () => todos(),
          key: 'id',
          kids: (item) => html`<li @click=${() => remove(item.id)}>${item.text}</li>`
        })}
      </ul>
      ${() => Show({
        when: () => todos().length === 0,
        kids: () => html`<div id="empty">暂无待办</div>`
      })}
    </div>
  `, el)
}
