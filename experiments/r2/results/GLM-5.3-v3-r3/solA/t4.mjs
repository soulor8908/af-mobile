import { signal, computed, effect, html } from '@af-mobile/ui';

export function mount(el, opts) {
  const all = ['手机壳', '数据线', '手机膜', '充电器', '手机支架'];
  el.innerHTML = html`<input id="kw" placeholder="关键词"><div id="count"></div><ul id="list"></ul>`;
  const kw = el.querySelector('#kw');
  const count = el.querySelector('#count');
  const list = el.querySelector('#list');
  const keyword = signal('');
  const matched = computed(() => all.filter(it => it.includes(keyword())));
  effect(() => {
    count.textContent = `共${matched().length}条`;
    list.innerHTML = matched().map(it => html`<li>${it}</li>`).join('');
  });
  kw.addEventListener('input', () => keyword.set(kw.value));
}