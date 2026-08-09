import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfActionSheet } from '../src/components/af-action-sheet.js';
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

  it('danger 选项加 text-danger class', () => {
    const el = makeSheet({ options: OPTIONS });
    const items = el.$$('.list-item');
    expect(items[2].classList.contains('danger')).toBe(true);
  });

  it('title 透传到标题区', () => {
    const el = makeSheet({ options: OPTIONS, title: '请选择' });
    expect(el.$('.af-action-sheet-title').textContent).toBe('请选择');
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
});
