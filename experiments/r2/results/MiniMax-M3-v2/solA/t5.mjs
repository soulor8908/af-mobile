import { signal, effect, html } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = html`
    <input id="name" type="text" />
    <input id="email" type="text" />
    <div id="preview"></div>
    <div id="err"></div>
  `;
  const nameI = el.querySelector('#name');
  const emailI = el.querySelector('#email');
  const preview = el.querySelector('#preview');
  const err = el.querySelector('#err');
  const name = signal('');
  const email = signal('');
  effect(() => {
    const n = name();
    const e = email();
    preview.textContent = `姓名：${n} 邮箱：${e}`;
    err.textContent = e.includes('@') ? '' : '邮箱格式错误';
  });
  nameI.addEventListener('input', (e) => name.set(e.target.value));
  emailI.addEventListener('input', (e) => email.set(e.target.value));
}
