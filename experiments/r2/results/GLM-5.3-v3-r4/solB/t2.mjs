import { html, signal, For, Show, render } from './k-flow.js'

export function mount(el) {
  const items = signal([])
  const text = signal('')
  let uid = 0

  function add() {
    const v = text().trim()
    if (!v) return
    items.set(list => [...list, { id: ++uid, text: v }])
    text.set('')
  }

  function remove(id) {
    items.set(list => list.filter(x => x.id !== id))
  }

  render(html`
    <div>
      <input id="new" .value=${() => text()} @input=${e => text.set(e.target.value)} @keydown=${e => { if (e.key === 'Enter') add() }} />
      <ul id="list">${For({ each: () => items(), key: 'id', kids: it => html`<li @click=${() => remove(it.id)}>${it.text}</li>` })}</ul>
      ${Show({ when: () => items().length === 0, kids: () => html`<div id="empty">暂无待办</div>` })}
    </div>
  `, el)
}

export default mount
