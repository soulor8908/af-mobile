import { signal, effect, html, escapeHtml } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = html`
    <div>
      <input id="name" placeholder="姓名">
      <input id="email" placeholder="邮箱">
      <div id="err" style="display:none"></div>
      <div id="preview"></div>
    </div>
  `;
  const nameEl = el.querySelector('#name');
  const emailEl = el.querySelector('#email');
  const err = el.querySelector('#err');
  const preview = el.querySelector('#preview');

  const name = signal('');
  const email = signal('');

  effect(() => {
    const n = name();
    const e = email();
    preview.textContent = `姓名：${n} 邮箱：${e}`;
    if (e && !e.includes('@')) {
      err.textContent = '邮箱格式错误';
      err.style.display = 'block';
    } else {
      err.style.display = 'none';
      err.textContent = '';
    }
  });

  nameEl.addEventListener('input', () => name.set(nameEl.value));
  emailEl.addEventListener('input', () => email.set(emailEl.value));
}
