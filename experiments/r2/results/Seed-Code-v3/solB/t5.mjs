import { html, signal, render } from './k-flow.js'

export function mount(el) {
  const name = signal('')
  const email = signal('')
  const bad = () => email() !== '' && !email().includes('@')

  render(html`
    <div>
      <input id="name" placeholder="姓名" .value=${() => name()} @input=${e => name.set(e.target.value)}>
      <input id="email" placeholder="邮箱" .value=${() => email()} @input=${e => email.set(e.target.value)}>
      <div id="preview">${() => `姓名：${name()} 邮箱：${email()}`}</div>
      <div id="err" hidden=${() => !bad()}>${() => bad() ? '邮箱格式错误' : ''}</div>
    </div>
  `, el)
}
