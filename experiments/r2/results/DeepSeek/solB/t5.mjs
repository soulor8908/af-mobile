// t5.mjs
import { html, signal } from './k-flow.js'
export function mount(el) {
  const name = signal('')
  const email = signal('')
  const invalid = () => !email().includes('@')
  el.append(html`
    <input id="name" @input=${e => name.set(e.target.value)}>
    <input id="email" @input=${e => email.set(e.target.value)}>
    <div id="preview">姓名：${name} 邮箱：${email}</div>
    <div id="err" hidden=${invalid}>${() => invalid() ? '邮箱格式错误' : ''}</div>
  `)
}