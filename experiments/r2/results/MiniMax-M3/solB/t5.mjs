// t5.mjs
import { html, signal, computed } from './k-flow.js';

export function mount(el, opts) {
  const name = signal('');
  const email = signal('');
  const preview = computed(() => `姓名：${name()} 邮箱：${email()}`);
  const showErr = computed(() => email().length > 0 && !email().includes('@'));

  el.append(html`
    <input id="name" @input=${(e) => name.set(e.target.value)} />
    <input id="email" @input=${(e) => email.set(e.target.value)} />
    <div id="preview">${() => preview()}</div>
    <div id="err">${() => showErr() ? '邮箱格式错误' : ''}</div>
  `);
}