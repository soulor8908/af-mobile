import { signal, effect, html } from '@af-mobile/ui';

export function mount(el, opts) {
  el.innerHTML = '<button id="load">加载</button><div id="status"></div><ul id="list"></ul><button id="retry" style="display:none">重试</button>';
  const status = el.querySelector('#status');
  const list = el.querySelector('#list');
  const retry = el.querySelector('#retry');
  const loadData = opts.loadData || globalThis.window?.__loadData;
  const state = signal('idle');
  const items = signal([]);
  async function run() {
    state.set('pending');
    try {
      const data = await loadData();
      items.set(data);
      state.set(data.length ? 'done' : 'empty');
    } catch {
      state.set('error');
    }
  }
  effect(() => {
    const s = state();
    status.textContent = s === 'pending' ? '加载中' : s === 'empty' ? '空' : s === 'error' ? '加载失败' : '';
    retry.style.display = s === 'error' ? '' : 'none';
  });
  effect(() => {
    list.innerHTML = items().map(it => html`<li>${it}</li>`).join('');
  });
  el.querySelector('#load').addEventListener('click', run);
  retry.addEventListener('click', run);
}
