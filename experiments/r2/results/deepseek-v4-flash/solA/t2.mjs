import { signal, effect, html, escapeHtml } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = `
    <div id="app">
      <input id="new" placeholder="添加待办" />
      <ul id="list"></ul>
      <div id="empty" style="display:none">暂无待办</div>
    </div>
  `;

  const todos = signal([]);
  const listEl = el.querySelector('#list');
  const emptyEl = el.querySelector('#empty');
  const inputEl = el.querySelector('#new');

  effect(() => {
    const items = todos();
    listEl.innerHTML = items.map((t, i) => html`<li data-i="${i}">${escapeHtml(t)}</li>`).join('');
    emptyEl.style.display = items.length === 0 ? '' : 'none';
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = inputEl.value.trim();
      if (!val) return;
      todos.set(arr => [...arr, val]);
      inputEl.value = '';
    }
  });

  listEl.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const i = Number(li.dataset.i);
    todos.set(arr => arr.filter((_, idx) => idx !== i));
  });
}
