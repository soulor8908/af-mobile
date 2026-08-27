// t2.mjs
import { html, signal, For } from './k-flow.js'
export function mount(el) {
  const items = signal([])
  el.append(html`
    <input id="new" @keydown=${e => {
      if (e.key !== 'Enter') return
      const v = e.target.value.trim()
      if (!v) return
      items.set(l => [...l, v])
      e.target.value = ''
    }}>
    <ul id="list">
      ${For({ each: items, kids: t => html`<li @click=${() => items.set(l => l.filter(x => x !== t))}>${t}</li>` })}
    </ul>
    <div id="empty" ${() => items().length ? 'hidden' : ''}>暂无待办</div>
  `)
}