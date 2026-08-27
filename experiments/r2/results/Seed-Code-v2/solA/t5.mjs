import { signal, effect, html } from '@af-mobile/ui';
export function mount(el) {
  el.innerHTML = html`<input id="name" placeholder="姓名" /><input id="email" placeholder="邮箱" /><div id="preview"></div><div id="err"></div>`;
  const nameEl = el.querySelector('#name');
  const emailEl = el.querySelector('#email');
  const preview = el.querySelector('#preview');
  const err = el.querySelector('#err');
  const name = signal('');
  const email = signal('');
  effect(() => { nameEl.addEventListener('input', () => name.set(nameEl.value)); });
  effect(() => { emailEl.addEventListener('input', () => email.set(emailEl.value)); });
  effect(() => {
    preview.textContent = `姓名：${name()} 邮箱：${email()}`;
    err.textContent = email().includes('@') ? '' : '邮箱格式错误';
  });
}