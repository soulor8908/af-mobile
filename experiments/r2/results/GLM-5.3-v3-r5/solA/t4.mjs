import { signal, computed, effect, html } from '@af-mobile/ui';

const DATA = ['手机壳', '数据线', '手机膜', '充电器', '手机支架'];

export function mount(el) {
  el.innerHTML = html`<input id="kw" /><div id="count"></div><ul id="list"></ul>`;
  const kw = signal('');
  const hits = computed(() => DATA.filter(it => it.includes(kw())));
  const count = el.querySelector('#count');
  const list = el.querySelector('#list');
  effect(() => {
    count.textContent = `共${hits().length}条`;
    list.innerHTML = hits().map(it => html`<li>${it}</li>`).join('');
  });
  el.querySelector('#kw').addEventListener('input', e => kw.set(e.target.value));
}
