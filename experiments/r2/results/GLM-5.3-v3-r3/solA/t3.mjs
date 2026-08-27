import { signal, effect, html } from '@af-mobile/ui';

export function mount(el, opts) {
  el.innerHTML = html`<button id="load">加载</button><div id="status"></div><ul id="list"></ul><button id="retry" hidden></button>`;
  const status = el.querySelector('#status');
  const list = el.querySelector('#list');
  const retry = el.querySelector('#retry');
  const state = signal({ phase: 'idle', data: [] });
  const run = () => {
    const loader = (opts && opts.loadData) || window.__loadData;
    state.set({ phase: 'pending', data: [] });
    Promise.resolve().then(() => loader()).then(
      data => state.set({ phase: data.length ? 'success' : 'empty', data }),
      () => state.set({ phase: 'error', data: [] })
    );
  };
  effect(() => {
    const { phase, data } = state();
    status.textContent = phase === 'pending' ? '加载中' : phase === 'error' ? '加载失败' : phase === 'empty' ? '空' : '';
    list.innerHTML = data.map(it => html`<li>${it}</li>`).join('');
    retry.hidden = phase !== 'error';
    retry.textContent = phase === 'error' ? '重试' : '';
  });
  el.querySelector('#load').addEventListener('click', run);
  retry.addEventListener('click', run);
}