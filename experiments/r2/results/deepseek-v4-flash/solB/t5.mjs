import { html, signal, computed, render, Show } from './k-flow.js';

export function mount(el, opts) {
  const name = signal('');
  const email = signal('');
  const valid = computed(() => email().includes('@'));
  render(html`
    <input id="name" @input=${(e) => name.set(e.target.value)} />
    <input id="email" @input=${(e) => email.set(e.target.value)} />
    <div id="preview">${() => `姓名：${name()} 邮箱：${email()}`}</div>
    ${Show({ when: () => !valid(), kids: () => html`<div id="err">邮箱格式错误</div>` })}
  `, el);
}
