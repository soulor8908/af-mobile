import { signal, computed, effect, html } from '@af-mobile/ui';

export function mount(el, opts) {
  el.innerHTML = '<input id="kw" placeholder="搜索"><div id="count">共5条</div><ul id="list"></ul>';
  const kw = el.querySelector('#kw');
  const count = el.querySelector('#count');
  const list = el.querySelector('#list');
  const data = ['手机壳', '数据线', '手机膜', '充电器', '手机支架'];
  const keyword = signal('');
  const items = computed(() => data.filter(d => d.includes(keyword())));
  effect(() => { count.textContent = `共${items().length}条`; });
  effect(() => { list.innerHTML = items().map(d => html`<li>${d}</li>`).join(''); });
  kw.addEventListener('input', () => keyword.set(kw.value));
}
