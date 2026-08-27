import { html, signal, render } from './k-flow.js';

export function mount(el) {
  const items = signal([]);
  const add = e => {
    if (e.key !== 'Enter') return;
    const v = e.target.value.trim();
    if (!v) return;
    items.set([...items(), v]);
    e.target.value = '';
  };
  const rm = i => items.set(items().filter((_, j) => j !== i));
  render(html`
    <input id="new" @keydown=${add} />
    <ul id="list">
      ${() => items().map((t, i) => html`<li @click=${() => rm(i)}>${t}</li>`)}
    </ul>
    <span id="empty">${() => items().length ? '' : '暂无待办'}</span>
  `, el);
}
