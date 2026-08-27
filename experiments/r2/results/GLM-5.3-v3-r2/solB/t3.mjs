import { html, signal, For, Show, render } from './k-flow.js'

export function mount(el, opts) {
  const load = opts?.loadData ?? window.__loadData
  const state = signal({ phase: 'idle', data: [] })
  const run = () => {
    state.set({ phase: 'pending', data: [] })
    load().then(
      data => state.set({ phase: data.length ? 'success' : 'empty', data }),
      () => state.set({ phase: 'error', data: [] })
    )
  }
  render(html`
    <button id="load" @click=${run}>加载</button>
    <div id="status">${() => ({ pending: '加载中', error: '加载失败', empty: '空' }[state().phase] || '')}</div>
    ${Show({ when: () => state().phase === 'error', kids: () => html`<button id="retry" @click=${run}>重试</button>` })}
    <ul id="list">${For({ each: () => state().data, kids: x => html`<li>${x}</li>` })}</ul>
  `, el)
}