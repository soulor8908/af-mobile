import { signal, effect, html } from '@af-mobile/ui';
export function mount(el) {
  el.innerHTML = html`<input id="new"><ul id="list"></ul><div id="empty"></div>`;
  const items = signal([]);
  const list = el.querySelector('#list'), empty = el.querySelector('#empty'), input = el.querySelector('#new');
  effect(() => {
    const arr = items();
    list.innerHTML = arr.map(it => html`<li>${it}</li>`).join('');
    empty.textContent = arr.length ? '' : '暂无待办';
  });
  input.onkeydown = e => {
    if (e.key === 'Enter' && input.value.trim()) {
      items.set([...items(), input.value.trim()]);
      input.value = '';
    }
  };
  list.onclick = e => {
    if (e.target.tagName === 'LI') {
      const idx = [...list.children].indexOf(e.target);
      items.set(items().filter((_, i) => i !== idx));
    }
  };
}
