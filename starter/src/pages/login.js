// login —— Auth 模板：af-field + .btn 配方 + 登录守卫配合（设计 §4.2）
import { escapeHtml as esc, go } from '@af-mobile/ui';
import { supabase } from '../backend.js';

export default async function loginPage(params, ctx) {
  ctx.outlet.innerHTML = `
    <main class="page">
      <section class="hero">
        <p class="eyebrow">欢迎回来</p>
        <h1 class="display">登录</h1>
        <p class="subtitle">使用邮箱登录你的账号</p>
      </section>
      <section class="card">
        <div class="form-row">
          <af-field label="邮箱" name="email" type="email" placeholder="you@example.com"></af-field>
          <af-field label="密码" name="password" type="password" placeholder="••••••••"></af-field>
        </div>
        <button class="btn btn-block" type="submit">登录</button>
        <p class="caption" data-role="msg"></p>
      </section>
    </main>`;

  const form = ctx.outlet.querySelector('.card');
  const msg = ctx.outlet.querySelector('[data-role="msg"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.querySelector('[name="email"]')?.value?.trim();
    const password = form.querySelector('[name="password"]')?.value;
    if (!email || !password) { msg.textContent = '请输入邮箱和密码'; return; }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { msg.textContent = `登录失败：${esc(error.message)}`; return; }
    go('/', { replace: true });
  });
}
