import { signal, effect, html } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = html`<input id="new" type="text"><ul id="list"></ul><div id="empty"></div>`;
  const input = el.querySelector('#new');
  const list = el.querySelector('#list');
  const empty = el.querySelector('#empty');
  const items = signal([]);
  effect(() => {
    const arr = items();
    list.innerHTML = arr.map(it => html`<li>${it}</li>`).join('');
    empty.textContent = arr.length === 0 ? '暂无待办' : '';
  });
  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const v = input.value.trim();
    if (!v) return;
    items.set(arr => [...arr, v]);
    input.value = '';
  });
  list.addEventListener('click', e => {
    const li = e.target.closest('li');
    if (!li) return;
    const idx = [...list.children].indexOf(li);
    items.set(arr => arr.filter((_, i) => i !== idx));
  });
}
