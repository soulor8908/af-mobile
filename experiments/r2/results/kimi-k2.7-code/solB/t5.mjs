import { html, signal, computed, Show, render } from './k-flow.js';

export function mount(el) {
  const name = signal('');
  const email = signal('');
  const preview = computed(() => `姓名：${name()} 邮箱：${email()}`);
  const invalid = computed(() => email().length > 0 && !email().includes('@'));

  render(html`
    <div>
      <input id="name" placeholder="姓名" @input=${e => name.set(e.target.value)}>
      <input id="email" placeholder="邮箱" @input=${e => email.set(e.target.value)}>
      <div id="preview">${() => preview()}</div>
      ${() => Show({ when: invalid, kids: () => html`<div id="err">邮箱格式错误</div>` })}
    </div>
  `, el);
}
