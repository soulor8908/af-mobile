import { describe, it, expect, beforeEach } from 'vitest';
import { AfNoticeBar } from '../src/components/af-notice-bar.js';
customElements.define('af-notice-bar-test', AfNoticeBar);

function makeNotice(props = {}) {
  const el = new AfNoticeBar();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-notice-bar', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('渲染 .notice 容器 + role=status 无障碍语义', () => {
    const el = makeNotice({ text: '公告' });
    const bar = el.$('.notice');
    expect(bar).not.toBeNull();
    expect(bar.classList.contains('notice')).toBe(true);
    expect(bar.getAttribute('role')).toBe('status');
  });

  it('text 渲染为 notice-tx 并转义（XSS 防护）', () => {
    const el = makeNotice({ text: '<img onerror="x()">' });
    const textEl = el.$('.notice-tx');
    expect(textEl).not.toBeNull();
    expect(el.innerHTML).toContain('&lt;img');
    expect(el.querySelector('img')).toBeNull();
  });

  it('scroll=true 包 notice-scr（marquee 滚动）', () => {
    const el = makeNotice({ text: '滚动公告', scroll: true });
    expect(el.$('.notice-scr')).not.toBeNull();
    expect(el.$('.notice-scr').textContent).toBe('滚动公告');
  });

  it('scroll=false 无 notice-scr（ellipsis 截断）', () => {
    const el = makeNotice({ text: '截断公告' });
    expect(el.$('.notice-scr')).toBeNull();
  });

  it('text 为空时渲染空文案（不抛错）', () => {
    const el = makeNotice();
    expect(el.$('.notice-tx').textContent).toBe('');
  });

  it('text/scroll 属性变化自动重渲染', () => {
    const el = makeNotice({ text: 'a' });
    expect(el.$('.notice-tx').textContent).toBe('a');
    el.scroll = true;
    el.text = 'b';
    expect(el.$('.notice-scr').textContent).toBe('b');
  });

  it('内联 style 为空（遵守 wc-light-no-style）', () => {
    const el = makeNotice({ text: '公告' });
    expect(el.style.cssText).toBe('');
    expect(el.$('.notice').style.cssText).toBe('');
  });

  it('unmounted 不报错', () => {
    const el = makeNotice({ text: '公告' });
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});
