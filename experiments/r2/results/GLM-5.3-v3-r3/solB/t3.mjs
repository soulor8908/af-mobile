import { html, signal, Show, For, render } from './k-flow.js'

export function mount(el, opts = {}) {
  const status = signal('')
  const data = signal([])
  const load = () => {
    status.set('加载中')
    data.set([])
    const fn = (opts && opts.loadData) || window.__loadData
    Promise.resolve().then(() => fn())
      .then(list => {
        data.set(Array.isArray(list) ? list : [])
        status.set(list && list.length ? '' : '空')
      })
      .catch(() => status.set('加载失败'))
  }
  render(html`
    <div>
      <button id="load" @click=${load}>加载</button>
      <span id="status">${() => status()}</span>
      <ul id="list">
        ${For({ each: () => data(), kids: s => html`<li>${s}</li>` })}
      </ul>
      ${Show({ when: () => status() === '加载失败', kids: () => html`<button id="retry" @click=${load}>重试</button>` })}
    </div>
  `, el)
}
