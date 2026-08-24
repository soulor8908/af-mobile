import { signal, effect } from '../../../../src/lib/state.js';

export function mount(el) {
  el.innerHTML = `
    <input id="name" placeholder="姓名">
    <input id="email" placeholder="邮箱">
    <p id="preview"></p>
    <p id="err"></p>
  `;
  const name = signal('');
  const email = signal('');
  const preview = el.querySelector('#preview');
  const err = el.querySelector('#err');
  effect(() => {
    preview.textContent = `姓名：${name()} 邮箱：${email()}`;
    err.textContent = email() && !email().includes('@') ? '邮箱格式错误' : '';
  });
  el.querySelector('#name').addEventListener('input', e => name.set(e.target.value));
  el.querySelector('#email').addEventListener('input', e => email.set(e.target.value));
}
