import { signal, effect, html, escapeHtml } from '@af-mobile/ui';

export function mount(el, opts) {
  el.innerHTML = `
    <div id="app">
      <button id="load">加载</button>
      <div id="status"></div>
      <ul id="list"></ul>
      <button id="retry" style="display:none">重试</button>
    </div>
  `;

  const status = signal('');
  const items = signal([]);
  const loading = signal(false);
  const statusEl = el.querySelector('#status');
  const listEl = el.querySelector('#list');
  const retryEl = el.querySelector('#retry');
  const loadEl = el.querySelector('#load');

  effect(() => {
    statusEl.textContent = status();
  });

  effect(() => {
    const arr = items();
    listEl.innerHTML = arr.map(it => html`<li>${escapeHtml(it)}</li>`).join('');
  });

  effect(() => {
    retryEl.style.display = loading() === 'error' ? '' : 'none';
  });

  async function doLoad() {
    status.set('加载中');
    items.set([]);
    loading.set('pending');
    try {
      const data = await opts.loadData();
      if (data.length === 0) {
        status.set('空');
      } else {
        status.set('');
        items.set(data);
      }
      loading.set('done');
    } catch {
      status.set('加载失败');
      loading.set('error');
    }
  }

  loadEl.addEventListener('click', doLoad);
  retryEl.addEventListener('click', doLoad);
}
