import { html, signal, For, Show, render } from './k-flow.js'

const LABELS = { pending: '加载中', error: '加载失败', empty: '空' }

export function mount(el, opts = {}) {
  const loader = opts.loadData || (typeof window !== 'undefined' ? window.__loadData : null)
  const status = signal('idle')
  const data = signal([])

  async function run() {
    if (typeof loader !== 'function') {
      status.set('error')
      return
    }
    status.set('pending')
    data.set([])
    try {
      const res = await loader()
      const list = Array.isArray(res) ? res : []
      data.set(list)
      status.set(list.length === 0 ? 'empty' : 'done')
    } catch {
      status.set('error')
    }
  }

  render(html`
    <div>
      <button id="load" @click=${run}>加载</button>
      <div id="status">${() => LABELS[status()] || ''}</div>
      <ul id="list">${For({ each: () => data(), kids: s => html`<li>${s}</li>` })}</ul>
      ${Show({ when: () => status() === 'error', kids: () => html`<button id="retry" @click=${run}>重试</button>` })}
    </div>
  `, el)
}

export default mount
