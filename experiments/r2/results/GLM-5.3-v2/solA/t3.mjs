import { signal, effect, html } from '@af-mobile/ui';

export function mount(el, opts) {
  el.innerHTML = html`<button id="load">加载</button><button id="retry" hidden></button><div id="status"></div><ul id="list"></ul>`;
  const loadBtn = el.querySelector('#load');
  const retry = el.querySelector('#retry');
  const status = el.querySelector('#status');
  const list = el.querySelector('#list');
  const loadFn = opts?.loadData ?? window.__loadData;
  const state = signal({ phase: 'idle', data: [] });

  async function run() {
    state.set({ phase: 'pending', data: [] });
    try {
      const data = await loadFn();
      state.set({ phase: 'done', data });
    } catch {
      state.set({ phase: 'error', data: [] });
    }
  }

  effect(() => {
    const { phase, data } = state();
    list.innerHTML = phase === 'done' ? data.map(it => html`<li>${it}</li>`).join('') : '';
    status.textContent =
      phase === 'pending' ? '加载中' :
      phase === 'error' ? '加载失败' :
      phase === 'done' && data.length === 0 ? '空' : '';
    retry.hidden = phase !== 'error';
    retry.textContent = phase === 'error' ? '重试' : '';
  });

  loadBtn.addEventListener('click', run);
  retry.addEventListener('click', run);
}
