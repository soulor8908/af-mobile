// t2.mjs
import { html, signal, For } from './k-flow.js';

export function mount(el, opts) {
  const todos = signal([]);

  el.append(html`
    <input id="new" @keydown=${(e) => {
      if (e.key === 'Enter') {
        const v = e.target.value.trim();
        if (v) {
          todos.set(t => [...t, v]);
          e.target.value = '';
        }
      }
    }} />
    <ul id="list">
      ${() => For({
        each: todos,
        kids: (item) => html`<li @click=${() => todos.set(t => t.filter(x => x !== item))}>${item}</li>`
      })}
    </ul>
    <div id="empty">${() => todos().length === 0 ? '暂无待办' : ''}</div>
  `);
}