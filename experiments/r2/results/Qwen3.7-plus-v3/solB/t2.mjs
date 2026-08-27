import { html, signal, For, Show, render } from './k-flow.js'

export function mount(el) {
  let uid = 0
  const todos = signal([])
  const add = e => {
    if (e.key !== 'Enter') return
    const v = e.target.value.trim()
    if (!v) return
    todos.set(list => [...list, { id: ++uid, text: v }])
    e.target.value = ''
  }
  render(html`
    <input id="new" @keydown=${add}>
    <ul id="list">${For({
      each: () => todos(),
      key: 'id',
      kids: t => html`<li @click=${() => todos.set(list => list.filter(x => x.id !== t.id))}>${t.text}</li>`
    })}</ul>
    ${Show({ when: () => todos().length === 0, kids: () => html`<div id="empty">暂无待办</div>` })}
  `, el)
}