import { html, signal, For, render } from './k-flow.js'

export function mount(el) {
  let uid = 0
  const todos = signal([])
  const add = e => {
    if (e.key !== 'Enter') return
    const v = e.target.value.trim()
    if (v) todos.set(list => [...list, { id: ++uid, text: v }])
    e.target.value = ''
  }
  render(html`
    <input id="new" @keydown=${add}>
    <ul id="list">${For({ each: todos, key: 'id', kids: t => html`<li @click=${() => todos.set(list => list.filter(x => x.id !== t.id))}>${t.text}</li>` })}</ul>
    <div id="empty" hidden=${() => todos().length > 0}>暂无待办</div>
  `, el)
}