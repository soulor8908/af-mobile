import { html, signal, Show, For, render } from './k-flow.js'

export function mount(el) {
  const items = signal([])
  let uid = 0
  const remove = id => items.set(list => list.filter(it => it.id !== id))
  render(html`
    <div>
      <input id="new" @keydown=${e => {
        if (e.key !== 'Enter' && e.keyCode !== 13) return
        const v = e.target.value.trim()
        if (!v) return
        items.set(list => [...list, { id: ++uid, text: v }])
        e.target.value = ''
      }} />
      <ul id="list">
        ${For({ each: () => items(), key: 'id', kids: it => html`<li @click=${() => remove(it.id)}>${it.text}</li>` })}
      </ul>
      ${Show({ when: () => items().length === 0, kids: () => html`<div id="empty">暂无待办</div>` })}
    </div>
  `, el)
}
