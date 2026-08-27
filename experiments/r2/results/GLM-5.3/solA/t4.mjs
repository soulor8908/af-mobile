import { signal, computed, effect, html } from '@af-mobile/ui';

const ALL = ['手机壳', '数据线', '手机膜', '充电器', '手机支架'];

export function mount(el) {
  el.innerHTML = html`
    <input id="kw" type="text" placeholder="输入关键词">
    <span id="count">共0条</span>
    <ul id="list"></ul>
  `;
  const kw = el.querySelector('#kw');
  const count = el.querySelector('#count');
  const list = el.querySelector('#list');
  const keyword = signal('');
  const result = computed(() => {
    const k = keyword().trim();
    return k ? ALL.filter(it => it.includes(k)) : ALL;
  });
  effect(() => {
    list.innerHTML = result().map(it => html`<li>${it}</li>`).join('');
    count.textContent = `共${result().length}条`;
  });
  kw.addEventListener('input', () => keyword.set(kw.value));
}
