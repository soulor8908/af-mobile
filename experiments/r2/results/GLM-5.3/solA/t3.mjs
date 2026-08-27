import { signal, effect, html } from '@af-mobile/ui';

export function mount(el, opts) {
  el.innerHTML = html`
    <button id="load">加载</button>
    <p id="status" hidden></p>
    <button id="retry" hidden>重试</button>
    <ul id="list"></ul>
  `;
  const load = el.querySelector('#load');
  const status = el.querySelector('#status');
  const retry = el.querySelector('#retry');
  const list = el.querySelector('#list');
  const items = signal([]);
  const state = signal('idle');
  const getData = () => (opts && opts.loadData) || window.__loadData;
  effect(() => {
    const s = state();
    const data = items();
    status.hidden = !(s === 'pending' || s === 'error' || s === 'empty');
    status.textContent = s === 'pending' ? '加载中' : s === 'error' ? '加载失败' : s === 'empty' ? '空' : '';
    retry.hidden = s !== 'error';
    list.innerHTML = s === 'success' ? data.map(it => html`<li>${it}</li>`).join('') : '';
  });
  const run = async () => {
    const fn = getData();
    if (typeof fn !== 'function') { state.set('error'); return; }
    state.set('pending');
    try {
      const data = await fn();
      items.set(Array.isArray(data) ? data : []);
      state.set(data && data.length ? 'success' : 'empty');
    } catch { state.set('error'); }
  };
  load.addEventListener('click', run);
  retry.addEventListener('click', run);
}
