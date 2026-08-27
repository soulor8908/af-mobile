// t3.mjs
import { signal, effect, html } from '@af-mobile/ui';

export function mount(el, opts) {
  const status = signal('');
  const items = signal([]);
  const showRetry = signal(false);

  const load = (opts && opts.loadData) || window.__loadData;

  el.innerHTML = html`
    <div>
      <button id="load">加载</button>
      <div id="status"></div>
      <ul id="list"></ul>
      <button id="retry" style="display:none">重试</button>
    </div>
  `;

  const statusEl = el.querySelector('#status');
  const listEl = el.querySelector('#list');
  const retryBtn = el.querySelector('#retry');

  const run = async () => {
    status.set('加载中');
    items.set([]);
    showRetry.set(false);
    try {
      const data = await load();
      if (Array.isArray(data) && data.length > 0) {
        status.set('');
        items.set(data);
      } else {
        status.set('空');
        items.set([]);
      }
    } catch (err) {
      status.set('加载失败');
      showRetry.set(true);
    }
  };

  effect(() => { statusEl.textContent = status(); });
  effect(() => { retryBtn.style.display = showRetry() ? '' : 'none'; });
  effect(() => {
    listEl.innerHTML = items().map((it) => html`<li>${it}</li>`).join('');
  });

  el.querySelector('#load').addEventListener('click', run);
  retryBtn.addEventListener('click', run);
}