import { html, signal, computed, Show, render } from './k-flow.js';

export function mount(el) {
  const name = signal('');
  const email = signal('');
  const bad = computed(() => email().length > 0 && !email().includes('@'));
  render(html`
    <input id="name" .value=${name()} @input=${e => name.set(e.target.value)} />
    <input id="email" .value=${email()} @input=${e => email.set(e.target.value)} />
    <div id="preview">${() => `姓名：${name()} 邮箱：${email()}`}</div>
    ${Show({
      when: bad,
      kids: () => html`<span id="err">邮箱格式错误</span>`,
    })}
  `, el);
}
