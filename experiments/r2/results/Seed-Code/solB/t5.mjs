// t5.mjs
import { html, signal, computed, Show, render } from './k-flow.js';
export function mount(el) {
  const name = signal('');
  const email = signal('');
  const preview = computed(() => `姓名：${name()} 邮箱：${email()}`);
  const emailValid = computed(() => email().includes('@'));
  render(() => html`
    <input id="name" .prop=${name} @input=${e => name.set(e.target.value)} />
    <input id="email" .prop=${email} @input=${e => email.set(e.target.value)} />
    ${Show({ when: () => !emailValid(), kids: () => html`<div id="err">邮箱格式错误</div>` })}
    <div id="preview">${preview}</div>
  `, el);
}