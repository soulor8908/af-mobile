import { describe, it, expect, beforeEach } from 'vitest';
import { AfProductGrid } from '../src/blocks/af-product-grid.js';
import { setLocale } from '../src/lib/i18n.js';
customElements.define('af-product-grid', AfProductGrid);

function makeEl(props = {}) {
  const el = new AfProductGrid();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

const ITEMS = [
  { img: 'a.png', title: '无线耳机', subtitle: '降噪', price: '¥199', priceDel: '¥299' },
  { title: '充电宝' },
];

describe('af-product-grid 五态与变体', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('loading=true 渲染骨架屏 + aria-busy', () => {
    const el = makeEl({ loading: true, title: '商品' });
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(el.$('[data-role="loading"]')).not.toBeNull();
  });

  it('空 items 渲染 empty 态，文案走 pg.* 字典', () => {
    const el = makeEl({ items: [], title: '商品' });
    expect(el.$('[data-role="empty"]')).not.toBeNull();
    expect(el.$('[data-role="empty-text"]').textContent).toBe('暂无商品');
  });

  it('en-US 时空态文案跟随切换', () => {
    setLocale('en-US');
    try {
      const el = makeEl({ items: [] });
      expect(el.$('[data-role="empty-text"]').textContent).toBe('No products');
    } finally {
      setLocale('zh-CN');
    }
  });

  it('one-column（默认）：.card 条目含 thumb/title/subtitle/price/price-del/btn', () => {
    const el = makeEl({ items: ITEMS });
    const card = el.$('.card[data-index="0"]');
    expect(card).not.toBeNull();
    expect(card.querySelector('.thumb')).not.toBeNull();
    expect(card.querySelector('.title').textContent).toBe('无线耳机');
    expect(card.querySelector('.subtitle').textContent).toBe('降噪');
    expect(card.querySelector('.price').textContent).toBe('¥199');
    expect(card.querySelector('.price-del').textContent).toBe('¥299');
    expect(card.querySelector('[data-role="add-btn"]').textContent).toBe('加入购物车');
  });

  it('two-column：条目仍为 .card，容器带 grid class', () => {
    const el = makeEl({ items: ITEMS, variant: 'two-column' });
    expect(el.$('[data-role="list"]').classList.contains('grid')).toBe(true);
    expect(el.$$('.card[data-index]').length).toBe(2);
    expect(el.$('.card[data-index="0"] .subtitle')).toBeNull(); // 紧凑模式不渲染副标题
  });

  it('点击条目派发 itemclick（index+item）', () => {
    const el = makeEl({ items: ITEMS });
    let got = null;
    el.addEventListener('af-product-grid:itemclick', (e) => { got = e.detail; });
    el.$('.card[data-index="1"]').dispatchEvent(new Event('click', { bubbles: true, composed: true }));
    expect(got).toEqual({ index: 1, item: ITEMS[1] });
  });

  it('disabled 条目不派发 itemclick（aria-disabled 拦截）', () => {
    const el = makeEl({ items: [{ title: 'x', disabled: true }] });
    let fired = false;
    el.addEventListener('af-product-grid:itemclick', () => { fired = true; });
    el.$('.card[data-index="0"]').dispatchEvent(new Event('click', { bubbles: true, composed: true }));
    expect(fired).toBe(false);
  });

  it('键盘导航：ArrowDown 聚焦下一条目，Enter 派发 itemclick', () => {
    const el = makeEl({ items: ITEMS });
    let got = null;
    el.addEventListener('af-product-grid:itemclick', (e) => { got = e.detail; });
    const list = el.$('[data-role="list"]');
    list.focus();
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(el._itemEls[0]).toBe(document.activeElement);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(got?.index).toBe(0);
  });

  it('XSS：title/img 转义（不产生注入元素）', () => {
    const el = makeEl({ items: [{ title: '<img onerror=x>', img: '" onerror="y' }] });
    expect(el.$$('.card img').length).toBe(1); // 仅 thumb 本身，恶意串未解析成元素
    expect(el.$('.card .title').textContent).toBe('<img onerror=x>');
    expect(el.$('.card img').getAttribute('src')).toBe('" onerror="y');
    expect(el.$('.card img').getAttribute('alt')).toBe('<img onerror=x>');
  });

  it('错误态：setError 渲染错误文案 + 重试按钮派发 retry', () => {
    const el = makeEl({ items: [] });
    el.setError(new Error('boom'));
    expect(el.$('[data-role="error-text"]').textContent).toBe('加载失败');
    let retried = false;
    el.addEventListener('af-product-grid:retry', () => { retried = true; });
    el.$('[data-role="retry-btn"]').click();
    expect(retried).toBe(true);
  });
});
