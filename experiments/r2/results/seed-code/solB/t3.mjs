// t3.mjs
import { html, signal, Switch, For, render } from './k-flow.js';
export function mount(el, opts = {}) {
  const status = signal('idle');
  const items = signal([]);
  const load = async () => {
    status.set('pending');
    const loader = opts.loadData || (typeof window !== 'undefined' ? window.__loadData : null);
    if (!loader) { status.set('error'); return; }
    try {
      const res = await loader();
      items.set(res);
      status.set(res.length === 0 ? 'empty' : 'success');
    } catch {
      status.set('error');
    }
  };
  render(() => html`
    <button id="load" @click=${load}>加载</button>
    ${Switch({
      when: () => status(),
      cases: {
        pending: () => html`<div id="status">加载中</div>`,
        success: () => html`<ul id="list">${For({ each: () => items(), kids: (item) => html`<li>${item}</li>` })}</ul>`,
        error: () => html`<div id="status">加载失败</div><button id="retry" @click=${load}>重试</button>`,
        empty: () => html`<div id="status">空</div>`
      },
      def: () => html``
    })}
  `, el);
}