import { html, signal, computed, render, Show } from './k-flow.js'

export function mount(el) {
  const name = signal('')
  const email = signal('')
  const emailErr = computed(() => email() !== '' && !email().includes('@'))

  render(() => html`
    <div>
      <input id="name" @input=${(e) => name.set(e.target.value)} />
      <input id="email" @input=${(e) => email.set(e.target.value)} />
      <div id="preview">${() => `姓名：${name()} 邮箱：${email()}`}</div>
      ${() => Show({
        when: emailErr,
        kids: () => html`<div id="err">邮箱格式错误</div>`
      })}
    </div>
  `, el)
}
