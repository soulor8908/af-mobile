import { signal, effect, html } from '@af-mobile/ui';
export function mount(el) {
  el.innerHTML = html`<input id="name"><input id="email"><div id="preview"></div><div id="err"></div>`;
  const name = el.querySelector('#name');
  const email = el.querySelector('#email');
  const preview = el.querySelector('#preview');
  const err = el.querySelector('#err');
  const state = signal({ name: '', email: '' });
  effect(() => {
    preview.textContent = '姓名：' + state().name + ' 邮箱：' + state().email;
    err.textContent = state().email.includes('@') ? '' : '邮箱格式错误';
  });
  name.addEventListener('input', () => state.set({ ...state(), name: name.value }));
  email.addEventListener('input', () => state.set({ ...state(), email: email.value }));
}