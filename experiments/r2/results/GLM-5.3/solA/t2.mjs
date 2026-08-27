import { signal, effect, html } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = html`
    <input id="new" type="text" placeholder="输入待办，回车添加">
    <ul id="list"></ul>
    <p id="empty" hidden>暂无待办</p>
  `;
  const input = el.querySelector('#new');
  const list = el.querySelector('#list');
  const empty = el.querySelector('#empty');
  const todos = signal([]);
  effect(() => {
    const items = todos();
    list.innerHTML = items.map(t => html`<li>${t}</li>`).join('');
    empty.hidden = items.length > 0;
  });
  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const text = input.value.trim();
    if (!text) return;
    todos.set(v => [...v, text]);
    input.value = '';
  });
  list.addEventListener('click', e => {
    const li = e.target.closest('li');
    if (!li) return;
    const index = Array.from(list.children).indexOf(li);
    todos.set(v => v.filter((_, i) => i !== index));
  });
}
