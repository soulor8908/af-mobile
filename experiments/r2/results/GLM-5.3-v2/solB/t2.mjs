import { html, signal, Show, For, render } from './k-flow.js';

export function mount(el) {
  const todos = signal([]);
  let uid = 0;
  render(html`
    <div>
      <input id="new" @keydown=${e => {
        if (e.key !== 'Enter') return;
        const v = e.target.value.trim();
        if (v) todos.set(list => [...list, { id: ++uid, text: v }]);
        e.target.value = '';
      }}>
      <ul id="list">
        ${For({
          each: todos,
          key: 'id',
          kids: t => html`<li @click=${() => todos.set(list => list.filter(x => x.id !== t.id))}>${t.text}</li>`
        })}
      </ul>
      ${Show({ when: () => todos().length === 0, kids: () => html`<div id="empty">暂无待办</div>` })}
    </div>
  `, el);
}
