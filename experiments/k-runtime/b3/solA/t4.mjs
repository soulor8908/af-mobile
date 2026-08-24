import { signal, computed, effect } from '../../../../src/lib/state.js';
import { html } from '../../../../src/lib/af-element.js';

const ALL = ['手机壳', '数据线', '手机膜', '充电器', '手机支架'];

export function mount(el) {
  el.innerHTML = `
    <input id="kw" placeholder="搜索关键词">
    <span id="count"></span>
    <ul id="list"></ul>
  `;
  const kw = signal('');
  const hits = computed(() => ALL.filter(it => it.includes(kw())));
  const countEl = el.querySelector('#count');
  const list = el.querySelector('#list');
  effect(() => {
    countEl.textContent = `共${hits().length}条`;
    list.innerHTML = hits().map(it => html`<li>${it}</li>`).join('');
  });
  el.querySelector('#kw').addEventListener('input', e => kw.set(e.target.value));
}
