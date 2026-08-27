import { html, signal, Show, For, render } from './k-flow.js'

export function mount(el, opts) {
  const loadData = opts?.loadData || window.__loadData
  const status = signal('')
  const items = signal([])
  const failed = signal(false)
  const run = () => {
    status.set('加载中')
    failed.set(false)
    loadData()
      .then(data => {
        items.set(data)
        status.set(data.length ? '' : '空')
      })
      .catch(() => {
        status.set('加载失败')
        failed.set(true)
      })
  }
  render(html`
    <button id="load" @click=${run}>加载</button>
    <div id="status">${() => status()}</div>
    <ul id="list">${For({ each: items, kids: it => html`<li>${it}</li>` })}</ul>
    ${Show({ when: failed, kids: () => html`<button id="retry" @click=${run}>重试</button>` })}
  `, el)
}