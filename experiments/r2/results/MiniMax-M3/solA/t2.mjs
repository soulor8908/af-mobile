// t2.mjs
import { signal, effect, html } from '@af-mobile/ui';

export function mount(el, opts) {
  const todos = signal([]);

  el.innerHTML = html`
    <div>
      <input id="new" placeholder="输入待办后回车" />
      <ul id="list"></ul>
      <div id="empty">暂无待办</div>
    </div>
  `;

  const input = el.querySelector('#new');
  const list = el.querySelector('#list');
  const empty = el.querySelector('#empty');

  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const v = input.value.trim();
    if (!v) return;
    todos.set([...todos(), v]);
    input.value = '';
  });

  effect(() => {
    const items = todos();
    list.innerHTML = items.map((it, i) => html`<li data-i="${i}">${it}</li>`).join('');
    empty.style.display = items.length === 0 ? '' : 'none';
  });

  list.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const i = Number(li.dataset.i);
    todos.set(todos().filter((_, idx) => idx !== i));
  });
}