import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfProductCard } from '../src/blocks/af-product-card.js';
import { setLocale } from '../src/lib/i18n.js';
customElements.define('af-product-card', AfProductCard);

function makeEl(props = {}) {
  const el = new AfProductCard();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-product-card 五态', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('loading=true 渲染骨架屏 + aria-busy', () => {
    const el = makeEl({ loading: true, title: '商品卡片' });
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(el.$('[data-role="loading"]')).not.toBeNull();
    expect(el.$$('.sk-ln').length).toBeGreaterThanOrEqual(4);
  });

  it('空 items 渲染 empty 态', () => {
    const el = makeEl({ items: [], title: '商品卡片' });
    expect(el.$('[data-role="empty"]')).not.toBeNull();
  });

  it('i18n：空态文案翻译为中文而非裸 key（pc.* 已注册）', () => {
    const el = makeEl({ items: [], title: '商品卡片' });
    expect(el.$('[data-role="empty-text"]').textContent).toBe('暂无商品');
  });

  it('i18n：切换 en-US 时空态文案跟随切换', () => {
    setLocale('en-US');
    try {
      const el = makeEl({ items: [], title: '商品卡片' });
      expect(el.$('[data-role="empty-text"]').textContent).toBe('No products');
    } finally {
      setLocale('zh-CN');
    }
  });

  it('setError 触发 error 态 + 重试按钮', () => {
    const el = makeEl({ items: [{ label: 'x' }] });
    el.setError(new Error('网络错误'));
    expect(el.$('[data-role="error"]')).not.toBeNull();
    expect(el.$('[data-role="retry-btn"]')).not.toBeNull();
  });

  it('点击重试按钮派发 retry 事件 + 退出 error 态', () => {
    const el = makeEl({ items: [{ label: 'x' }] });
    el.setError(new Error('x'));
    const onRetry = vi.fn();
    el.addEventListener('af-product-card:retry', onRetry);
    el.$('[data-role="retry-btn"]').click();
    expect(onRetry).toHaveBeenCalledOnce();
    expect(el.$('[data-role="error"]')).toBeNull();
  });

  it('有 items 渲染 success 态 + list-item 行', () => {
    const el = makeEl({
      title: '商品卡片',
      items: [{ label: '项目A', action: 'arrow' }, { label: '项目B' }],
    });
    expect(el.$('[data-role="list"]')).not.toBeNull();
    expect(el.$$('.list-item[data-index]').length).toBe(2);
  });
});

describe('af-product-card 交互 + a11y', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('点击行派发 af-product-card:itemclick 事件', () => {
    const el = makeEl({
      items: [{ label: 'A', action: 'arrow' }, { label: 'B', action: 'arrow' }],
    });
    const onClick = vi.fn();
    el.addEventListener('af-product-card:itemclick', onClick);
    el.$$('.list-item[data-index]')[1].click();
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({
      detail: expect.objectContaining({ index: 1 }),
    }));
  });

  it('a11y: role=group + aria-label（title 非空）', () => {
    const el = makeEl({ title: '商品卡片', items: [{ label: 'x' }] });
    const section = el.$('section');
    expect(section.getAttribute('role')).toBe('group');
    expect(section.getAttribute('aria-label')).toBe('商品卡片');
  });

  it('XSS 防护：label 含 <script> 被转义', () => {
    const el = makeEl({
      items: [{ label: '<script>alert(1)</script>', action: 'arrow' }],
    });
    expect(el.innerHTML).not.toContain('<script>');
    expect(el.innerHTML).toContain('&lt;script&gt;');
  });
});
