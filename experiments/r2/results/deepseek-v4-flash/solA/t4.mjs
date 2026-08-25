import { signal, effect, computed, html, escapeHtml } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = `
    <div id="app">
      <input id="kw" placeholder="搜索" />
      <div id="count"></div>
      <ul id="list"></ul>
    </div>
  `;

  const allItems = ['手机壳', '数据线', '手机膜', '充电器', '手机支架'];
  const kw = signal('');
  const filtered = computed(() => {
    const k = kw();
    return k ? allItems.filter(it => it.includes(k)) : allItems;
  });

  const countEl = el.querySelector('#count');
  const listEl = el.querySelector('#list');

  effect(() => {
    const arr = filtered();
    countEl.textContent = `共${arr.length}条`;
    listEl.innerHTML = arr.map(it => html`<li>${escapeHtml(it)}</li>`).join('');
  });

  el.querySelector('#kw').addEventListener('input', (e) => {
    kw.set(e.target.value);
  });
}
