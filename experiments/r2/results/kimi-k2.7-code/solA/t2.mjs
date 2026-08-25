import { signal, effect, html, escapeHtml } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = html`
    <div>
      <input id="new" placeholder="回车添加待办">
      <ul id="list"></ul>
      <div id="empty" style="display:none">暂无待办</div>
    </div>
  `;
  const input = el.querySelector('#new');
  const list = el.querySelector('#list');
  const empty = el.querySelector('#empty');

  const todos = signal([]);

  effect(() => {
    const items = todos();
    list.innerHTML = items.map(t => `<li>${escapeHtml(t)}</li>`).join('');
    empty.style.display = items.length ? 'none' : 'block';
    list.querySelectorAll('li').forEach((li, i) => {
      li.addEventListener('click', () => todos.set(arr => arr.filter((_, idx) => idx !== i)));
    });
  });

  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const v = input.value.trim();
    if (!v) return;
    todos.set(arr => [...arr, v]);
    input.value = '';
  });
}
