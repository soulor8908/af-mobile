import { html, signal, For, Show, render } from './k-flow.js';

export function mount(el, opts) {
  const loadData = opts.loadData || (() => window.__loadData());
  const state = signal('idle');
  const items = signal([]);

  const load = () => {
    state.set('pending');
    loadData()
      .then(data => {
        if (!data || !data.length) {
          items.set([]);
          state.set('empty');
        } else {
          items.set(data);
          state.set('success');
        }
      })
      .catch(() => state.set('error'));
  };

  render(html`
    <div>
      <button id="load" @click=${load}>加载</button>
      ${() => Show({ when: () => state() === 'pending', kids: () => html`<div id="status">加载中</div>` })}
      ${() => Show({ when: () => state() === 'empty', kids: () => html`<div id="status">空</div>` })}
      ${() => Show({ when: () => state() === 'error', kids: () => html`
        <div id="status">加载失败</div>
        <button id="retry" @click=${load}>重试</button>
      ` })}
      ${() => Show({ when: () => state() === 'success', kids: () => html`
        <ul id="list">${() => For({ each: () => items(), kids: (item) => html`<li>${item}</li>` })}</ul>
      ` })}
    </div>
  `, el);
}
