import { html, signal, Switch, For, render } from './k-flow.js';

export function mount(el, opts) {
  const st = signal('idle');
  const data = signal([]);
  const load = async () => {
    st.set('pending');
    try {
      const d = await (opts.loadData || window.__loadData)();
      data.set(d);
      st.set(d.length ? 'ok' : 'empty');
    } catch { st.set('fail'); }
  };
  render(html`
    <button id="load" @click=${load}>加载</button>
    <span id="status">${Switch({
      when: st,
      cases: {
        pending: () => html`加载中`,
        empty: () => html`空`,
        fail: () => html`加载失败`,
      },
      def: () => html``,
    })}</span>
    <button id="retry" @click=${load}>${() => st() === 'fail' ? '重试' : ''}</button>
    <ul id="list">
      ${For({
        each: () => st() === 'ok' ? data() : [],
        kids: item => html`<li>${item}</li>`,
      })}
    </ul>
  `, el);
}
