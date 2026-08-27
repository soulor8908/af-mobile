import { html, signal, For } from './k-flow.js';

export function mount(el, opts) {
  const loadData = opts.loadData || window.__loadData;
  const status = signal('idle');
  const items = signal([]);
  const load = async () => {
    status.set('loading');
    try {
      const data = await loadData();
      items.set(data);
      status.set(data.length ? 'ok' : 'empty');
    } catch (_) {
      status.set('error');
    }
  };
  el.append(html`
    <button id="load" @click=${load}>加载</button>
    <div id="status">${() => status() === 'loading' ? '加载中' : status() === 'error' ? '加载失败' : status() === 'empty' ? '空' : ''}</div>
    <ul id="list">${For({ each: items, kids: it => html`<li>${it}</li>` })}</ul>
    <button id="retry" hidden=${() => status() !== 'error'} @click=${load}>重试</button>
  `);
}