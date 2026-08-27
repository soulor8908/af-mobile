import { signal, effect, html } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = html`<input id="name"><input id="email"><div id="preview"></div><div id="err"></div>`;
  const nameEl = el.querySelector('#name');
  const emailEl = el.querySelector('#email');
  const preview = el.querySelector('#preview');
  const err = el.querySelector('#err');
  const name = signal('');
  const email = signal('');

  effect(() => {
    preview.textContent = `姓名：${name()} 邮箱：${email()}`;
  });

  effect(() => {
    const bad = !email().includes('@');
    err.hidden = !bad;
    err.textContent = bad ? '邮箱格式错误' : '';
  });

  nameEl.addEventListener('input', () => name.set(nameEl.value));
  emailEl.addEventListener('input', () => email.set(emailEl.value));
}