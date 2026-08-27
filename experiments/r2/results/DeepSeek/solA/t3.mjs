// t3.mjs
import { signal, effect, html } from '@af-mobile/ui';
export function mount(el, opts) {
  const load = opts?.loadData || (typeof window !== 'undefined' ? window.__loadData : null);
  el.innerHTML = `<button id="load">加载</button><div id="status"></div><ul id="list"></ul><button id="retry" hidden>重试</button>`;
  const status = signal('');
  const items = signal([]);
  const statusEl = el.querySelector('#status');
  const listEl = el.querySelector('#list');
  const retry = el.querySelector('#retry');
  effect(() => { statusEl.textContent = status(); });
  effect(() => { listEl.innerHTML = items().map((t) => `<li>${html`${t}`}</li>`).join(''); });
  const run = async () => {
    retry.hidden = true;
    items.set([]);
    status.set('加载中');
    try {
      const data = await load();
      if (!data || data.length === 0) status.set('空');
      else { items.set(data); status.set(''); }
    } catch {
      status.set('加载失败');
      retry.hidden = false;
    }
  };
  el.querySelector('#load').addEventListener('click', run);
  retry.addEventListener('click', run);
}