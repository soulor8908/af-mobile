import { signal, effect, html } from '@af-mobile/ui';
export function mount(el) {
  el.innerHTML = html`<input id="new"><ul id="list"></ul><div id="empty"></div>`;
  const input = el.querySelector('#new');
  const list = el.querySelector('#list');
  const empty = el.querySelector('#empty');
  const items = signal([]);
  effect(() => {
    list.innerHTML = items().map(it => html`<li>${it}</li>`).join('');
    empty.textContent = items().length ? '' : '暂无待办';
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim()) {
      items.set([...items(), input.value.trim()]);
      input.value = '';
    }
  });
  list.addEventListener('click', e => {
    const li = e.target.closest('li');
    if (li) items.set(items().filter((_, i) => i !== [...list.children].indexOf(li)));
  });
}