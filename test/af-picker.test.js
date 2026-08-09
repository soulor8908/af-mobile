import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfPicker } from '../src/components/af-picker.js';
customElements.define('af-picker', AfPicker);

const COLUMNS = [
  [{ label: '北京', value: 'bj' }, { label: '上海', value: 'sh' }, { label: '广州', value: 'gz' }],
  [{ label: '东城区', value: 'dc' }, { label: '黄浦区', value: 'hp' }, { label: '天河区', value: 'th' }],
];

function makePicker(props = {}) {
  const el = new AfPicker();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-picker Shadow DOM', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('Shadow DOM 已挂载：含 picker + header + columns', () => {
    const el = makePicker({ columns: COLUMNS });
    expect(el.shadowRoot).not.toBeNull();
    expect(el.$('.picker')).not.toBeNull();
    expect(el.$('.header')).not.toBeNull();
    expect(el.$('.columns')).not.toBeNull();
    expect(el.$('.btn-cancel')).not.toBeNull();
    expect(el.$('.btn-confirm')).not.toBeNull();
  });

  it('渲染多列 + item', () => {
    const el = makePicker({ columns: COLUMNS });
    const cols = el.$$('.column');
    expect(cols.length).toBe(2);
    expect(cols[0].querySelectorAll('.item').length).toBe(3);
    expect(cols[1].querySelectorAll('.item').length).toBe(3);
  });

  it('column ARIA role=listbox + aria-label', () => {
    const el = makePicker({ columns: COLUMNS });
    const cols = el.$$('.column');
    expect(cols[0].getAttribute('role')).toBe('listbox');
    expect(cols[0].getAttribute('aria-label')).toContain('1');
    expect(cols[1].getAttribute('aria-label')).toContain('2');
  });

  it('values 决定初始 active item', () => {
    const el = makePicker({ columns: COLUMNS, values: ['sh', 'hp'] });
    // 等待 rAF
    return new Promise(resolve => {
      setTimeout(() => {
        const col0Items = el.$$('.column')[0].querySelectorAll('.item');
        expect(col0Items[1].classList.contains('active')).toBe(true);
        expect(col0Items[1].getAttribute('aria-selected')).toBe('true');
        resolve();
      }, 10);
    });
  });

  it('open() 调用 showPopover', () => {
    const el = makePicker({ columns: COLUMNS });
    const picker = el.$('.picker');
    const spy = vi.spyOn(picker, 'showPopover');
    el.open();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('close() 调用 hidePopover', () => {
    const el = makePicker({ columns: COLUMNS });
    const picker = el.$('.picker');
    const spy = vi.spyOn(picker, 'hidePopover');
    el.close();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('点击确认按钮触发 af-picker:confirm + 关闭', () => {
    const el = makePicker({ columns: COLUMNS, values: ['bj', 'dc'] });
    const handler = vi.fn();
    el.addEventListener('af-picker:confirm', handler);
    const closeSpy = vi.spyOn(el, 'close');
    el.$('.btn-confirm').click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.values).toEqual(['bj', 'dc']);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('点击取消按钮触发 af-picker:cancel', () => {
    const el = makePicker({ columns: COLUMNS });
    const handler = vi.fn();
    el.addEventListener('af-picker:cancel', handler);
    el.$('.btn-cancel').click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('scroll 停止后触发 af-picker:change（防抖 100ms）', () => {
    vi.useFakeTimers();
    const el = makePicker({ columns: COLUMNS });
    // 先 flush mounted 中的 rAF（_scrollToValues），避免覆盖测试设置的 scrollTop
    vi.runAllTicks();
    const handler = vi.fn();
    el.addEventListener('af-picker:change', handler);
    const col0 = el.$$('.column')[0];
    // 模拟滚动到第 2 项（scrollTop = itemHeight * 1）
    col0.scrollTop = 36;
    col0.dispatchEvent(new Event('scroll', { bubbles: true }));
    // 100ms 内未触发（防抖）
    vi.advanceTimersByTime(50);
    expect(handler).not.toHaveBeenCalled();
    // 满 100ms 触发
    vi.advanceTimersByTime(50);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ column: 0, value: 'sh', index: 1 });
    vi.useRealTimers();
  });

  it('键盘 ArrowDown 移动选中项', () => {
    const el = makePicker({ columns: COLUMNS, values: ['bj', 'dc'] });
    const col0 = el.$$('.column')[0];
    col0.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(col0.scrollTop).toBe(36); // 移到第 2 项
  });

  it('键盘 ArrowUp 边界处理', () => {
    const el = makePicker({ columns: COLUMNS, values: ['bj', 'dc'] });
    const col0 = el.$$('.column')[0];
    col0.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(col0.scrollTop).toBe(0); // 已在首项，不越界
  });

  it('setColumn 联动：替换某列数据', () => {
    const el = makePicker({ columns: COLUMNS, values: ['sh', 'hp'] });
    const newCol = [{ label: '浦东', value: 'pd' }, { label: '徐汇', value: 'xh' }];
    el.setColumn(1, newCol, 'pd');
    const cols = el.$$('.column');
    expect(cols[1].querySelectorAll('.item').length).toBe(2);
    expect(el.values[1]).toBe('pd');
  });

  it('item-height / visible-count 影响列高', () => {
    const el = makePicker({ columns: COLUMNS, itemHeight: 50, visibleCount: 7 });
    const columnsEl = el.$('.columns');
    expect(columnsEl.style.height).toBe('350px'); // 50 * 7
  });

  it('onAttributeChange：title 属性变化更新显示', () => {
    const el = makePicker({ columns: COLUMNS, title: '原标题' });
    el.setAttribute('title', '新标题');
    expect(el.$('.title').textContent).toBe('新标题');
  });

  it('unmounted：清理 scroll 防抖 timer 不报错', () => {
    const el = makePicker({ columns: COLUMNS });
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});
