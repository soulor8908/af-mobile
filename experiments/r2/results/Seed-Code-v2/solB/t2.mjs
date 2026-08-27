import { html, signal, Show, For, render } from './k-flow.js';
export function mount(el, opts) {
  const todos = signal([]);
  const addTodo = (e) => {
    if (e.key === 'Enter') {
      const val = e.target.value.trim();
      if (!val) return;
      todos.set(prev => [...prev, val]);
      e.target.value = '';
    }
  };
  const app = html`
    <div>
      <input id="new" @keydown=${addTodo} />
      <ul id="list">
        ${For({
          each: todos,
          kids: (item) => html`<li @click=${() => todos.set(prev => prev.filter(t => t !== item))}>${item}</li>`
        })}
      </ul>
      ${Show({
        when: () => todos().length === 0,
        kids: () => html`<div id="empty">暂无待办</div>`
      })}
    </div>
  `;
  render(app, el);
}