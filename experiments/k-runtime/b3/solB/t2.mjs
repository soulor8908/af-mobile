import { html, signal, For, render } from '../../k-flow.js';

export function mount(el) {
  const items = signal([]);
  let next = 1;
  const add = (e) => {
    if (e.key !== 'Enter') return;
    const v = e.target.value.trim();
    if (!v) return;
    items.set(list => [...list, { id: next++, text: v }]);
    e.target.value = '';
  };
  const del = (id) => items.set(list => list.filter(x => x.id !== id));
  render(html`
    <input id="new" @keydown=${add}>
    <ul id="list">${For({ each: () => items(), key: 'id', kids: (it) => html`<li @click=${() => del(it.id)}>${it.text}</li>` })}</ul>
    <div id="empty">${() => (items().length ? '' : '暂无待办')}</div>
  `, el);
}
