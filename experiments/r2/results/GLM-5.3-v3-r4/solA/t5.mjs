import { signal, effect, html } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = html`
    <input id="name" type="text" placeholder="姓名">
    <input id="email" type="text" placeholder="邮箱">
    <div id="preview"></div>
    <div id="err"></div>
  `;
  const name = el.querySelector('#name');
  const email = el.querySelector('#email');
  const preview = el.querySelector('#preview');
  const err = el.querySelector('#err');
  const nv = signal('');
  const ev = signal('');

  effect(() => {
    preview.textContent = `姓名：${nv()} 邮箱：${ev()}`;
  });

  effect(() => {
    const v = ev();
    err.textContent = v && !v.includes('@') ? '邮箱格式错误' : '';
  });

  name.addEventListener('input', () => nv.set(name.value));
  email.addEventListener('input', () => ev.set(email.value));
}
