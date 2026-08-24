import { signal, effect } from '../../../../src/lib/state.js';
import { html } from '../../../../src/lib/af-element.js';

const STATUS_TEXT = { pending: '加载中', error: '加载失败', empty: '空' };

export function mount(el, opts) {
  el.innerHTML = `
    <button id="load">加载</button>
    <p id="status"></p>
    <button id="retry" hidden>重试</button>
    <ul id="list"></ul>
  `;
  const state = signal({ phase: 'idle', data: [] });
  const status = el.querySelector('#status');
  const retry = el.querySelector('#retry');
  const list = el.querySelector('#list');
  effect(() => {
    const { phase, data } = state();
    status.textContent = STATUS_TEXT[phase] ?? '';
    retry.hidden = phase !== 'error';
    list.innerHTML = phase === 'success' ? data.map(it => html`<li>${it}</li>`).join('') : '';
  });
  async function run() {
    state.set({ phase: 'pending', data: [] });
    try {
      const data = await opts.loadData();
      state.set({ phase: data.length ? 'success' : 'empty', data });
    } catch {
      state.set({ phase: 'error', data: [] });
    }
  }
  el.querySelector('#load').addEventListener('click', run);
  retry.addEventListener('click', run);
}
