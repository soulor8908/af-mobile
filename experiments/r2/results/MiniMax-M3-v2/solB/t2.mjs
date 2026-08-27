import { html, signal, For, Show, render } from './k-flow.js';

export function mount(el) {
  const items = signal([]);
  let nextId = 0;
  const add = (text) => {
    if (!text) return;
    items.set([...items(), { id: ++nextId, text }]);
  };
  const remove = (id) => items.set(items().filter(i => i.id !== id));
  render(() => html`
    <div>
      <input id="new" type="text" @keydown=${(e) => {
        if (e.key === 'Enter') {
          add(e.target.value.trim());
          e.target.value = '';
        }
      }} />
      <ul id="list">
        ${For({ each: () => items(), key: 'id', kids: (item) => html`<li @click=${() => remove(item.id)}>${item.text}</li>` })}
      </ul>
      ${Show({ when: () => items().length === 0, kids: () => html`<div id="empty">暂无待办</div>` })}
    </div>
  `, el);
}
