// t5.mjs
import { signal, effect, html } from '@af-mobile/ui';

export function mount(el, opts) {
  el.innerHTML = html`
    <div>
      <input id="name" placeholder="请输入姓名" />
      <input id="email" placeholder="请输入邮箱" />
      <div id="preview"></div>
      <div id="err"></div>
    </div>
  `;
  const name = signal('');
  const email = signal('');
  const nameEl = el.querySelector('#name');
  const emailEl = el.querySelector('#email');
  const previewEl = el.querySelector('#preview');
  const errEl = el.querySelector('#err');
  effect(() => {
    previewEl.textContent = `姓名：${name()} 邮箱：${email()}`;
    if (email() && !email().includes('@')) {
      errEl.textContent = '邮箱格式错误';
    } else {
      errEl.textContent = '';
    }
  });
  nameEl.addEventListener('input', (e) => name.set(e.target.value));
  emailEl.addEventListener('input', (e) => email.set(e.target.value));
}