import { signal, effect, html } from '@af-mobile/ui';

export function mount(el, opts) {
  el.innerHTML = html`
    <button id="load">加载</button>
    <button id="retry" hidden></button>
    <div id="status"></div>
    <ul id="list"></ul>
  `;
  const loadBtn = el.querySelector('#load');
  const retryBtn = el.querySelector('#retry');
  const status = el.querySelector('#status');
  const list = el.querySelector('#list');
  const loadData = (opts && opts.loadData) || window.__loadData;
  const state = signal({ phase: 'idle', items: [] });

  async function run() {
    state.set({ phase: 'pending', items: [] });
    try {
      const items = await loadData();
      state.set({ phase: 'success', items: items || [] });
    } catch {
      state.set({ phase: 'error', items: [] });
    }
  }

  effect(() => {
    const { phase, items } = state();
    status.textContent =
      phase === 'pending' ? '加载中' :
      phase === 'error' ? '加载失败' :
      phase === 'success' && items.length === 0 ? '空' : '';
    retryBtn.hidden = phase !== 'error';
    retryBtn.textContent = phase === 'error' ? '重试' : '';
    list.innerHTML = phase === 'success' && items.length > 0
      ? items.map(it => html`<li>${it}</li>`).join('')
      : '';
  });

  loadBtn.addEventListener('click', run);
  retryBtn.addEventListener('click', run);
}
