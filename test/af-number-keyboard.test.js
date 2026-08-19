import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfNumberKeyboard } from '../src/components/af-number-keyboard.js';
customElements.define('af-number-keyboard', AfNumberKeyboard);

function makeKb(props = {}) {
  const el = new AfNumberKeyboard();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-number-keyboard Shadow DOM', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('Shadow DOM 已挂载：含 dialog + header + keys', () => {
    const el = makeKb();
    expect(el.shadowRoot).not.toBeNull();
    expect(el.$('.kb')).not.toBeNull();
    expect(el.$('.header')).not.toBeNull();
    expect(el.$('.title')).not.toBeNull();
    expect(el.$('.close')).not.toBeNull();
    expect(el.$('.keys')).not.toBeNull();
  });

  it('dialog 有 role=dialog（ARIA 必需）', () => {
    const el = makeKb();
    expect(el.$('.kb').getAttribute('role')).toBe('dialog');
  });

  it('渲染 1-9 + 空位 + 0 + 删除：11 个按钮 + 1 个空位', () => {
    const el = makeKb();
    const keys = el.$$('.key');
    expect(keys.length).toBe(12);
    expect(el.$$('.key.blank').length).toBe(1);
    const buttons = el.$$('button.key');
    expect(buttons.length).toBe(11);
    // 顺序固定：1-9 顺排，末行为 [空位, 0, 删除]
    const digits = el.$$('button.key[data-key]').map((b) => b.dataset.key);
    expect(digits).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'delete']);
  });

  it('random=true：数字集合不变但顺序洗牌', () => {
    const el = makeKb({ random: true });
    const digits = el.$$('button.key:not(.key-del)').map((b) => b.dataset.key).filter((k) => k !== 'delete');
    expect(digits.length).toBe(10);
    expect([...digits].sort()).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  });

  it('点击数字键：追加 value + 派发 af-number-keyboard:input', () => {
    const el = makeKb();
    const handler = vi.fn();
    el.addEventListener('af-number-keyboard:input', handler);
    el.$('[data-key="5"]').click();
    expect(el.value).toBe('5');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ key: '5', value: '5' });
  });

  it('点击删除键：移除末位 + 派发 af-number-keyboard:delete；空值时静默', () => {
    const el = makeKb();
    el.$('[data-key="1"]').click();
    el.$('[data-key="2"]').click();
    expect(el.value).toBe('12');
    const handler = vi.fn();
    el.addEventListener('af-number-keyboard:delete', handler);
    el.$('.key-del').click();
    expect(el.value).toBe('1');
    expect(handler.mock.calls[0][0].detail).toEqual({ value: '1' });
    // 删空后再删：不再派发
    el.$('.key-del').click();
    expect(el.value).toBe('');
    handler.mockClear();
    el.$('.key-del').click();
    expect(handler).not.toHaveBeenCalled();
  });

  it('maxlength 达成：派发 complete，后续输入被忽略', () => {
    const el = makeKb({ maxlength: 2 });
    const complete = vi.fn();
    el.addEventListener('af-number-keyboard:complete', complete);
    el.$('[data-key="1"]').click();
    expect(complete).not.toHaveBeenCalled();
    el.$('[data-key="2"]').click();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete.mock.calls[0][0].detail).toEqual({ value: '12' });
    // 已满：继续输入无效
    el.$('[data-key="3"]').click();
    expect(el.value).toBe('12');
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('点击空位键：无输入无事件', () => {
    const el = makeKb();
    const handler = vi.fn();
    el.addEventListener('af-number-keyboard:input', handler);
    el.$('.key.blank').click();
    expect(el.value).toBe('');
    expect(handler).not.toHaveBeenCalled();
  });

  it('open() 调用 showModal；close() 关闭并派发 af-number-keyboard:close', () => {
    const el = makeKb();
    const dialog = el.$('.kb');
    const spy = vi.spyOn(dialog, 'showModal');
    el.open();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(el.isOpen).toBe(true);
    const handler = vi.fn();
    el.addEventListener('af-number-keyboard:close', handler);
    el.close('external');
    expect(el.isOpen).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ source: 'external' });
  });

  it('点击关闭按钮：派发 close(source=close)', () => {
    const el = makeKb();
    el.open();
    const handler = vi.fn();
    el.addEventListener('af-number-keyboard:close', handler);
    el.$('.close').click();
    expect(el.isOpen).toBe(false);
    expect(handler.mock.calls[0][0].detail).toEqual({ source: 'close' });
  });

  it('Esc（cancel 事件）：派发 close(source=esc)', () => {
    const el = makeKb();
    el.open();
    const handler = vi.fn();
    el.addEventListener('af-number-keyboard:close', handler);
    el.$('.kb').dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(el.isOpen).toBe(false);
    expect(handler.mock.calls[0][0].detail).toEqual({ source: 'esc' });
  });

  it('点击遮罩（dialog 自身）：派发 close(source=backdrop)', () => {
    const el = makeKb();
    el.open();
    const handler = vi.fn();
    el.addEventListener('af-number-keyboard:close', handler);
    el.$('.kb').click();
    expect(el.isOpen).toBe(false);
    expect(handler.mock.calls[0][0].detail).toEqual({ source: 'backdrop' });
  });

  it('title 注入标题与 aria-label；无 title 时字典兜底', () => {
    const el = makeKb({ title: '安全键盘' });
    expect(el.$('.title').textContent).toBe('安全键盘');
    expect(el.$('.kb').getAttribute('aria-label')).toBe('安全键盘');
    const el2 = makeKb();
    expect(el2.$('.title').textContent).toBe('数字键盘');
    expect(el2.$('.kb').getAttribute('aria-label')).toBe('数字键盘');
  });

  it('删除键有 aria-label 与文案（i18n）', () => {
    const el = makeKb();
    expect(el.$('.key-del').getAttribute('aria-label')).toBe('删除');
    expect(el.$('.key-del').textContent).toBe('删除');
  });

  it('title 属性变化后标题与 aria-label 更新', () => {
    const el = makeKb();
    el.title = '支付密码';
    expect(el.$('.title').textContent).toBe('支付密码');
    expect(el.$('.kb').getAttribute('aria-label')).toBe('支付密码');
  });
});
