import { signal, effect, html } from '@af-mobile/ui';

const STATUS = { pending: '加载中', error: '加载失败', empty: '空' };

export function mount(el, opts) {
  el.innerHTML = html`<button id="load">加载</button><div id="status"></div><ul id="list"></ul><button id="retry" hidden></button>`;
  const status = el.querySelector('#status');
  const list = el.querySelector('#list');
  const retry = el.querySelector('#retry');
  const state = signal({ phase: 'idle', items: [] });

  effect(() => {
    const { phase, items } = state();
    status.textContent = STATUS[phase] || '';
    list.innerHTML = items.map(it => html`<li>${it}</li>`).join('');
    retry.hidden = phase !== 'error';
    retry.textContent = phase === 'error' ? '重试' : '';
  });

  const run = async () => {
    state.set({ phase: 'pending', items: [] });
    try {
      const items = await (opts?.loadData || window.__loadData)();
      state.set({ phase: items.length === 0 ? 'empty' : 'ok', items });
    } catch {
      state.set({ phase: 'error', items: [] });
    }
  };

  el.querySelector('#load').addEventListener('click', run);
  retry.addEventListener('click', run);
}