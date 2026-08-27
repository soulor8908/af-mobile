import { html, signal, Show, Switch, For, render } from './k-flow.js';
export function mount(el, opts) {
  const loadData = opts.loadData || window.__loadData;
  const status = signal('idle');
  const data = signal([]);
  const load = async () => {
    status.set('pending');
    try {
      const res = await loadData();
      data.set(res);
      status.set(res.length === 0 ? 'empty' : 'success');
    } catch (e) {
      status.set('error');
    }
  };
  render(html`
    <div>
      <button id="load" @click=${load}>加载</button>
      <span id="status">${Switch({ when: () => status(), cases: { pending: () => html`加载中`, error: () => html`加载失败`, empty: () => html`空` }, def: () => html`` })}</span>
      ${Show({ when: () => status() === 'error', kids: () => html`<button id="retry" @click=${load}>重试</button>` })}
      <ul id="list">${() => status() === 'success' ? For({ each: data, kids: (item) => html`<li>${item}</li>` }) : html``}</ul>
    </div>
  `, el);
}