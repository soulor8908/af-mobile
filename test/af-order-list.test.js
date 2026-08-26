import { describe, it, expect, beforeEach } from 'vitest';
import { AfOrderList } from '../src/blocks/af-order-list.js';
import { setLocale } from '../src/lib/i18n.js';
customElements.define('af-order-list', AfOrderList);

function makeEl(props = {}) {
  const el = new AfOrderList();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

const ORDERS = [
  { no: 'NO-2024-001', time: '2024-05-01 10:00', status: '待付款', tone: 'warn', amount: '¥199.00' },
  { no: 'NO-2024-002', status: '已完成', tone: 'ok' },
];

describe('af-order-list 五态与变体', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('loading=true 渲染骨架屏 + aria-busy', () => {
    const el = makeEl({ loading: true, title: '订单' });
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(el.$('[data-role="loading"]')).not.toBeNull();
  });

  it('空 items 渲染 empty 态，文案走 ol.* 字典', () => {
    const el = makeEl({ items: [], title: '订单' });
    expect(el.$('[data-role="empty-text"]').textContent).toBe('暂无订单');
  });

  it('en-US 时空态文案跟随切换', () => {
    setLocale('en-US');
    try {
      const el = makeEl({ items: [] });
      expect(el.$('[data-role="empty-text"]').textContent).toBe('No orders');
    } finally {
      setLocale('zh-CN');
    }
  });

  it('simple（默认）：.list-item 含订单号/time/tag/price/详情按钮', () => {
    const el = makeEl({ items: ORDERS });
    const row = el.$('.list-item[data-index="0"]');
    expect(row).not.toBeNull();
    expect(row.textContent).toContain('NO-2024-001');
    expect(row.querySelector('.caption').textContent).toContain('2024-05-01');
    expect(row.querySelector('.tag-warn').textContent).toBe('待付款');
    expect(row.querySelector('.price').textContent).toBe('¥199.00');
    expect(row.querySelector('[data-role="detail-btn"]').textContent).toBe('查看详情');
  });

  it('非法 tone 回退为普通 tag（不注入任意 class）', () => {
    const el = makeEl({ items: [{ no: 'x', status: 's', tone: 'hack<>' }] });
    expect(el.$('.tag').className).toBe('tag');
  });

  it('detailed 变体：含 thumbs 缩略图行', () => {
    const el = makeEl({ items: [{ no: 'N', thumbs: ['a.png', 'b.png'] }], variant: 'detailed' });
    expect(el.$$('.list-item .thumb').length).toBe(2);
  });

  it('点击条目派发 itemclick（index+item）', () => {
    const el = makeEl({ items: ORDERS });
    let got = null;
    el.addEventListener('af-order-list:itemclick', (e) => { got = e.detail; });
    el.$('.list-item[data-index="0"]').dispatchEvent(new Event('click', { bubbles: true, composed: true }));
    expect(got).toEqual({ index: 0, item: ORDERS[0] });
  });

  it('键盘导航：ArrowDown/ArrowUp 循环聚焦', () => {
    const el = makeEl({ items: ORDERS });
    const list = el.$('[data-role="list"]');
    list.focus();
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(el._itemEls[0]).toBe(document.activeElement);
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(el._itemEls[1]).toBe(document.activeElement);
  });

  it('XSS：no/status 转义', () => {
    const el = makeEl({ items: [{ no: '<script>x</script>', status: '<img onerror=y>' }] });
    expect(el.innerHTML).not.toContain('<script>');
    expect(el.innerHTML).not.toContain('<img onerror');
  });
});
