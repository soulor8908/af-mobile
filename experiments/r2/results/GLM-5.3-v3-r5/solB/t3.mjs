import { html, signal, render, For, Show } from './k-flow.js'

export function mount(el, opts) {
  const loadData = (opts && opts.loadData) || (typeof window !== 'undefined' && window.__loadData)
  const state = signal({ phase: 'idle', items: [] })

  const statusText = () => {
    const p = state().phase
    if (p === 'pending') return '加载中'
    if (p === 'error') return '加载失败'
    if (p === 'empty') return '空'
    return ''
  }

  const run = () => {
    state.set({ phase: 'pending', items: [] })
    Promise.resolve()
      .then(() => loadData())
      .then(data => {
        const items = Array.isArray(data) ? data : []
        state.set({ phase: items.length ? 'success' : 'empty', items })
      })
      .catch(() => state.set({ phase: 'error', items: [] }))
  }

  render(html`
    <div>
      <button id="load" @click=${run}>加载</button>
      <div id="status">${statusText}</div>
      ${Show({ when: () => state().phase === 'error', kids: () => html`<button id="retry" @click=${run}>重试</button>` })}
      <ul id="list">
        ${For({ each: () => state().items, kids: item => html`<li>${item}</li>` })}
      </ul>
    </div>
  `, el)
}
