import { html, signal, render, Show, For } from './k-flow.js'

export function mount(el, opts) {
  const state = signal('idle')
  const data = signal([])

  const load = async () => {
    state.set('loading')
    try {
      const res = await opts.loadData()
      data.set(res)
      state.set(res.length === 0 ? 'empty' : 'success')
    } catch {
      state.set('error')
    }
  }

  render(() => html`
    <div>
      <button id="load" @click=${load}>加载</button>
      <span id="status">${() => {
        const s = state()
        return s === 'loading' ? '加载中' : s === 'error' ? '加载失败' : s === 'empty' ? '空' : ''
      }}</span>
      ${() => Show({
        when: () => state() === 'error',
        kids: () => html`<button id="retry" @click=${load}>重试</button>`
      })}
      <ul id="list">
        ${() => state() === 'success' ? For({
          each: () => data(),
          kids: (item) => html`<li>${item}</li>`
        }) : ''}
      </ul>
    </div>
  `, el)
}
