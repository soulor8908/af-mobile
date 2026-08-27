import { signal, effect, html } from '@af-mobile/ui';

export function mount(el, opts) {
  el.innerHTML = html`<button id="load">加载</button><div id="status"></div><button id="retry" hidden>重试</button><ul id="list"></ul>`;
  const status = el.querySelector('#status');
  const retry = el.querySelector('#retry');
  const list = el.querySelector('#list');
  const load = (opts && opts.loadData) || window.__loadData;
  const st = signal({ phase: 'idle', items: [] });
  effect(() => {
    const { phase, items } = st();
    status.textContent = phase === 'pending' ? '加载中' : phase === 'error' ? '加载失败' : phase === 'empty' ? '空' : '';
    retry.hidden = phase !== 'error';
    list.innerHTML = phase === 'success' ? items.map(it => html`<li>${it}</li>`).join('') : '';
  });
  const run = () => {
    st.set({ phase: 'pending', items: [] });
    Promise.resolve().then(() => load())
      .then(items => st.set(Array.isArray(items) && items.length > 0 ? { phase: 'success', items } : { phase: 'empty', items: [] }))
      .catch(() => st.set({ phase: 'error', items: [] }));
  };
  el.querySelector('#load').addEventListener('click', run);
  retry.addEventListener('click', run);
}
