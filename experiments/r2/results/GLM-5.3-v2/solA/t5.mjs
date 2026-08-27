import { signal, effect, html } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = html`<input id="name" type="text"><input id="email" type="text"><div id="preview"></div><div id="err"></div>`;
  const nameEl = el.querySelector('#name');
  const emailEl = el.querySelector('#email');
  const preview = el.querySelector('#preview');
  const err = el.querySelector('#err');
  const nameVal = signal('');
  const emailVal = signal('');
  effect(() => {
    preview.textContent = `姓名：${nameVal()} 邮箱：${emailVal()}`;
    err.textContent = emailVal().includes('@') ? '' : '邮箱格式错误';
  });
  nameEl.addEventListener('input', () => nameVal.set(nameEl.value));
  emailEl.addEventListener('input', () => emailVal.set(emailEl.value));
}
