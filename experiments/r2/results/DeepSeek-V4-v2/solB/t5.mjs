import { html, signal, computed } from './k-flow.js';

export function mount(el) {
  const name = signal('');
  const email = signal('');
  const bad = computed(() => !email().includes('@'));
  el.append(html`
    <input id="name" @input=${e => name.set(e.target.value)} />
    <input id="email" @input=${e => email.set(e.target.value)} />
    <div id="preview">${computed(() => `姓名：${name()} 邮箱：${email()}`)}</div>
    <div id="err">${() => (bad() ? '邮箱格式错误' : '')}</div>
  `);
}