// t3.mjs
import { signal, effect, html } from '@af-mobile/ui';

export function mount(el, opts) {
  el.innerHTML = html`
    <div>
      <button id="load">加载</button>
      <span id="status"></span>
      <ul id="list"></ul>
      <button id="retry" style="display:none">重试</button>
    </div>
  `;
  const loading = signal(false);
  const loaded = signal(false);
  const items = signal([]);
  const error = signal(false);
  const statusEl = el.querySelector('#status');
  const listEl = el.querySelector('#list');
  const retryBtn = el.querySelector('#retry');
  const doLoad = async () => {
    loading.set(true);
    error.set(false);
    loaded.set(false);
    items.set([]);
    try {
      const res = await opts.loadData();
      loading.set(false);
      loaded.set(true);
      items.set(res);
    } catch (e) {
      loading.set(false);
      error.set(true);
    }
  };
  effect(() => {
    if (loading()) {
      statusEl.textContent = '加载中';
      retryBtn.style.display = 'none';
      listEl.innerHTML = '';
    } else if (error()) {
      statusEl.textContent = '加载失败';
      retryBtn.style.display = '';
      listEl.innerHTML = '';
    } else if (!loaded()) {
      statusEl.textContent = '';
      retryBtn.style.display = 'none';
      listEl.innerHTML = '';
    } else if (items().length === 0) {
      statusEl.textContent = '空';
      retryBtn.style.display = 'none';
      listEl.innerHTML = '';
    } else {
      statusEl.textContent = '';
      retryBtn.style.display = 'none';
      listEl.innerHTML = items().map(it => html`<li>${it}</li>`).join('');
    }
  });
  el.querySelector('#load').addEventListener('click', doLoad);
  retryBtn.addEventListener('click', doLoad);
}