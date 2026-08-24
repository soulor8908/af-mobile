import { html, signal, For, Show, render } from '../../k-flow.js';

const LABEL = { pending: '加载中', error: '加载失败', empty: '空' };

export function mount(el, opts) {
  const state = signal('idle');
  const data = signal([]);
  const run = () => {
    state.set('pending');
    Promise.resolve(opts.loadData()).then(
      (list) => {
        const arr = Array.isArray(list) ? list : [];
        data.set(arr.map((text, id) => ({ id, text })));
        state.set(arr.length ? 'ok' : 'empty');
      },
      () => { data.set([]); state.set('error'); }
    );
  };
  render(html`
    <button id="load" @click=${run}>加载</button>
    <span id="status">${() => LABEL[state()] || ''}</span>
    ${Show({ when: () => state() === 'error', kids: () => html`<button id="retry" @click=${run}>重试</button>` })}
    <ul id="list">${For({ each: () => data(), key: 'id', kids: (it) => html`<li>${it.text}</li>` })}</ul>
  `, el);
}
