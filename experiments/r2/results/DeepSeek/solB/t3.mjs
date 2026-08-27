// t3.mjs
import { html, signal, For } from './k-flow.js'
export function mount(el, opts) {
  const load = (opts.loadData || window.__loadData)
  const status = signal('')
  const items = signal([])
  async function run() {
    status.set('加载中')
    items.set([])
    try {
      const data = await load()
      if (!data.length) { status.set('空'); return }
      items.set(data)
      status.set('')
    } catch {
      status.set('加载失败')
    }
  }
  el.append(html`
    <button id="load" @click=${run}>加载</button>
    <div id="status">${status}</div>
    <ul id="list">${For({ each: items, kids: t => html`<li>${t}</li>` })}</ul>
    <button id="retry" @click=${run} ${() => status() === '加载失败' ? '' : 'hidden'}>重试</button>
  `)
}