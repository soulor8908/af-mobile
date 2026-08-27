// t3.mjs
import { html, signal, batch, For, Show } from './k-flow.js';

export function mount(el, opts) {
  const status = signal('');
  const error = signal(false);
  const data = signal([]);
  const load = (opts && opts.loadData) || window.__loadData;

  const doLoad = () => {
    batch(() => {
      status.set('加载中');
      error.set(false);
      data.set([]);
    });
    Promise.resolve(load()).then(
      (items) => {
        data.set(items);
        status.set(items.length === 0 ? '空' : '');
      },
      () => {
        error.set(true);
        status.set('加载失败');
      }
    );
  };

  el.append(html`
    <button id="load" @click=${doLoad}>加载</button>
    <span id="status">${() => status()}</span>
    <ul id="list">
      ${() => For({
        each: data,
        kids: (item) => html`<li>${item}</li>`
      })}
    </ul>
    ${() => Show({
      when: error,
      kids: () => html`<button id="retry" @click=${doLoad}>重试</button>`
    })}
  `);
}