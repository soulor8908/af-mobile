import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfAuthForm } from '../src/blocks/af-auth-form.js';
import { setLocale } from '../src/lib/i18n.js';
customElements.define('af-auth-form', AfAuthForm);

function makeEl(props = {}) {
  const el = new AfAuthForm();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

function submit(el) {
  el.$('[data-role="form"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

describe('af-auth-form 渲染与变体', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('phone-code（默认）：title/subtitle/手机号/验证码+发送/提交按钮', () => {
    const el = makeEl({ title: '欢迎回来', subtitle: '请输入手机号登录' });
    expect(el.$('.title').textContent).toBe('欢迎回来');
    expect(el.$('.subtitle').textContent).toBe('请输入手机号登录');
    expect(el.$('[data-role="phone"]')).not.toBeNull();
    expect(el.$('[data-role="code"]')).not.toBeNull();
    expect(el.$('[data-role="send"]').textContent).toBe('发送验证码');
    expect(el.$('[data-role="submit-text"]').textContent).toBe('登录');
  });

  it('password 变体：密码/确认密码/协议勾选行', () => {
    const el = makeEl({ variant: 'password', submitText: '注册' });
    expect(el.$('[data-role="pwd"]')).not.toBeNull();
    expect(el.$('[data-role="pwd2"]')).not.toBeNull();
    expect(el.$('[data-role="agree"]')).not.toBeNull();
    expect(el.$('[data-role="agree-text"]').textContent).toContain('协议');
    expect(el.$('[data-role="submit-text"]').textContent).toBe('注册');
  });

  it('空态：未知 variant 渲染防御提示，不崩', () => {
    const el = makeEl({});
    el.variant = 'sms';
    el._render();
    expect(el.$('[data-role="empty-text"]').textContent).toBe('未知的表单类型');
  });

  it('placeholder 走 au.* 字典且随 locale 切换', () => {
    setLocale('en-US');
    try {
      const el = makeEl({});
      expect(el.$('[data-role="phone"]').getAttribute('placeholder')).toBe('Phone number');
    } finally {
      setLocale('zh-CN');
    }
  });
});

describe('af-auth-form 提交校验（库作者预写）', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('空手机号 → form-err 显示错误且不派发 submit', () => {
    const el = makeEl({});
    let fired = false;
    el.addEventListener('af-auth-form:submit', () => { fired = true; });
    submit(el);
    expect(fired).toBe(false);
    const err = el.$('[data-role="error-text"]');
    expect(err.hidden).toBe(false);
    expect(err.textContent).toBe('请输入手机号');
  });

  it('phone-code：填齐后派发 submit（phone+code）', () => {
    const el = makeEl({});
    let got = null;
    el.addEventListener('af-auth-form:submit', (e) => { got = e.detail; });
    el.$('[data-role="phone"]').value = '13800138000';
    el.$('[data-role="code"]').value = '1234';
    submit(el);
    expect(got).toEqual({ phone: '13800138000', code: '1234' });
    expect(el.$('[data-role="error-text"]').hidden).toBe(true);
  });

  it('password：两次密码不一致 → 错误提示', () => {
    const el = makeEl({ variant: 'password' });
    el.$('[data-role="phone"]').value = '13800138000';
    el.$('[data-role="pwd"]').value = 'a123456';
    el.$('[data-role="pwd2"]').value = 'b654321';
    el.$('[data-role="agree"]').checked = true;
    submit(el);
    expect(el.$('[data-role="error-text"]').textContent).toBe('两次输入的密码不一致');
  });

  it('password：未勾选协议 → 错误提示', () => {
    const el = makeEl({ variant: 'password' });
    el.$('[data-role="phone"]').value = '13800138000';
    el.$('[data-role="pwd"]').value = 'a123456';
    el.$('[data-role="pwd2"]').value = 'a123456';
    submit(el);
    expect(el.$('[data-role="error-text"]').textContent).toBe('请先勾选协议');
  });

  it('输入即清除错误（含 input-err class）', () => {
    const el = makeEl({});
    submit(el);
    expect(el.$('[data-role="phone"]').classList.contains('input-err')).toBe(true);
    el.$('[data-role="phone"]').dispatchEvent(new Event('input', { bubbles: true }));
    expect(el.$('[data-role="error-text"]').hidden).toBe(true);
    expect(el.$('[data-role="phone"]').classList.contains('input-err')).toBe(false);
  });

  it('loading=true 时不派发 submit，按钮禁用 + aria-busy（保输入值）', () => {
    const el = makeEl({});
    el.$('[data-role="phone"]').value = '13800138000';
    el.$('[data-role="code"]').value = '1234';
    el.loading = true;
    expect(el.$('[data-role="submit"]').disabled).toBe(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(el.$('[data-role="phone"]').value).toBe('13800138000');
    let fired = false;
    el.addEventListener('af-auth-form:submit', () => { fired = true; });
    submit(el);
    expect(fired).toBe(false);
  });

  it('setError(err)：外部提交失败写入错误区', () => {
    const el = makeEl({});
    el.setError(new Error('账号不存在'));
    expect(el.$('[data-role="error-text"]').textContent).toBe('账号不存在');
  });
});

describe('af-auth-form 发送验证码倒计时', () => {
  beforeEach(() => { document.body.innerHTML = ''; vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('空手机号点发送 → 错误且不启动倒计时', () => {
    const el = makeEl({});
    let fired = false;
    el.addEventListener('af-auth-form:sendcode', () => { fired = true; });
    el.$('[data-role="send"]').click();
    expect(fired).toBe(false);
    expect(el.$('[data-role="error-text"]').textContent).toBe('请输入手机号');
  });

  it('派发 sendcode 并进入 60s 倒计时（按钮禁用 + 秒数文案）', () => {
    const el = makeEl({});
    let got = null;
    el.addEventListener('af-auth-form:sendcode', (e) => { got = e.detail; });
    el.$('[data-role="phone"]').value = '13800138000';
    el.$('[data-role="send"]').click();
    expect(got).toEqual({ phone: '13800138000' });
    const send = el.$('[data-role="send"]');
    expect(send.disabled).toBe(true);
    expect(send.textContent).toBe('60s');
    vi.advanceTimersByTime(3000);
    expect(send.textContent).toBe('57s');
    vi.advanceTimersByTime(57000);
    expect(send.disabled).toBe(false);
    expect(send.textContent).toBe('发送验证码');
  });

  it('unmounted 清理倒计时定时器', () => {
    const el = makeEl({});
    el.$('[data-role="phone"]').value = '13800138000';
    el.$('[data-role="send"]').click();
    el.remove();
    const send = el.$('[data-role="send"]');
    vi.advanceTimersByTime(61000);
    expect(send.textContent).toBe('60s');
  });
});
