import { signal, effect, html, escapeHtml } from '@af-mobile/ui';

export function mount(el, opts) {
  el.innerHTML = html`
    <div>
      <button id="load">加载</button>
      <div id="status"></div>
      <ul id="list"></ul>
      <button id="retry" style="display:none">重试</button>
    </div>
  `;
  const loadBtn = el.querySelector('#load');
  const status = el.querySelector('#status');
  const list = el.querySelector('#list');
  const retryBtn = el.querySelector('#retry');

  const state = signal({ type: 'idle' });

  const load = async () => {
    state.set({ type: 'pending' });
    try {
      const data = await opts.loadData();
      state.set({ type: data.length ? 'success' : 'empty', data });
    } catch {
      state.set({ type: 'error' });
    }
  };

  effect(() => {
    const s = state();
    status.textContent = '';
    list.innerHTML = '';
    retryBtn.style.display = 'none';
    if (s.type === 'pending') status.textContent = '加载中';
    if (s.type === 'empty') status.textContent = '空';
    if (s.type === 'error') {
      status.textContent = '加载失败';
      retryBtn.style.display = 'inline-block';
    }
    if (s.type === 'success') {
      list.innerHTML = s.data.map(it => `<li>${escapeHtml(it)}</li>`).join('');
    }
  });

  loadBtn.addEventListener('click', load);
  retryBtn.addEventListener('click', load);
}
