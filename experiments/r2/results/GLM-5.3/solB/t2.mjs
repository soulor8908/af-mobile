import { html, signal, For, Show, render } from './k-flow.js'

export function mount(el) {
  let uid = 0
  const items = signal([])
  const add = e => {
    if (e.key !== 'Enter') return
    const v = e.target.value.trim()
    if (v) items.set(list => [...list, { id: ++uid, text: v }])
    e.target.value = ''
  }
  const del = id => items.set(list => list.filter(t => t.id !== id))
  render(html`
    <input id="new" @keydown=${add}>
    <ul id="list">
      ${For({ each: items, key: 'id', kids: t => html`<li @click=${() => del(t.id)}>${t.text}</li>` })}
    </ul>
    ${Show({ when: () => items().length === 0, kids: () => html`<p id="empty">暂无待办</p>` })}
  `, el)
}
