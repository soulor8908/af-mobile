// t5.mjs
import { signal, effect } from '@af-mobile/ui';
export function mount(el) {
  el.innerHTML = '<input id="name"><input id="email"><div id="preview"></div><div id="err"></div>';
  const name = signal(''), email = signal('');
  const preview = el.querySelector('#preview'), err = el.querySelector('#err');
  effect(() => { preview.textContent = `姓名：${name()} 邮箱：${email()}`; });
  effect(() => {
    const bad = email().length > 0 && !email().includes('@');
    err.textContent = bad ? '邮箱格式错误' : '';
    err.style.display = bad ? '' : 'none';
  });
  el.querySelector('#name').addEventListener('input', e => name.set(e.target.value));
  el.querySelector('#email').addEventListener('input', e => email.set(e.target.value));
}