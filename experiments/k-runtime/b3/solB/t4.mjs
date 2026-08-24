import { html, signal, computed, For, render } from '../../k-flow.js';

const ALL = ['手机壳', '数据线', '手机膜', '充电器', '手机支架'].map((text, id) => ({ id, text }));

export function mount(el) {
  const kw = signal('');
  const hits = computed(() => ALL.filter(x => x.text.includes(kw())));
  render(html`
    <input id="kw" @input=${(e) => kw.set(e.target.value)}>
    <span id="count">${() => `共${hits().length}条`}</span>
    <ul id="list">${For({ each: () => hits(), key: 'id', kids: (x) => html`<li>${x.text}</li>` })}</ul>
  `, el);
}
