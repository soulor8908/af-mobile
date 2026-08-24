import { html, signal, render } from '../../k-flow.js';

export function mount(el) {
  const name = signal(''), email = signal('');
  render(html`
    <input id="name" @input=${(e) => name.set(e.target.value)}>
    <input id="email" @input=${(e) => email.set(e.target.value)}>
    <div id="preview">${() => `姓名：${name()} 邮箱：${email()}`}</div>
    <span id="err">${() => (email() && !email().includes('@') ? '邮箱格式错误' : '')}</span>
  `, el);
}
