// t5.mjs
import { signal, effect } from '@af-mobile/ui';
export function mount(el, opts) {
  el.innerHTML = `<input id="name"><input id="email"><div id="preview"></div><div id="err"></div>`;
  const name = signal('');
  const email = signal('');
  const preview = el.querySelector('#preview');
  const err = el.querySelector('#err');
  const nameEl = el.querySelector('#name');
  const emailEl = el.querySelector('#email');
  effect(() => {
    preview.textContent = `姓名：${name()} 邮箱：${email()}`;
    err.textContent = email().includes('@') ? '' : '邮箱格式错误';
  });
  nameEl.addEventListener('input', () => name.set(nameEl.value));
  emailEl.addEventListener('input', () => email.set(emailEl.value));
}