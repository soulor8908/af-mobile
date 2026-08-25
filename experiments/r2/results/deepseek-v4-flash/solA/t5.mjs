import { signal, effect } from '@af-mobile/ui';

export function mount(el, opts) {
  el.innerHTML = '<input id="name" placeholder="姓名"><input id="email" placeholder="邮箱"><div id="preview"></div><div id="err"></div>';
  const name = el.querySelector('#name');
  const email = el.querySelector('#email');
  const preview = el.querySelector('#preview');
  const err = el.querySelector('#err');
  const n = signal('');
  const e = signal('');
  effect(() => { preview.textContent = `姓名：${n()} 邮箱：${e()}`; });
  effect(() => {
    const invalid = !e().includes('@');
    err.textContent = invalid ? '邮箱格式错误' : '';
    err.style.display = invalid ? '' : 'none';
  });
  name.addEventListener('input', () => n.set(name.value));
  email.addEventListener('input', () => e.set(email.value));
}
