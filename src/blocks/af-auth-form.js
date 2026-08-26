// af-mobile UI —— L3.5 Block：af-auth-form（登录/注册表单）
// Light DOM，五态（idle/loading/error/empty/success）+ 内部交互（发送验证码倒计时/提交校验）
// variant: phone-code / password
// 表单值不落 DOM 属性：提交时从内部 input 读取，经 af-auth-form:submit 事件外发
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';
import { withI18n } from '../lib/with-i18n.js';
import { addMessages } from '../lib/i18n.js';

// au.* 字典随本模块注册（不占主库核心运行时体积）
addMessages('zh-CN', {
  'au.al': '登录表单',
  'au.em': '未知的表单类型',
  'au.ph': '请输入手机号',
  'au.cd': '请输入验证码',
  'au.pw': '请输入密码',
  'au.pw2': '请再次输入密码',
  'au.send': '发送验证码',
  'au.submit': '登录',
  'au.agree': '我已阅读并同意服务协议与隐私政策',
  'au.er-ph': '请输入手机号',
  'au.er-cd': '请输入验证码',
  'au.er-pw': '请输入密码',
  'au.er-pw2': '两次输入的密码不一致',
  'au.er-ag': '请先勾选协议',
});
addMessages('en-US', {
  'au.al': 'Login form',
  'au.em': 'Unknown form type',
  'au.ph': 'Phone number',
  'au.cd': 'Verification code',
  'au.pw': 'Password',
  'au.pw2': 'Confirm password',
  'au.send': 'Send code',
  'au.submit': 'Sign in',
  'au.agree': 'I agree to the Terms and Privacy Policy',
  'au.er-ph': 'Enter phone number',
  'au.er-cd': 'Enter the code',
  'au.er-pw': 'Enter a password',
  'au.er-pw2': 'Passwords do not match',
  'au.er-ag': 'Please accept the agreement',
});

const COUNTDOWN = 60;

export class AfAuthForm extends withI18n(AfElement) {
  static useShadow = false;

  static i18n = {
    '@': ['aria-label', 'au.al', 'title'],
    '[data-role="empty-text"]': ['', 'au.em'],
    '[data-role="phone"]': ['placeholder', 'au.ph'],
    '[data-role="code"]': ['placeholder', 'au.cd'],
    '[data-role="pwd"]': ['placeholder', 'au.pw'],
    '[data-role="pwd2"]': ['placeholder', 'au.pw2'],
    '[data-role="send"]': ['', 'au.send'],
    '[data-role="submit-text"]': ['', 'au.submit', 'submitText'],
    '[data-role="agree-text"]': ['', 'au.agree'],
  };

  constructor() {
    super();
    this._error = null;
    this._cd = 0;
    this._cdTimer = null;
  }

  mounted() {
    this._render();
  }

  unmounted() {
    clearInterval(this._cdTimer);
    this._cdTimer = null;
  }

  // 空态：variant 枚举外的防御分支（unknown → 提示，不崩）
  _render() {
    if (!['phone-code', 'password'].includes(this.variant)) {
      this.innerHTML = `<section class="card" role="group"><div class="empty"><div class="body" data-role="empty-text"></div></div></section>`;
      this._applyI18n();
      return;
    }
    const head = `<h1 class="title">${esc(this.title)}</h1>${this.subtitle ? `<p class="subtitle">${esc(this.subtitle)}</p>` : ''}`;
    const rows = this.variant === 'phone-code'
      ? `<div class="form-row"><input class="input" type="tel" data-role="phone" autocomplete="tel"></div><div class="form-row-h"><input class="input" type="text" inputmode="numeric" data-role="code" autocomplete="one-time-code"><button class="btn btn-plain" type="button" data-role="send"></button></div>`
      : `<div class="form-row"><input class="input" type="tel" data-role="phone" autocomplete="tel"></div><div class="form-row"><input class="input" type="password" data-role="pwd" autocomplete="new-password"></div><div class="form-row"><input class="input" type="password" data-role="pwd2" autocomplete="new-password"></div><label class="form-row-h"><input type="checkbox" data-role="agree"><span class="caption" data-role="agree-text"></span></label>`;
    this.innerHTML = `<section class="card" role="group">${head}<form data-role="form" novalidate>${rows}<div class="form-err" data-role="error-text" role="alert" hidden></div><div class="actions"><button class="btn" type="submit" data-role="submit"><span class="spinner spinner-sm" hidden data-role="busy"></span><span data-role="submit-text"></span></button></div></form></section>`;
    this._applyI18n();
    this._bindForm();
  }

