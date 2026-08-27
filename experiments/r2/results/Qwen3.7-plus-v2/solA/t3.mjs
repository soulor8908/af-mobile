import { signal, effect, html } from '@af-mobile/ui';
export function mount(el, opts) {
  el.innerHTML = html`<button id="load">加载</button><div id="status"></div><ul id="list"></ul><button id="retry" hidden>重试</button>`;
  const state = signal('idle'), data = signal([]);
  const status = el.querySelector('#status'), list = el.querySelector('#list');
  const loadBtn = el.querySelector('#load'), retryBtn = el.querySelector('#retry');
  effect(() => {
    const s = state();
    status.textContent = s === 'loading' ? '加载中' : s === 'error' ? '加载失败' : s === 'empty' ? '空' : '';
    retryBtn.hidden = s !== 'error';
    list.innerHTML = s === 'success' ? data().map(it => html`<li>${it}</li>`).join('') : '';
  });
  const load = async () => {
    state.set('loading');
    try {
      const arr = await opts.loadData();
      data.set(arr);
      state.set(arr.length ? 'success' : 'empty');
    } catch { state.set('error'); }
  };
  loadBtn.onclick = load;
  retryBtn.onclick = load;
}
