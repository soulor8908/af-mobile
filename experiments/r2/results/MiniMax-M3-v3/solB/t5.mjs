import { html, signal, computed, render } from './k-flow.js'

export function mount(el) {
  const name = signal('')
  const email = signal('')
  const bad = computed(() => email() !== '' && !email().includes('@'))
  render(html`
    <div>
      <input id="name" @input=${e => name.set(e.target.value)} />
      <input id="email" @input=${e => email.set(e.target.value)} />
      <div id="preview">${() => `姓名：${name()} 邮箱：${email()}`}</div>
      <div id="err">${() => bad() ? '邮箱格式错误' : ''}</div>
    </div>
  `, el)
}
