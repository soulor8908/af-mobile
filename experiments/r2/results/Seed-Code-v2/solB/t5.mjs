import { html, signal, computed, Show, render } from './k-flow.js';

export function mount(el, opts) {
  const name = signal('');
  const email = signal('');
  const preview = computed(() => `姓名：${name()} 邮箱：${email()}`);
  const emailValid = computed(() => email().includes('@'));

  const app = html`
    <div>
      <input id="name" .value=${name} @input=${e => name.set(e.target.value)} />
      <input id="email" .value=${email} @input=${e => email.set(e.target.value)} />
      <div id="preview">${preview}</div>
      ${Show({
        when: () => !emailValid(),
        kids: () => html`<div id="err">邮箱格式错误</div>`
      })}
    </div>
  `;

  render(app, el);
}