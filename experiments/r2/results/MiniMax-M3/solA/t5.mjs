// t5.mjs
import { signal, effect, html } from '@af-mobile/ui';

export function mount(el, opts) {
  const name = signal('');
  const email = signal('');

  el.innerHTML = html`
    <div>
      <div>
        <label>姓名：</label>
        <input id="name" />
      </div>
      <div>
        <label>邮箱：</label>
        <input id="email" />
      </div>
      <div id="err" style="display:none"></div>
      <div id="preview">姓名： 邮箱：</div>
    </div>
  `;

  const nameInput = el.querySelector('#name');
  const emailInput = el.querySelector('#email');
  const errEl = el.querySelector('#err');
  const previewEl = el.querySelector('#preview');

  nameInput.addEventListener('input', () => name.set(nameInput.value));
  emailInput.addEventListener('input', () => email.set(emailInput.value));

  effect(() => {
    previewEl.textContent = `姓名：${name()} 邮箱：${email()}`;
  });

  effect(() => {
    const e = email();
    if (e.length > 0 && !e.includes('@')) {
      errEl.textContent = '邮箱格式错误';
      errEl.style.display = '';
    } else {
      errEl.textContent = '';
      errEl.style.display = 'none';
    }
  });
}