import { signal, effect, html } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = html`<input id="new"><ul id="list"></ul><div id="empty"></div>`;
  const input = el.querySelector('#new');
  const list = el.querySelector('#list');
  const empty = el.querySelector('#empty');
  const items = signal([]);

  effect(() => {
    list.innerHTML = items().map((it, i) => html`<li data-i="${i}">${it}</li>`).join('');
    empty.hidden = items().length > 0;
    empty.textContent = items().length === 0 ? '暂无待办' : '';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const v = input.value.trim();
    if (!v) return;
    items.set([...items(), v]);
    input.value = '';
  });

  list.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    items.set(items().filter((_, idx) => idx !== Number(li.dataset.i)));
  });
}