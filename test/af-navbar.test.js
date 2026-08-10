import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfNavbar } from '../src/components/af-navbar.js';
customElements.define('af-navbar-test', AfNavbar);

function makeNavbar(props = {}) {
  const el = new AfNavbar();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-navbar', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('渲染返回按钮 + 标题 + 左右插槽容器', () => {
    const el = makeNavbar({ title: '首页', showBack: true });
    expect(el.$('[data-role="back"]')).not.toBeNull();
    expect(el.$('[data-role="title"]').textContent).toBe('首页');
    expect(el.$('[data-role="left"]')).not.toBeNull();
    expect(el.$('[data-role="right"]')).not.toBeNull();
  });

  it('showBack=false 时不渲染返回按钮', () => {
    const el = makeNavbar({ title: '首页' });
    expect(el.$('[data-role="back"]')).toBeNull();
  });

  it('点击返回按钮派发 af-navbar:back', () => {
    const el = makeNavbar({ showBack: true });
    const handler = vi.fn();
    el.addEventListener('af-navbar:back', handler);
    el.$('[data-role="back"]').click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('slot=left / slot=right 子节点被搬入对应容器', () => {
    const el = new AfNavbar();
    const leftBtn = document.createElement('button');
    leftBtn.setAttribute('slot', 'left');
    leftBtn.textContent = '菜单';
    const rightBtn = document.createElement('button');
    rightBtn.setAttribute('slot', 'right');
    rightBtn.textContent = '分享';
    el.appendChild(leftBtn);
    el.appendChild(rightBtn);
    document.body.appendChild(el);
    expect(el.$('[data-role="left"]').contains(leftBtn)).toBe(true);
    expect(el.$('[data-role="right"]').contains(rightBtn)).toBe(true);
  });

  it('title 属性变化时更新标题文案', () => {
    const el = makeNavbar({ title: '旧标题' });
    el.setAttribute('title', '新标题');
    expect(el.$('[data-role="title"]').textContent).toBe('新标题');
  });

  it('back-aria-label 默认"返回"', () => {
    const el = makeNavbar({ showBack: true });
    expect(el.$('[data-role="back"]').getAttribute('aria-label')).toBe('返回');
  });

  it('内联 style 为空（遵守 wc-light-no-style）', () => {
    const el = makeNavbar({ title: '首页' });
    expect(el.style.cssText).toBe('');
  });

  it('unmounted 不报错', () => {
    const el = makeNavbar({ showBack: true });
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});
