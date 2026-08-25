import { signal, effect, html, escapeHtml } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = `
    <div id="app">
      <input id="name" placeholder="姓名" />
      <input id="email" placeholder="邮箱" />
      <div id="preview"></div>
      <div id="err"></div>
    </div>
  `;

  const name = signal('');
  const email = signal('');
  const previewEl = el.querySelector('#preview');
  const errEl = el.querySelector('#err');

  effect(() => {
    previewEl.textContent = `姓名：${name()} 邮箱：${email()}`;
  });

  effect(() => {
    const v = email();
    if (v && !v.includes('@')) {
      errEl.textContent = '邮箱格式错误';
    } else {
      errEl.textContent = '';
    }
  });

  el.querySelector('#name').addEventListener('input', (e) => name.set(e.target.value));
  el.querySelector('#email').addEventListener('input', (e) => email.set(e.target.value));
}
