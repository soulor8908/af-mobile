import { signal, effect, html } from '@af-mobile/ui';

export function mount(el, opts) {
  el.innerHTML = '<input id="new" placeholder="输入待办"><ul id="list"></ul><div id="empty">暂无待办</div>';
  const input = el.querySelector('#new');
  const list = el.querySelector('#list');
  const empty = el.querySelector('#empty');
  const todos = signal([]);
  effect(() => {
    list.innerHTML = todos().map(t => html`<li>${t}</li>`).join('');
    empty.style.display = todos().length ? 'none' : '';
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const v = input.value.trim();
      if (v) {
        todos.set([...todos(), v]);
        input.value = '';
      }
    }
  });
  list.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (li) todos.set(todos().filter((_, i) => i !== [...list.children].indexOf(li)));
  });
}
