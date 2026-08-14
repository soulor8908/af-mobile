import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfCalendar } from '../src/components/af-calendar.js';
customElements.define('af-calendar-test', AfCalendar);

function makeCalendar(props = {}) {
  const el = new AfCalendar();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-calendar Shadow DOM', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('挂载 header + 7 列 weekdays + 日期网格', () => {
    const el = makeCalendar({ month: '2026-08' });
    expect(el.shadowRoot).not.toBeNull();
    expect(el.$('.month').textContent).toContain('2026');
    expect(el.$$('.weekdays span').length).toBe(7);
    // 2026-08-01 是周六（getDay=6）→ 6 个前导空格 + 31 天 + 5 个尾部补全
    const days = el.$$('.day');
    expect(days.length).toBe(31);
    expect(el.$$('.blank').length).toBe(11);
  });

  it('value 选中日期高亮 + aria-current', () => {
    const el = makeCalendar({ month: '2026-08', value: '2026-08-14' });
    const sel = el.$('.day-selected');
    expect(sel).not.toBeNull();
    expect(sel.dataset.date).toBe('2026-08-14');
    expect(sel.getAttribute('aria-current')).toBe('date');
  });

  it('点击日期触发 af-calendar:select 并更新 value', () => {
    const el = makeCalendar({ month: '2026-08' });
    const handler = vi.fn();
    el.addEventListener('af-calendar:select', handler);
    el.$('.day[data-date="2026-08-20"]').click();
    expect(el.value).toBe('2026-08-20');
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: { date: '2026-08-20' } }));
  });

  it('点击导航按钮切换月份 + 触发 af-calendar:monthchange', () => {
    const el = makeCalendar({ month: '2026-08' });
    const handler = vi.fn();
    el.addEventListener('af-calendar:monthchange', handler);
    el.$('.nav[data-nav="1"]').click();
    expect(el.month).toBe('2026-09');
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: { month: '2026-09' } }));
    el.$('.nav[data-nav="-1"]').click();
    expect(el.month).toBe('2026-08');
  });

  it('1 月点上一月跨年回退到 12 月', () => {
    const el = makeCalendar({ month: '2026-01' });
    el.$('.nav[data-nav="-1"]').click();
    expect(el.month).toBe('2025-12');
  });

  it('min/max 约束的日期被禁用', () => {
    const el = makeCalendar({ month: '2026-08', min: '2026-08-10', max: '2026-08-20' });
    expect(el.$('.day[data-date="2026-08-09"]').disabled).toBe(true);
    expect(el.$('.day[data-date="2026-08-21"]').disabled).toBe(true);
    expect(el.$('.day[data-date="2026-08-15"]').disabled).toBe(false);
  });

  it('点击禁用日期不派发 select', () => {
    const el = makeCalendar({ month: '2026-08', min: '2026-08-10' });
    const handler = vi.fn();
    el.addEventListener('af-calendar:select', handler);
    el.$('.day[data-date="2026-08-05"]').click();
    expect(handler).not.toHaveBeenCalled();
    expect(el.value).toBeNull();
  });

  it('今天高亮 day-today', () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const el = makeCalendar({ month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` });
    expect(el.$(`.day-today`).dataset.date).toBe(today);
  });

  it('value 属性变化自动重渲染高亮', () => {
    const el = makeCalendar({ month: '2026-08', value: '2026-08-01' });
    el.value = '2026-08-25';
    const sel = el.$('.day-selected');
    expect(sel.dataset.date).toBe('2026-08-25');
  });

  it('Shadow DOM CSS 全部用 token 变量（wc-shadow-use-token）', () => {
    const el = makeCalendar({ month: '2026-08' });
    const styleText = el.shadowRoot.querySelector('style').textContent;
    expect(styleText).not.toContain('#');
    expect(styleText).toMatch(/var\(--c-brand\)/);
  });

  it('CSS 含 prefers-reduced-motion 覆盖', () => {
    const el = makeCalendar({ month: '2026-08' });
    const styleText = el.shadowRoot.querySelector('style').textContent;
    expect(styleText).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('unmounted 不报错', () => {
    const el = makeCalendar({ month: '2026-08' });
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});

describe('af-calendar DSD 水合', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('DSD 预填充后 mounted 不覆盖 shadowRoot，日期网格保留', () => {
    const el = new AfCalendar();
    el.month = '2026-08';
    el.value = '2026-08-14';
    // 手动构造 DSD 预填充内容（calendar 无 shadowHTML，动态渲染由 mounted 守卫跳过）
    // eslint-disable-next-line aiflow/token-whitelist -- DSD 测试夹具（calendar 内部结构 class）
    const dsdHtml = '<div class="calendar"><div class="header"><div class="month">2026年8月</div></div><div class="weekdays"></div><div class="grid"><button class="day day-selected" data-date="2026-08-14" aria-current="date">14</button></div></div>';
    el.attachShadow({ mode: 'open' });
    el.shadowRoot.innerHTML = dsdHtml;
    expect(el._dsdPrepopulated()).toBe(true);
    document.body.appendChild(el);
    // mounted 跳过 _render，shadow 内容未被覆盖，日历结构保留
    expect(el.shadowRoot.innerHTML).toContain('calendar');
    expect(el.$$('.day').length).toBe(1);
    expect(el.$('.day-selected').dataset.date).toBe('2026-08-14');
  });

  it('DSD 水合后点击选日期仍触发 select', () => {
    const el = new AfCalendar();
    el.month = '2026-08';
    // eslint-disable-next-line aiflow/token-whitelist -- DSD 测试夹具（calendar 内部结构 class）
    const dsdHtml = '<div class="calendar"><div class="grid"><button class="day" data-date="2026-08-20">20</button></div></div>';
    el.attachShadow({ mode: 'open' });
    el.shadowRoot.innerHTML = dsdHtml;
    document.body.appendChild(el);
    const handler = vi.fn();
    el.addEventListener('af-calendar:select', handler);
    el.$('.day[data-date="2026-08-20"]').click();
    expect(el.value).toBe('2026-08-20');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