  // 表单交互绑定（提交/发送验证码/输入清除错误）
  _bindForm() {
    const $ = (r) => this.$(`[data-role="${r}"]`);
    const form = $('form');
    const phone = $('phone');
    const code = $('code');
    const pwd = $('pwd');
    const pwd2 = $('pwd2');
    const agree = $('agree');
    const send = $('send');
    this._listen(form, 'submit', (e) => {
      e.preventDefault();
      if (this.loading) return;
      const fail = this._validate(phone, code, pwd, pwd2, agree);
      if (fail) {
        this._showError(fail.msg, fail.el);
        fail.el?.focus();
        return;
      }
      const detail = this.variant === 'password'
        ? { phone: phone.value.trim(), password: pwd.value, confirm: pwd2.value }
        : { phone: phone.value.trim(), code: code.value };
      this.emit('af-auth-form:submit', detail);
    });
    this._listen(form, 'input', () => this._clearError());
    if (send) {
      this._listen(send, 'click', () => {
        if (this._cd > 0 || this.loading) return;
        if (!phone.value.trim()) {
          this._showError(this.t('au.er-ph'), phone);
          phone.focus();
          return;
        }
        this.emit('af-auth-form:sendcode', { phone: phone.value.trim() });
        this._startCountdown(send);
      });
    }
  }

  // 提交校验（库作者预写：空值/密码一致性/协议勾选）
  _validate(phone, code, pwd, pwd2, agree) {
    if (!phone?.value.trim()) return { msg: this.t('au.er-ph'), el: phone };
    if (this.variant === 'phone-code') {
      if (!code.value.trim()) return { msg: this.t('au.er-cd'), el: code };
    } else {
      if (!pwd.value) return { msg: this.t('au.er-pw'), el: pwd };
      if (pwd.value !== pwd2.value) return { msg: this.t('au.er-pw2'), el: pwd2 };
      if (!agree.checked) return { msg: this.t('au.er-ag'), el: agree };
    }
    return null;
  }

  _showError(msg, el) {
    this._error = msg;
    const errEl = this.$('[data-role="error-text"]');
    if (errEl) {
      errEl.textContent = msg;
      errEl.hidden = false;
    }
    if (el) el.classList.add('input-err');
  }

  _clearError() {
    if (!this._error) return;
    this._error = null;
    const errEl = this.$('[data-role="error-text"]');
    if (errEl) errEl.hidden = true;
    this.$$('[data-role="form"] .input').forEach((el) => el.classList.remove('input-err'));
  }

  // 公开错误态 API（与列表型 Block 的 setError 对齐）：显示错误文案，不清输入值
  setError(err) {
    this._showError(err?.message || String(err));
  }

  // loading 态：命令式切换（不重渲染，保住用户已输入的值）
  _syncBusy() {
    const btn = this.$('[data-role="submit"]');
    if (!btn) return;
    btn.disabled = this.loading;
    if (this.loading) this.setAttribute('aria-busy', 'true');
    else this.removeAttribute('aria-busy');
    const busy = this.$('[data-role="busy"]');
    if (busy) busy.hidden = !this.loading;
  }

  // 发送验证码倒计时（内部交互归库作者：按钮禁用 + 秒数文案，unmounted 清理）
  _startCountdown(send) {
    this._cd = COUNTDOWN;
    const tick = () => {
      const on = this._cd > 0;
      send.disabled = on;
      if (on) { send.textContent = `${this._cd}s`; return; }
      clearInterval(this._cdTimer);
      this._applyI18n();
    };
    tick();
    this._cdTimer = setInterval(() => { this._cd -= 1; tick(); }, 1000);
  }

  onAttributeChange(name) {
    if (!this._mounted) return;
    // loading 命令式切换（保输入值）；其余属性（title/subtitle/variant/submit-text）重渲染
    if (name === 'loading') this._syncBusy();
    else this._render();
  }
}

// variant: phone-code / password
AfElement.defineProp(AfAuthForm.prototype, 'variant', 'phone-code');
AfElement.defineProp(AfAuthForm.prototype, 'title', '');
AfElement.defineProp(AfAuthForm.prototype, 'subtitle', '');
AfElement.defineProp(AfAuthForm.prototype, 'submitText', '');
AfElement.defineProp(AfAuthForm.prototype, 'loading', false);
