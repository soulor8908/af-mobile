import { signal, effect, html } from '@af-mobile/ui';

export function mount(el, opts) {
  el.innerHTML = html`<input id="name" placeholder="姓名"><input id="email" placeholder="邮箱"><div id="preview"></div><div id="err"></div>`;
  const name = el.querySelector('#name');
  const email = el.querySelector('#email');
  const preview = el.querySelector('#preview');
  const err = el.querySelector('#err');
  const nameVal = signal('');
  const emailVal = signal('');
  effect(() => {
    preview.textContent = `姓名：${nameVal()} 邮箱：${emailVal()}`;
    err.textContent = emailVal() && !emailVal().includes('@') ? '邮箱格式错误' : '';
  });
  name.addEventListener('input', () => nameVal.set(name.value));
  email.addEventListener('input', () => emailVal.set(email.value));
}