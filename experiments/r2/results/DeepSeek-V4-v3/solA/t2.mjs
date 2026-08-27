import { signal, effect, html } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = html`
    <input id="new" type="text" placeholder="新待办">
    <ul id="list"></ul>
    <p id="empty"></p>
  `;
  const input = el.querySelector('#new');
  const list = el.querySelector('#list');
  const empty = el.querySelector('#empty');
  const items = signal([]);

  effect(() => {
    list.innerHTML = items().map((it, i) => html`<li data-i="${i}">${it}</li>`).join('');
    empty.textContent = items().length === 0 ? '暂无待办' : '';
  });

  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const v = input.value.trim();
    if (!v) return;
    items.set([...items(), v]);
    input.value = '';
  });

  list.addEventListener('click', e => {
    const li = e.target.closest('li');
    if (li) items.set(items().filter((_, i) => i !== Number(li.dataset.i)));
  });
}
