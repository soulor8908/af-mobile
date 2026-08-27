// t3.mjs
import { html, signal, Show, For } from './k-flow.js'
export function mount(el, opts) {
  const status = signal('')
  const items = signal([])
  const showRetry = signal(false)
  const load = async () => {
    status.set('加载中')
    showRetry.set(false)
    try {
      const data = await opts.loadData()
      if (data.length === 0) {
        status.set('空')
        items.set([])
      } else {
        status.set('')
        items.set(data)
      }
    } catch {
      status.set('加载失败')
      showRetry.set(true)
    }
  }
  el.appendChild(html`
    <div>
      <button id="load" @click=${load}>加载</button>
      <div id="status">${status}</div>
      <ul id="list">
        ${For({ each: () => items(), kids: (item) => html`<li>${item}</li>` })}
      </ul>
      ${Show({ when: () => showRetry(), kids: () => html`<button id="retry" @click=${load}>重试</button>` })}
    </div>
  `)
}