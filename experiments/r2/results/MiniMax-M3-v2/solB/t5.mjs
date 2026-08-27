import { html, signal, computed, Show, render } from './k-flow.js';

export function mount(el) {
  const name = signal('');
  const email = signal('');
  const valid = computed(() => email().includes('@'));
  const preview = computed(() => `姓名：${name()} 邮箱：${email()}`);
  render(() => html`
    <div>
      <input id="name" type="text" @input=${(e) => name.set(e.target.value)} />
      <input id="email" type="text" @input=${(e) => email.set(e.target.value)} />
      <div id="preview">${() => preview()}</div>
      ${Show({ when: () => !valid(), kids: () => html`<div id="err">邮箱格式错误</div>` })}
    </div>
  `, el);
}
