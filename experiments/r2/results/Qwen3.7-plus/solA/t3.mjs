// t3.mjs
import { signal, effect, html } from '@af-mobile/ui';
export function mount(el, opts) {
  el.innerHTML = '<button id="load">加载</button><div id="status"></div><ul id="list"></ul><button id="retry" style="display:none">重试</button>';
  const state = signal({ s: 'idle', data: [] });
  const status = el.querySelector('#status'), list = el.querySelector('#list'), retry = el.querySelector('#retry');
  const load = async () => {
    state.set({ s: 'pending', data: [] });
    try { const d = await opts.loadData(); state.set({ s: 'ok', data: d }); }
    catch { state.set({ s: 'err', data: [] }); }
  };
  effect(() => {
    const { s, data } = state();
    if (s === 'pending') { status.textContent = '加载中'; status.style.display = ''; list.innerHTML = ''; retry.style.display = 'none'; }
    else if (s === 'err') { status.textContent = '加载失败'; status.style.display = ''; list.innerHTML = ''; retry.style.display = ''; }
    else if (s === 'ok' && !data.length) { status.textContent = '空'; status.style.display = ''; list.innerHTML = ''; retry.style.display = 'none'; }
    else { status.textContent = ''; status.style.display = 'none'; list.innerHTML = data.map(t => html`<li>${t}</li>`).join(''); retry.style.display = 'none'; }
  });
  el.querySelector('#load').onclick = load;
  retry.onclick = load;
}