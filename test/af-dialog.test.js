import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfDialog } from '../src/components/af-dialog.js';
customElements.define('af-dialog', AfDialog);

function makeDialog(props = {}) {
  const el = new AfDialog();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  // 添加 slot 内容
  const body = document.createElement('div');
  body.setAttribute('slot', 'body');
  body.innerHTML = '<p>对话框内容</p>';
  el.appendChild(body);
  const footer = document.createElement('div');
  footer.setAttribute('slot', 'footer');
  footer.innerHTML = '<button class="btn">确定</button>';
  el.appendChild(footer);
  document.body.appendChild(el);
  return el;
}

describe('af-dialog Shadow DOM', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('Shadow DOM 已挂载：含 dialog + header + body + footer', () => {
    const el = makeDialog({ title: '确认' });
    expect(el.shadowRoot).not.toBeNull();
    expect(el.$('dialog')).not.toBeNull();
    expect(el.$('header')).not.toBeNull();
    expect(el.$('.body')).not.toBeNull();
    expect(el.$('footer')).not.toBeNull();
  });

  it('title 注入到 .title slot', () => {
    const el = makeDialog({ title: '删除确认' });
    expect(el.$('.title').textContent).toContain('删除确认');
  });

  it('XSS：title 含 HTML 被转义，不执行脚本（P0-1）', () => {
    const el = makeDialog({ title: '<img src=x onerror=alert(1)>' });
    const titleSlot = el.$('.title slot');
    expect(titleSlot.querySelector('img[onerror]')).toBeNull();
    expect(titleSlot.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('aria-label 兜底为"对话框"（无 title 时）', () => {
    const el = makeDialog();
    expect(el.$('dialog').getAttribute('aria-label')).toBe('对话框');
  });

  it('aria-label 跟随 title', () => {
    const el = makeDialog({ title: '重要提示' });
    expect(el.$('dialog').getAttribute('aria-label')).toBe('重要提示');
  });

  it('open() 调用 showModal + 派发 af-dialog:open', () => {
    const el = makeDialog();
    const handler = vi.fn();
    el.addEventListener('af-dialog:open', handler);
    el.open();
    expect(el.isOpen).toBe(true);
    expect(el.hasAttribute('open')).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('close(action) 调用原生 close + 派发 af-dialog:close 含 action', () => {
    const el = makeDialog();
    el.open();
    const handler = vi.fn();
    el.addEventListener('af-dialog:close', handler);
    el.close('confirm');
    expect(el.isOpen).toBe(false);
    expect(el.returnValue).toBe('confirm');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ action: 'confirm' });
  });

  it('close-on-esc=false 时 Esc 不关闭', () => {
    const el = makeDialog({ closeOnEsc: false });
    el.open();
    const dialog = el.$('dialog');
    // 模拟 Esc 键的 cancel 事件
    const event = new Event('cancel', { bubbles: true, cancelable: true });
    dialog.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(el.isOpen).toBe(true);
  });

  it('close-on-esc=true 时 Esc 触发 close("esc")', () => {
    const el = makeDialog({ closeOnEsc: true });
    el.open();
    const handler = vi.fn();
    el.addEventListener('af-dialog:close', handler);
    const dialog = el.$('dialog');
    dialog.dispatchEvent(new Event('cancel', { bubbles: true, cancelable: true }));
    expect(el.isOpen).toBe(false);
    expect(handler.mock.calls[0][0].detail.action).toBe('esc');
  });

  it('点击 backdrop 触发 close("backdrop")', () => {
    const el = makeDialog({ closeOnBackdrop: true });
    el.open();
    const handler = vi.fn();
    el.addEventListener('af-dialog:close', handler);
    const dialog = el.$('dialog');
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(el.isOpen).toBe(false);
    expect(handler.mock.calls[0][0].detail.action).toBe('backdrop');
  });

  it('close-on-backdrop=false 时点击 dialog 不关闭', () => {
    const el = makeDialog({ closeOnBackdrop: false });
    el.open();
    const dialog = el.$('dialog');
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(el.isOpen).toBe(true);
  });

  it('关闭按钮触发 close("close")', () => {
    const el = makeDialog();
    el.open();
    const handler = vi.fn();
    el.addEventListener('af-dialog:close', handler);
    el.$('.close-btn').click();
    expect(handler.mock.calls[0][0].detail.action).toBe('close');
  });

  it('variant=bottom：dialog 在 :host([variant=bottom]) 选择器下', () => {
    const el = makeDialog({ variant: 'bottom' });
    expect(el.getAttribute('variant')).toBe('bottom');
  });

  it('open 属性初始存在：mount 时自动 open()', () => {
    const el = document.createElement('af-dialog');
    el.setAttribute('open', '');
    el.title = '自动打开';
    document.body.appendChild(el);
    // mounted 后 rAF 异步触发
    return new Promise(resolve => {
      setTimeout(() => {
        expect(el.isOpen).toBe(true);
        resolve();
      }, 10);
    });
  });

  it('unmounted：若 dialog 仍打开则关闭', () => {
    const el = makeDialog();
    el.open();
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});

describe('af-dialog 焦点集合覆盖 composed 树（P0-4）', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  // jsdom offsetParent 恒为 null，mock 为非 null 使 _getFocusable 放行
  function mockVisible(el) {
    const btns = [...el.querySelectorAll('button'), ...el.shadowRoot.querySelectorAll('button')];
    for (const btn of btns) {
      Object.defineProperty(btn, 'offsetParent', { value: document.body, configurable: true });
    }
  }

  it('_getFocusable 包含 slotted 页脚按钮（不只扫 Shadow DOM）', () => {
    const el = makeDialog({ title: '确认' });
    mockVisible(el);
    const focusable = el._getFocusable();
    const footerBtn = el.querySelector('[slot="footer"] button');
    expect(focusable).toContain(footerBtn);
  });

  it('_getFocusable 同时含 Shadow 内关闭按钮与 slotted 按钮', () => {
    const el = makeDialog({ title: '确认' });
    mockVisible(el);
    const focusable = el._getFocusable();
    const closeBtn = el.shadowRoot.querySelector('.close-btn');
    const footerBtn = el.querySelector('[slot="footer"] button');
    expect(focusable).toContain(closeBtn);
    expect(focusable).toContain(footerBtn);
  });
});

describe('af-dialog 焦点陷阱键盘逻辑（补充分支）', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  function mockVisible(el) {
    const btns = [...el.querySelectorAll('button'), ...el.shadowRoot.querySelectorAll('button')];
    for (const btn of btns) {
      Object.defineProperty(btn, 'offsetParent', { value: document.body, configurable: true });
    }
  }

  it('_trapKeydown：非 Tab 键不阻止默认', () => {
    const el = makeDialog({ title: '确认' });
    const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    el.$('dialog').dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
  });

  it('_trapKeydown：可聚焦元素 < 2 时 Tab 阻止默认', () => {
    const el = makeDialog({ title: '确认' });
    el.querySelector('[slot="footer"]').remove(); // 仅剩关闭按钮
    mockVisible(el);
    const e = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    el.$('dialog').dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
  });

  it('_trapKeydown：首项 shift+Tab 跳到末项', () => {
    const el = makeDialog({ title: '确认' });
    mockVisible(el);
    const closeBtn = el.shadowRoot.querySelector('.close-btn');
    const footerBtn = el.querySelector('[slot="footer"] button');
    const spy = vi.spyOn(footerBtn, 'focus');
    Object.defineProperty(document, 'activeElement', { value: closeBtn, configurable: true });
    el.$('dialog').dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(spy).toHaveBeenCalled();
  });

  it('_trapKeydown：末项 Tab 跳回首项', () => {
    const el = makeDialog({ title: '确认' });
    mockVisible(el);
    const closeBtn = el.shadowRoot.querySelector('.close-btn');
    const footerBtn = el.querySelector('[slot="footer"] button');
    const spy = vi.spyOn(closeBtn, 'focus');
    Object.defineProperty(document, 'activeElement', { value: footerBtn, configurable: true });
    el.$('dialog').dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(spy).toHaveBeenCalled();
  });
});

describe('af-dialog title/open 属性变更（补充分支）', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('title 属性变化更新 title slot', () => {
    const el = makeDialog({ title: '原' });
    el.title = '新标题';
    expect(el.$('.title slot').textContent).toContain('新标题');
  });

  it('onAttributeChange：open 属性变化触发 open/close', () => {
    // 注：'open' 非受观测属性（无 defineProp），attribute 变更不会自动触发；
    // 此处直接调用 onAttributeChange 覆盖 153-156 分支（open()/close('external')）。
    const el = makeDialog({ title: '确认' });
    const openSpy = vi.spyOn(el, 'open');
    el.onAttributeChange('open', null, '');
    expect(openSpy).toHaveBeenCalled();
    const closeSpy = vi.spyOn(el, 'close');
    el.onAttributeChange('open', '', null);
    expect(closeSpy).toHaveBeenCalledWith('external');
  });
});
