// t2.mjs
import { signal, effect, html } from '@af-mobile/ui';

export function mount(el, opts) {
  el.innerHTML = html`
    <div>
      <input id="new" placeholder="输入待办回车添加" />
      <ul id="list"></ul>
      <div id="empty"></div>
    </div>
  `;
  const items = signal([]);
  const newEl = el.querySelector('#new');
  const listEl = el.querySelector('#list');
  const emptyEl = el.querySelector('#empty');
  effect(() => {
    const arr = items();
    if (arr.length === 0) {
      listEl.innerHTML = '';
      emptyEl.textContent = '暂无待办';
    } else {
      listEl.innerHTML = arr.map(it => html`<li>${it}</li>`).join('');
      emptyEl.textContent = '';
    }
  });
  newEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = newEl.value.trim();
      if (val) {
        items.set(arr => [...arr, val]);
        newEl.value = '';
      }
    }
  });
  listEl.addEventListener('click', (e) => {
    if (e.target.tagName === 'LI') {
      const idx = Array.from(listEl.children).indexOf(e.target);
      items.set(arr => arr.filter((_, i) => i !== idx));
    }
  });
}