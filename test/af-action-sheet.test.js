import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfActionSheet } from '../packages/ui/src/components/af-action-sheet.js';
customElements.define('af-action-sheet', AfActionSheet);

function makeSheet(props = {}) {
  const el = new AfActionSheet();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

const OPTIONS = [
  { label: '拍照', value: 'cam' },
  { label: '相册', value: 'gal' },
  { label: '删除', value: 'del', danger: true },
];

describe('af-action-sheet', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('渲染 sheet + list + items', () => {
    const el = makeSheet({ options: OPTIONS });
    expect(el.$('.sheet')).not.toBeNull();
    expect(el.$('.list')).not.toBeNull();
    expect(el.$$('.list-item').length).toBe(3);
  });

  it('show-cancel=true 默认显示取消按钮', () => {
    const el = makeSheet({ options: OPTIONS });
    expect(el.$('.af-action-sheet-cancel')).not.toBeNull();
    expect(el.$('.af-action-sheet-cancel').textContent).toBe('取消');
  });

  it('show-cancel=false 隐藏取消按钮', () => {
    const el = makeSheet({ options: OPTIONS, showCancel: false });
    expect(el.$('.af-action-sheet-cancel')).toBeNull();
  });

  it('danger 选项加 text-danger class（着色），不再注入无定义的 .danger class', () => {
    const el = makeSheet({ options: OPTIONS });
    const items = el.$$('.list-item');
    expect(items[2].querySelector('.flex-1').classList.contains('text-danger')).toBe(true);
    expect(items[2].classList.contains('danger')).toBe(false); // .danger 无 CSS 定义，已移除
  });

  it('title 透传到标题区', () => {
    const el = makeSheet({ options: OPTIONS, title: '请选择' });
    // 标题用 caption + t-center + p-3 + text-muted（L2 配方/原子）+ role=heading
    const heading = el.$('[role="heading"]');
    expect(heading).not.toBeNull();
    expect(heading.textContent).toBe('请选择');
  });

  it('sheet 元素含 role=dialog + aria-label', () => {
    const el = makeSheet({ options: OPTIONS, title: '请选择' });
    const sheet = el.$('.sheet');
    expect(sheet.getAttribute('role')).toBe('dialog');
    expect(sheet.getAttribute('aria-label')).toBe('请选择');
  });

  it('无 title 时 aria-label 默认"操作面板"', () => {
    const el = makeSheet({ options: OPTIONS });
    expect(el.$('.sheet').getAttribute('aria-label')).toBe('操作面板');
  });

  it('点击选项派发 af-action-sheet:select', () => {
    const el = makeSheet({ options: OPTIONS });
    const handler = vi.fn();
    el.addEventListener('af-action-sheet:select', handler);
    el.$$('.list-item')[1].click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ index: 1, value: 'gal' });
  });

  it('disabled 选项不可点击', () => {
    const opts = [...OPTIONS, { label: '禁用', value: 'x', disabled: true }];
    const el = makeSheet({ options: opts });
    const handler = vi.fn();
    el.addEventListener('af-action-sheet:select', handler);
    el.$$('.list-item')[3].click();
    expect(handler).not.toHaveBeenCalled();
  });

  it('XSS：option.label 含 HTML 被转义，不执行脚本', () => {
    const el = makeSheet({ options: [{ label: '<img src=x onerror=alert(1)>', value: 'x' }] });
    const item = el.$$('.list-item')[0];
    expect(item.querySelector('img[onerror]')).toBeNull();
    expect(item.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('取消按钮派发 af-action-sheet:close', () => {
    const el = makeSheet({ options: OPTIONS });
    const handler = vi.fn();
    el.addEventListener('af-action-sheet:close', handler);
    el.$('.af-action-sheet-cancel').click();
    expect(handler).toHaveBeenCalled();
  });

  it('open/close 委托 popover API', () => {
    const el = makeSheet({ options: OPTIONS });
    const sheet = el.$('.sheet');
    const showSpy = vi.spyOn(sheet, 'showPopover');
    const hideSpy = vi.spyOn(sheet, 'hidePopover');
    el.showPopover();
    el.hidePopover();
    expect(showSpy).toHaveBeenCalledTimes(1);
    expect(hideSpy).toHaveBeenCalledTimes(1);
  });

  it('onAttributeChange：options 变化触发重渲染', () => {
    const el = makeSheet({ options: [] });
    expect(el.$$('.list-item').length).toBe(0);
    el.setAttribute('options', JSON.stringify(OPTIONS));
    expect(el.$$('.list-item').length).toBe(3);
  });

  it('onAttributeChange：属性变化不重建 .sheet 元素（P1-2 局部更新，保留 popover 状态）', () => {
    const el = makeSheet({ options: OPTIONS });
    const sheetBefore = el.$('.sheet');
    el.setAttribute('options', JSON.stringify([...OPTIONS, { label: '新', value: 'n' }]));
    const sheetAfter = el.$('.sheet');
    expect(sheetAfter).toBe(sheetBefore); // 同一元素引用，未整树重建
    expect(el.$$('.list-item').length).toBe(4); // 内容已更新
  });
});

describe('af-action-sheet 焦点陷阱（禁令 #15）', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  // jsdom 的 offsetParent 恒为 null，mock 为非 null 使 _getFocusable 放行
  function mockOffsetParent(el) {
    for (const btn of el.$$('button')) {
      Object.defineProperty(btn, 'offsetParent', { value: document.body, configurable: true });
    }
  }

  it('open 时保存触发元素焦点 + 派发 af-action-sheet:open', () => {
    const trigger = document.createElement('button');
    trigger.textContent = '打开';
    document.body.appendChild(trigger);
    trigger.focus();

    const el = makeSheet({ options: OPTIONS });
    const handler = vi.fn();
    el.addEventListener('af-action-sheet:open', handler);
    el.showPopover();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(el._previouslyFocused).toBe(trigger);
  });

  it('Tab 在末尾折回首项（焦点不逃出）', () => {
    const el = makeSheet({ options: OPTIONS, showCancel: false });
    mockOffsetParent(el);
    el.showPopover();

    const items = el.$$('.list-item');
    const last = items[items.length - 1];
    last.focus();
    const e = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    el.$('.sheet').dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(el.$$('.list-item')[0]);
  });

  it('Shift+Tab 在首项折回末尾', () => {
    const el = makeSheet({ options: OPTIONS, showCancel: false });
    mockOffsetParent(el);
    el.showPopover();

    const first = el.$$('.list-item')[0];
    first.focus();
    const e = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    el.$('.sheet').dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
    const items = el.$$('.list-item');
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it('close 时还原焦点到触发元素', () => {
    const trigger = document.createElement('button');
    trigger.textContent = '打开';
    document.body.appendChild(trigger);
    trigger.focus();

    const el = makeSheet({ options: OPTIONS });
    el.showPopover();
    expect(el._previouslyFocused).toBe(trigger);

    el.hidePopover();
    expect(document.activeElement).toBe(trigger);
    expect(el._previouslyFocused).toBeNull();
  });
});
