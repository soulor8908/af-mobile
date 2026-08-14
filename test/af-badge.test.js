import { describe, it, expect, beforeEach } from 'vitest';
import { AfBadge } from '../packages/ui/src/components/af-badge.js';
customElements.define('af-badge-test', AfBadge);

function makeBadge(props = {}, children = '') {
  const el = new AfBadge();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  if (children) el.innerHTML = children;
  document.body.appendChild(el);
  return el;
}

describe('af-badge', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('渲染 .badge 徽标 + content 内容', () => {
    const el = makeBadge({ content: '3' });
    const badge = el.$('[data-role="badge"]');
    expect(badge).not.toBeNull();
    expect(badge.classList.contains('badge')).toBe(true);
    expect(badge.textContent).toBe('3');
  });

  it('content 数值超过 max 显示 max+', () => {
    const el = makeBadge({ content: '100', max: 99 });
    expect(el.$('[data-role="badge"]').textContent).toBe('99+');
  });

  it('content 数值不超过 max 显示原值', () => {
    const el = makeBadge({ content: '50', max: 99 });
    expect(el.$('[data-role="badge"]').textContent).toBe('50');
  });

  it('dot=true 渲染空内容点 + aria-hidden', () => {
    const el = makeBadge({ dot: true });
    const badge = el.$('[data-role="badge"]');
    expect(badge.textContent).toBe('');
    expect(badge.getAttribute('aria-hidden')).toBe('true');
  });

  it('有内容时 role=status，无内容时 aria-hidden', () => {
    const withText = makeBadge({ content: '3' });
    expect(withText.$('[data-role="badge"]').getAttribute('role')).toBe('status');
    const empty = makeBadge();
    expect(empty.$('[data-role="badge"]').getAttribute('aria-hidden')).toBe('true');
  });

  it('包裹内容时宿主加 data-corner（角标定位）', () => {
    const el = makeBadge({ content: '3' }, '<img class="thumb" alt="t">');
    expect(el.hasAttribute('data-corner')).toBe(true);
  });

  it('无包裹内容时不加 data-corner', () => {
    const el = makeBadge({ content: '3' });
    expect(el.hasAttribute('data-corner')).toBe(false);
  });

  it('color 变体映射到 data-color 属性', () => {
    const el = makeBadge({ color: 'warn' });
    expect(el.getAttribute('data-color')).toBe('warn');
  });

  it('content 属性变化自动重渲染', () => {
    const el = makeBadge({ content: '3' });
    el.content = '99';
    expect(el.$('[data-role="badge"]').textContent).toBe('99');
  });

  it('用户输入转义（防 XSS）', () => {
    const el = makeBadge({ content: '<img onerror="x()">' });
    expect(el.$('[data-role="badge"]').textContent).toBe('<img onerror="x()">');
    expect(el.$('[data-role="badge"]').querySelector('img')).toBeNull();
  });

  it('内联 style 为空（遵守 wc-light-no-style）', () => {
    const el = makeBadge({ content: '3' });
    expect(el.style.cssText).toBe('');
    expect(el.$('[data-role="badge"]').style.cssText).toBe('');
  });

  it('unmounted 不报错', () => {
    const el = makeBadge({ content: '3' });
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});
