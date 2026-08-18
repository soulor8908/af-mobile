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

  it('open() 调用 showModal', () => {
    const el = makePicker({ columns: COLUMNS });
    const picker = el.$('.picker');
    const spy = vi.spyOn(picker, 'showModal');
    el.open();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('close() 调用 dialog.close', () => {
    const el = makePicker({ columns: COLUMNS });
    const picker = el.$('.picker');
    const spy = vi.spyOn(picker, 'close');
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

describe('af-picker 焦点管理（P1-4）', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('open() 保存触发元素焦点并聚焦首列', () => {
    const trigger = document.createElement('button');
    trigger.textContent = '打开';
    document.body.appendChild(trigger);
    trigger.focus();
    const el = makePicker({ columns: COLUMNS });
    const focusSpy = vi.spyOn(el._scrollers[0], 'focus');
    el.open();
    expect(el._previouslyFocused).toBe(trigger);
    // rAF 内聚焦首列
    return new Promise(resolve => {
      setTimeout(() => {
        expect(focusSpy).toHaveBeenCalledTimes(1);
        resolve();
      }, 10);
    });
  });

  it('close() 还原焦点到触发元素', () => {
    const trigger = document.createElement('button');
    trigger.textContent = '打开';
    document.body.appendChild(trigger);
    trigger.focus();
    const el = makePicker({ columns: COLUMNS });
    el.open();
    const focusSpy = vi.spyOn(trigger, 'focus');
    el.close();
    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(el._previouslyFocused).toBeNull();
  });
});

describe('af-picker 属性变更（补充分支）', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('onAttributeChange：confirmText 变化更新确定按钮', () => {
    const el = makePicker({ columns: COLUMNS, confirmText: '确定' });
    el.confirmText = 'OK';
    expect(el.$('.btn-confirm').textContent).toBe('OK');
  });

  it('onAttributeChange：cancelText 变化更新取消按钮', () => {
    const el = makePicker({ columns: COLUMNS, cancelText: '取消' });
    el.cancelText = 'X';
    expect(el.$('.btn-cancel').textContent).toBe('X');
  });

  it('onAttributeChange：columns 变化重渲染列', () => {
    const el = makePicker({ columns: COLUMNS });
    el.columns = [[{ label: 'A', value: 'a' }]];
    expect(el.$$('.column').length).toBe(1);
    expect(el.$$('.column')[0].querySelectorAll('.item').length).toBe(1);
  });

  it('onAttributeChange：item-height/visible-count 变化重设列高', () => {
    const el = makePicker({ columns: COLUMNS, itemHeight: 36, visibleCount: 5 });
    el.itemHeight = 50;
    el.visibleCount = 7;
    expect(el.$('.columns').style.height).toBe('350px');
  });
});

describe('af-picker DSD 水合', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('DSD 预填充后 mounted 不覆盖 shadowRoot，columns 仍渲染', () => {
    const el = new AfPicker();
    el.columns = COLUMNS;
    // 模拟 DSD：先 attach 再 populate
    el.attachShadow({ mode: 'open' });
    el.shadowRoot.innerHTML = el.shadowHTML();
    expect(el._dsdPrepopulated()).toBe(true);
    // 追加到 DOM → 水合
    document.body.appendChild(el);
    // shadow 内容未被覆盖
    expect(el.shadowRoot.innerHTML).toContain('picker');
    expect(el.$('.picker')).not.toBeNull();
    expect(el.$$('.column').length).toBe(2);
  });

  it('DSD 水合后 open/close 与确认仍正常', () => {
    const el = new AfPicker();
    el.columns = COLUMNS;
    el.attachShadow({ mode: 'open' });
    el.shadowRoot.innerHTML = el.shadowHTML();
    document.body.appendChild(el);
    const picker = el.$('.picker');
    const showSpy = vi.spyOn(picker, 'showModal');
    const hideSpy = vi.spyOn(picker, 'close');
    const handler = vi.fn();
    el.addEventListener('af-picker:confirm', handler);
    el.open();
    expect(showSpy).toHaveBeenCalledTimes(1);
    el.close();
    expect(hideSpy).toHaveBeenCalledTimes(1);
    el.$('.btn-confirm').click();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
