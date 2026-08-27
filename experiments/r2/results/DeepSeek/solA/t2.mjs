// t2.mjs
import { signal, effect, html } from '@af-mobile/ui';
export function mount(el, opts) {
  el.innerHTML = `<input id="new"><ul id="list"></ul><div id="empty" hidden>暂无待办</div>`;
  const todos = signal([]);
  const input = el.querySelector('#new');
  const list = el.querySelector('#list');
  const empty = el.querySelector('#empty');
  effect(() => {
    list.innerHTML = todos().map((t) => `<li>${html`${t}`}</li>`).join('');
    empty.hidden = todos().length !== 0;
  });
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const v = input.value.trim();
    if (!v) return;
    todos.set([...todos(), v]);
    input.value = '';
  });
  list.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    todos.set(todos().filter((_, i) => i !== [...list.children].indexOf(li)));
  });
}