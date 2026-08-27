// t5.mjs
import { signal, effect, computed, html } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = html`
    <input id="name" type="text" placeholder="姓名">
    <input id="email" type="text" placeholder="邮箱">
    <p id="preview"></p>
    <p id="err"></p>
  `;
  const name = el.querySelector('#name');
  const email = el.querySelector('#email');
  const preview = el.querySelector('#preview');
  const err = el.querySelector('#err');
  const nameVal = signal('');
  const emailVal = signal('');
  const emailBad = computed(() => emailVal().length > 0 && !emailVal().includes('@'));
  effect(() => {
    preview.textContent = `姓名：${nameVal()} 邮箱：${emailVal()}`;
    err.textContent = emailBad() ? '邮箱格式错误' : '';
  });
  name.addEventListener('input', () => nameVal.set(name.value));
  email.addEventListener('input', () => emailVal.set(email.value));
}
