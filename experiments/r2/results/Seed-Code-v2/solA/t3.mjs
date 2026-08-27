import { signal, effect, html } from '@af-mobile/ui';
export function mount(el, opts = {}) {
  el.innerHTML = html`<button id="load">加载</button><div id="status"></div><ul id="list"></ul><button id="retry" hidden>重试</button>`;
  const load = el.querySelector('#load');
  const status = el.querySelector('#status');
  const list = el.querySelector('#list');
  const retry = el.querySelector('#retry');
  const items = signal([]);
  const phase = signal('idle');
  effect(() => {
    const p = phase();
    list.innerHTML = items().map((it) => html`<li>${it}</li>`).join('');
    if (p === 'pending') { status.textContent = '加载中'; retry.hidden = true; }
    else if (p === 'success') {
      const arr = items();
      status.textContent = arr.length === 0 ? '空' : '';
      retry.hidden = true;
    } else if (p === 'error') { status.textContent = '加载失败'; retry.hidden = false; }
    else { status.textContent = ''; retry.hidden = true; }
  });
  async function run() {
    const fn = opts.loadData || window.__loadData;
    if (!fn) { phase.set('error'); return; }
    phase.set('pending');
    try {
      const data = await fn();
      items.set(data || []);
      phase.set('success');
    } catch {
      phase.set('error');
    }
  }
  load.addEventListener('click', run);
  retry.addEventListener('click', run);
}