// date.test.js —— 本地时区日期工具（OPT-8）
import { describe, it, expect } from 'vitest';
import { todayISO, formatDate } from '../src/lib/date.js';

describe('todayISO', () => {
  it('返回本地时区 YYYY-MM-DD（与本地日期分量一致，非 UTC）', () => {
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(todayISO()).toBe(expected);
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('formatDate', () => {
  it('Date 对象各记号格式化', () => {
    const d = new Date(2026, 0, 1, 15, 42, 5);
    expect(formatDate(d, 'YYYY-MM-DD HH:mm:ss')).toBe('2026-01-01 15:42:05');
    expect(formatDate(d)).toBe('2026-01-01');
  });

  it("'YYYY-MM-DD' 字符串按本地时区解析（等价于本地 new Date(y, m-1, d)）", () => {
    expect(formatDate('2026-01-01')).toBe(formatDate(new Date(2026, 0, 1)));
    expect(formatDate('2026-01-01')).toBe('2026-01-01');
  });

  it('时间戳（本地时区午夜往返）', () => {
    const ts = new Date(2026, 5, 15).getTime();
    expect(formatDate(ts)).toBe('2026-06-15');
  });

  it('无效输入返回空串', () => {
    expect(formatDate('not-a-date')).toBe('');
    expect(formatDate(NaN)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });
});
