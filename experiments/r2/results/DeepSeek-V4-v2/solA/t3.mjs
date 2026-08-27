import { signal, effect, html } from '@af-mobile/ui';
export function mount(el, opts) {
  el.innerHTML = html`<button id="load">加载</button><span id="status"></span><ul id="list"></ul><button id="retry" hidden>重试</button>`;
  const loadData = (opts && opts.loadData) || window.__loadData;
  const status = el.querySelector('#status');
  const list = el.querySelector('#list');
  const retry = el.querySelector('#retry');
  const state = signal({ kind: 'idle', items: [] });
  function run() {
    state.set({ kind: 'pending', items: [] });
    loadData().then(
      items => state.set({ kind: items.length ? 'done' : 'empty', items }),
      () => state.set({ kind: 'error', items: [] })
    );
  }
  effect(() => {
    const s = state();
    list.innerHTML = s.items.map(it => html`<li>${it}</li>`).join('');
    status.textContent = s.kind === 'pending' ? '加载中' : s.kind === 'empty' ? '空' : s.kind === 'error' ? '加载失败' : '';
    retry.hidden = s.kind !== 'error';
  });
  el.querySelector('#load').addEventListener('click', run);
  retry.addEventListener('click', run);
}