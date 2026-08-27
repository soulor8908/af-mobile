import { signal, effect, html, escapeHtml } from '@af-mobile/ui';

export function mount(el, opts) {
  const loader = (opts && opts.loadData) || (typeof window !== 'undefined' && window.__loadData);
  el.innerHTML = html`
    <button id="load">加载</button>
    <div id="status"></div>
    <ul id="list"></ul>
    <button id="retry" hidden>重试</button>
  `;
  const status = el.querySelector('#status');
  const list = el.querySelector('#list');
  const retry = el.querySelector('#retry');
  const state = signal('idle');
  const data = signal([]);
  const load = () => {
    state.set('pending');
    list.innerHTML = '';
    Promise.resolve()
      .then(() => loader())
      .then(arr => {
        data.set(Array.isArray(arr) ? arr : []);
        state.set('success');
      })
      .catch(() => {
        state.set('error');
      });
  };
  effect(() => {
    const s = state();
    if (s === 'pending') {
      status.textContent = '加载中';
      retry.hidden = true;
    } else if (s === 'error') {
      status.textContent = '加载失败';
      retry.hidden = false;
    } else if (s === 'success') {
      const arr = data();
      status.textContent = arr.length === 0 ? '空' : '';
      list.innerHTML = arr.map(it => html`<li>${escapeHtml(String(it))}</li>`).join('');
      retry.hidden = true;
    }
  });
  el.querySelector('#load').addEventListener('click', load);
  retry.addEventListener('click', load);
}
