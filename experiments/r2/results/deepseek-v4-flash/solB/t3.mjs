import { html, signal, render, Switch, For } from './k-flow.js';

export function mount(el, opts) {
  const load = opts.loadData || window.__loadData;
  const status = signal('idle');
  const items = signal([]);
  const run = async () => {
    status.set('loading');
    try {
      const data = await load();
      items.set(data);
      status.set(data.length ? 'ok' : 'empty');
    } catch {
      status.set('err');
    }
  };
  render(html`
    <button id="load" @click=${run}>加载</button>
    ${Switch({
      when: status,
      cases: {
        loading: () => html`<div id="status">加载中</div>`,
        err: () => html`<div id="status">加载失败</div><button id="retry" @click=${run}>重试</button>`,
        empty: () => html`<div id="status">空</div>`,
      },
    })}
    <ul id="list">${For({ each: items, kids: (x) => html`<li>${x}</li>` })}</ul>
  `, el);
}
