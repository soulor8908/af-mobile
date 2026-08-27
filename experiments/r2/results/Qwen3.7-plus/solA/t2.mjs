// t2.mjs
import { signal, effect, html } from '@af-mobile/ui';
export function mount(el) {
  el.innerHTML = '<input id="new"><ul id="list"></ul><div id="empty"></div>';
  const items = signal([]), list = el.querySelector('#list'), empty = el.querySelector('#empty');
  const render = () => {
    list.innerHTML = items().map((t, i) => html`<li>${t}</li>`).join('');
    empty.style.display = items().length ? 'none' : '';
    empty.textContent = items().length ? '' : '暂无待办';
    list.querySelectorAll('li').forEach((li, i) => li.onclick = () => items.set(items().filter((_, j) => j !== i)));
  };
  effect(render);
  el.querySelector('#new').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.value.trim()) { items.set([...items(), e.target.value.trim()]); e.target.value = ''; }
  });
}