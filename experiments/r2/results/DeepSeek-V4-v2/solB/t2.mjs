import { html, signal, For } from './k-flow.js';

export function mount(el) {
  const todos = signal([]);
  let id = 0;
  el.append(html`
    <input id="new" @keydown=${e => {
      if (e.key === 'Enter') {
        const v = e.target.value.trim();
        if (v) todos.set(t => [...t, { id: ++id, text: v }]);
        e.target.value = '';
      }
    }} />
    <ul id="list">${For({
      each: todos,
      key: 'id',
      kids: it => html`<li @click=${() => todos.set(t => t.filter(x => x.id !== it.id))}>${it.text}</li>`
    })}</ul>
    <div id="empty">${() => (todos().length ? '' : '暂无待办')}</div>
  `);
}