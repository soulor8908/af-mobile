import { html, signal, For, Show, render } from './k-flow.js'

export function mount(el, opts) {
  const status = signal('')
  const items = signal([])
  const failed = signal(false)
  const load = () => {
    const fn = (opts && opts.loadData) || window.__loadData
    failed.set(false)
    status.set('加载中')
    items.set([])
    let p
    try { p = fn() } catch (e) { p = Promise.reject(e) }
    Promise.resolve(p).then(list => {
      if (Array.isArray(list) && list.length > 0) {
        status.set('')
        items.set(list)
      } else {
        status.set('空')
      }
    }).catch(() => {
      status.set('加载失败')
      failed.set(true)
    })
  }
  render(html`
    <button id="load" @click=${load}>加载</button>
    <div id="status">${status}</div>
    <ul id="list">
      ${For({ each: items, kids: item => html`<li>${item}</li>` })}
    </ul>
    ${Show({ when: failed, kids: () => html`<button id="retry" @click=${load}>重试</button>` })}
  `, el)
}
