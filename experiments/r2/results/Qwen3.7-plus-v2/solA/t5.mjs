import { signal, effect, html } from '@af-mobile/ui';
export function mount(el) {
  el.innerHTML = html`<input id="name"><input id="email"><div id="preview"></div><div id="err"></div>`;
  const name = signal(''), email = signal('');
  const preview = el.querySelector('#preview'), err = el.querySelector('#err');
  effect(() => { preview.textContent = `姓名：${name()} 邮箱：${email()}`; });
  effect(() => { err.textContent = email() && !email().includes('@') ? '邮箱格式错误' : ''; });
  el.querySelector('#name').oninput = e => name.set(e.target.value);
  el.querySelector('#email').oninput = e => email.set(e.target.value);
}
