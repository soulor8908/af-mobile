import { signal, effect, html } from '@af-mobile/ui';

export function mount(el, opts) {
  el.innerHTML = html`<input id="new" placeholder="回车添加"><ul id="list"></ul><div id="empty"></div>`;
  const input = el.querySelector('#new');
  const list = el.querySelector('#list');
  const empty = el.querySelector('#empty');
  const items = signal([]);
  effect(() => {
    list.innerHTML = items().map(it => html`<li>${it}</li>`).join('');
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
    if (e.target.tagName !== 'LI') return;
    const i = [...list.children].indexOf(e.target);
    items.set(items().filter((_, idx) => idx !== i));
  });
}