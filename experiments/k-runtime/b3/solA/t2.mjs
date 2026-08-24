import { signal, effect } from '../../../../src/lib/state.js';
import { html } from '../../../../src/lib/af-element.js';

export function mount(el) {
  el.innerHTML = `
    <input id="new" placeholder="输入待办，回车添加">
    <ul id="list"></ul>
    <p id="empty"></p>
  `;
  const items = signal([]);
  const list = el.querySelector('#list');
  const empty = el.querySelector('#empty');
  const input = el.querySelector('#new');
  effect(() => {
    list.innerHTML = items().map(it => html`<li>${it}</li>`).join('');
    empty.textContent = items().length ? '' : '暂无待办';
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
    const i = [...list.children].indexOf(li);
    items.set(arr => arr.filter((_, idx) => idx !== i));
  });
}
