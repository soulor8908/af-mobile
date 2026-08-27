import { html, signal, For, Show, render } from './k-flow.js';

export function mount(el, opts = {}) {
  const state = signal('idle');
  const data = signal([]);
  const load = () => {
    state.set('pending');
    const fn = (opts && opts.loadData) || window.__loadData;
    Promise.resolve().then(fn).then(
      (arr) => {
        data.set(arr);
        state.set(arr.length === 0 ? 'empty' : 'success');
      },
      () => state.set('error')
    );
  };
  render(() => html`
    <div>
      <button id="load" @click=${load}>Load</button>
      <div id="status">${() => {
        const s = state();
        return s === 'pending' ? '加载中' : s === 'error' ? '加载失败' : s === 'empty' ? '空' : '';
      }}</div>
      ${Show({ when: () => state() === 'success', kids: () => html`
        <ul id="list">
          ${For({ each: () => data(), kids: (item) => html`<li>${item}</li>` })}
        </ul>
      ` })}
      ${Show({ when: () => state() === 'error', kids: () => html`<button id="retry" @click=${load}>Retry</button>` })}
    </div>
  `, el);
}
