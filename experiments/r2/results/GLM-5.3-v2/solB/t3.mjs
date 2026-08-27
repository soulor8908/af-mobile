import { html, signal, Show, For, render } from './k-flow.js';

const STATUS = { pending: '加载中', error: '加载失败', empty: '空' };

export function mount(el, opts) {
  const state = signal('idle');
  const items = signal([]);
  const run = () => {
    state.set('pending');
    const loadData = (opts && opts.loadData) || window.__loadData;
    loadData()
      .then(list => {
        items.set(list);
        state.set(list.length ? 'ok' : 'empty');
      })
      .catch(() => state.set('error'));
  };
  render(html`
    <div>
      <button id="load" @click=${run}>加载</button>
      ${Show({ when: () => state() === 'error', kids: () => html`<button id="retry" @click=${run}>重试</button>` })}
      <div id="status">${() => STATUS[state()] || ''}</div>
      <ul id="list">
        ${For({ each: items, kids: item => html`<li>${item}</li>` })}
      </ul>
    </div>
  `, el);
}
