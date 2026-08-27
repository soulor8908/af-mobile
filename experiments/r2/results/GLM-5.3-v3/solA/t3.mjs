import { signal, effect, html } from '@af-mobile/ui';

export function mount(el, opts) {
  const loadData = (opts && opts.loadData) || window.__loadData;
  el.innerHTML = html`<button id="load">加载</button><div id="status"></div><button id="retry" hidden></button><ul id="list"></ul>`;
  const status = el.querySelector('#status');
  const list = el.querySelector('#list');
  const retry = el.querySelector('#retry');
  const text = signal('');
  const items = signal([]);
  const failed = signal(false);
  effect(() => { status.textContent = text(); });
  effect(() => { list.innerHTML = items().map((it) => html`<li>${it}</li>`).join(''); });
  effect(() => {
    retry.hidden = !failed();
    retry.textContent = failed() ? '重试' : '';
  });
  const run = () => {
    text.set('加载中');
    items.set([]);
    failed.set(false);
    Promise.resolve()
      .then(() => loadData())
      .then((data) => {
        items.set(data);
        text.set(data.length ? '' : '空');
      })
      .catch(() => {
        failed.set(true);
        text.set('加载失败');
      });
  };
  el.querySelector('#load').addEventListener('click', run);
  retry.addEventListener('click', run);
}