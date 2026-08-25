import { html, signal, For, Show, render } from './k-flow.js';

export function mount(el) {
  const todos = signal([]);
  let nextId = 1;

  const add = (text) => {
    const t = text.trim();
    if (!t) return;
    todos.set(a => [...a, { id: nextId++, text: t }]);
  };

  const remove = (id) => {
    todos.set(a => a.filter(item => item.id !== id));
  };

  render(html`
    <div>
      <input id="new" placeholder="输入待办，回车添加" @keydown=${e => e.key === 'Enter' && add(e.target.value)}>
      <ul id="list">
        ${() => For({ each: () => todos(), key: 'id', kids: (item) => html`<li @click=${() => remove(item.id)}>${item.text}</li>` })}
      </ul>
      ${() => Show({ when: () => !todos().length, kids: () => html`<div id="empty">暂无待办</div>` })}
    </div>
  `, el);
}
