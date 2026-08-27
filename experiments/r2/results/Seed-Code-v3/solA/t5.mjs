import { signal, effect, html } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = html`<input id="name" placeholder="姓名" /><input id="email" placeholder="邮箱" /><div id="preview"></div><div id="err"></div>`;
  const name = signal('');
  const email = signal('');
  const preview = el.querySelector('#preview');
  const err = el.querySelector('#err');
  effect(() => {
    preview.textContent = `姓名：${name()} 邮箱：${email()}`;
    err.textContent = email().includes('@') ? '' : '邮箱格式错误';
  });
  el.querySelector('#name').addEventListener('input', e => name.set(e.target.value));
  el.querySelector('#email').addEventListener('input', e => email.set(e.target.value));
}
