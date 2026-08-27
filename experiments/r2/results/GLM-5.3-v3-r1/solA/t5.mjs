import { signal, effect, html } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = html`<input id="name" type="text" placeholder="姓名"><input id="email" type="text" placeholder="邮箱"><div id="preview"></div><div id="err"></div>`;
  const name = el.querySelector('#name');
  const email = el.querySelector('#email');
  const preview = el.querySelector('#preview');
  const err = el.querySelector('#err');
  const n = signal('');
  const m = signal('');
  effect(() => {
    preview.textContent = `姓名：${n()} 邮箱：${m()}`;
    err.textContent = m() && !m().includes('@') ? '邮箱格式错误' : '';
  });
  name.addEventListener('input', () => n.set(name.value));
  email.addEventListener('input', () => m.set(email.value));
}