import { signal, computed, effect, html } from '@af-mobile/ui';

export function mount(el) {
  const data = ['手机壳', '数据线', '手机膜', '充电器', '手机支架'];
  el.innerHTML = html`<input id="kw" type="text" placeholder="关键词"><span id="count"></span><ul id="list"></ul>`;
  const kw = el.querySelector('#kw');
  const count = el.querySelector('#count');
  const list = el.querySelector('#list');
  const q = signal('');
  const hits = computed(() => data.filter((it) => it.includes(q())));
  effect(() => {
    count.textContent = `共${hits().length}条`;
    list.innerHTML = hits().map((it) => html`<li>${it}</li>`).join('');
  });
  kw.addEventListener('input', () => q.set(kw.value));
}