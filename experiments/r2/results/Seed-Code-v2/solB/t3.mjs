import { html, signal, computed, Show, For, render } from './k-flow.js';

export function mount(el, opts) {
  const loadData = opts.loadData || window.__loadData;
  const status = signal('idle');
  const data = signal([]);
  const statusText = computed(() => {
    switch (status()) {
      case 'pending': return '加载中';
      case 'error': return '加载失败';
      case 'empty': return '空';
      default: return '';
    }
  });
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
  const app = html`
    <div>
      <button id="load" @click=${load}>加载</button>
      <span id="status">${() => statusText()}</span>
      ${Show({
        when: () => status() === 'error',
        kids: () => html`<button id="retry" @click=${load}>重试</button>`
      })}
      <ul id="list">
        ${() => status() === 'success' ? For({
          each: data,
          kids: (item) => html`<li>${item}</li>`
        }) : html``}
      </ul>
    </div>
  `;
  render(app, el);
}