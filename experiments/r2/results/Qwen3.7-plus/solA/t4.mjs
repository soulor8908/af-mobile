// t4.mjs
import { signal, effect, html } from '@af-mobile/ui';
export function mount(el) {
  el.innerHTML = '<input id="kw"><div id="count"></div><ul id="list"></ul>';
  const all = ['手机壳', '数据线', '手机膜', '充电器', '手机支架'];
  const kw = signal(''), count = el.querySelector('#count'), list = el.querySelector('#list');
  effect(() => {
    const k = kw().trim(), f = k ? all.filter(x => x.includes(k)) : all;
    count.textContent = `共${f.length}条`;
    list.innerHTML = f.map(x => html`<li>${x}</li>`).join('');
  });
  el.querySelector('#kw').addEventListener('input', e => kw.set(e.target.value));
}