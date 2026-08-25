import { html, signal, render, Show, For } from './k-flow.js';

export function mount(el, opts) {
  const todos = signal([]);
  const add = (e) => {
    if (e.key !== 'Enter') return;
    const v = e.target.value.trim();
    if (!v) return;
    todos.set([...todos(), v]);
    e.target.value = '';
  };
  render(html`
    <input id="new" @keydown=${add} />
    <ul id="list">
      ${For({ each: todos, kids: (t) => html`<li @click=${() => todos.set(todos().filter(x => x !== t))}>${t}</li>` })}
    </ul>
    ${Show({ when: () => todos().length === 0, kids: () => html`<div id="empty">暂无待办</div>` })}
  `, el);
}
