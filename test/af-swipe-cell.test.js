import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfSwipeCell } from '../src/components/af-swipe-cell.js';
customElements.define('af-swipe-cell-test', AfSwipeCell);

function makeSwipeCell(slots = {}) {
  const el = new AfSwipeCell();
  if (slots.content) {
    const c = document.createElement('div');
    c.setAttribute('slot', 'content');
    c.innerHTML = slots.content;
    el.appendChild(c);
  }
  if (slots.right) {
    const r = document.createElement('div');
    r.setAttribute('slot', 'right');
    r.innerHTML = slots.right;
    el.appendChild(r);
  }
  document.body.appendChild(el);
  return el;
}

function touch(el, type, clientX, clientY = 0) {
  const event = new TouchEvent(type, {
    touches: [{ clientX, clientY }].map((t) => new Touch({ target: el, identifier: 0, ...t })),
    bubbles: true,
    cancelable: true,
  });
  el.dispatchEvent(event);
  return event;
}

describe('af-swipe-cell', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('渲染 track + content + right 容器', () => {
    const el = makeSwipeCell({ content: '内容', right: '<button>删除</button>' });
    expect(el.$('[data-role="track"]')).not.toBeNull();
    expect(el.$('[data-role="content"]')).not.toBeNull();
    expect(el.$('[data-role="right"]')).not.toBeNull();
  });

  it('slot=content / slot=right 子节点被搬入对应容器', () => {
    const el = makeSwipeCell({ content: '内容', right: '<button>删除</button>' });
    expect(el.$('[data-role="content"]').textContent).toBe('内容');
    expect(el.$('[data-role="right"]').querySelector('button')).not.toBeNull();
  });

  it('slot=right 多同级子元素被摊平为 right 区直接子项（参与 flex 居中）', () => {
    // makeSwipeCell 会把 right 内容包进 <div slot="right">；此处传多个平级操作项
    const el = makeSwipeCell({
      content: '内容',
      right: '<button data-action="delete">删除</button><span>|</span><button data-action="mark">标记</button>',
    });
    const right = el.$('[data-role="right"]');
    // 包装层被摊平：三个元素都直接挂在 right 下，无包装 div
    expect(right.children.length).toBe(3);
    expect([...right.children].map(c => c.tagName)).toEqual(['BUTTON', 'SPAN', 'BUTTON']);
    // 每个 data-action 仍可触发
    const handler = vi.fn();
    el.addEventListener('af-swipe-cell:action', handler);
    right.querySelector('[data-action="delete"]').click();
    expect(handler.mock.calls[0][0].detail.action).toBe('delete');
  });

  it('左滑超过阈值后松手吸附到打开状态', () => {
    const el = makeSwipeCell({ content: '内容', right: '<button data-action="delete">删除</button>' });
    // 模拟 right 宽度
    Object.defineProperty(el.$('[data-role="right"]'), 'offsetWidth', { value: 100, configurable: true });
    touch(el, 'touchstart', 100, 0);
    touch(el, 'touchmove', 40, 0); // 左滑 60px > 50(阈值)
    touch(el, 'touchend', 40, 0);
    const x = el.$('[data-role="track"]').style.getPropertyValue('--af-swipe-x');
    expect(x).toBe('-100px');
  });

  it('左滑未超过阈值后松手回弹收起', () => {
    const el = makeSwipeCell({ content: '内容', right: '<button>删除</button>' });
    Object.defineProperty(el.$('[data-role="right"]'), 'offsetWidth', { value: 100, configurable: true });
    touch(el, 'touchstart', 100, 0);
    touch(el, 'touchmove', 70, 0); // 左滑 30px < 50(阈值)
    touch(el, 'touchend', 70, 0);
    const x = el.$('[data-role="track"]').style.getPropertyValue('--af-swipe-x');
    expect(x).toBe('0px');
  });

  it('垂直滑动不触发横向偏移', () => {
    const el = makeSwipeCell({ content: '内容', right: '<button>删除</button>' });
    touch(el, 'touchstart', 100, 100);
    touch(el, 'touchmove', 100, 150); // 纵向移动
    touch(el, 'touchend', 100, 150);
    // 垂直移动时 direction='y'，--af-swipe-x 从未被 setProperty 设置（空串）
    const x = el.$('[data-role="track"]').style.getPropertyValue('--af-swipe-x');
    expect(x).toBe('');
  });

  it('open() 打开右侧操作区', () => {
    const el = makeSwipeCell({ content: '内容', right: '<button>删除</button>' });
    Object.defineProperty(el.$('[data-role="right"]'), 'offsetWidth', { value: 80, configurable: true });
    el.open();
    const x = el.$('[data-role="track"]').style.getPropertyValue('--af-swipe-x');
    expect(x).toBe('-80px');
  });

  it('close() 关闭右侧操作区', () => {
    const el = makeSwipeCell({ content: '内容', right: '<button>删除</button>' });
    Object.defineProperty(el.$('[data-role="right"]'), 'offsetWidth', { value: 80, configurable: true });
    el.open();
    el.close();
    const x = el.$('[data-role="track"]').style.getPropertyValue('--af-swipe-x');
    expect(x).toBe('0px');
  });

  it('点击 data-action 按钮派发 af-swipe-cell:action', () => {
    const el = makeSwipeCell({ content: '内容', right: '<button data-action="delete">删除</button>' });
    const handler = vi.fn();
    el.addEventListener('af-swipe-cell:action', handler);
    el.$('[data-role="right"]').querySelector('button').click();
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: { action: 'delete' } }));
  });

  it('点击操作按钮后自动关闭', () => {
    const el = makeSwipeCell({ content: '内容', right: '<button data-action="delete">删除</button>' });
    Object.defineProperty(el.$('[data-role="right"]'), 'offsetWidth', { value: 80, configurable: true });
    el.open();
    el.$('[data-role="right"]').querySelector('button').click();
    const x = el.$('[data-role="track"]').style.getPropertyValue('--af-swipe-x');
    expect(x).toBe('0px');
  });

  it('内联 style 为空（遵守 wc-light-no-style，仅 setProperty 设 CSS 变量）', () => {
    const el = makeSwipeCell({ content: '内容', right: '<button>删除</button>' });
    expect(el.style.cssText).toBe('');
  });

  it('unmounted 不报错', () => {
    const el = makeSwipeCell({ content: '内容', right: '<button>删除</button>' });
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});

describe('af-swipe-cell 点击收起（补充分支）', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('点击非操作区且已展开时收起', () => {
    const el = makeSwipeCell({ content: '内容', right: '<button data-action="delete">删除</button>' });
    Object.defineProperty(el.$('[data-role="right"]'), 'offsetWidth', { value: 80, configurable: true });
    el.open();
    expect(el.$('[data-role="track"]').style.getPropertyValue('--af-swipe-x')).toBe('-80px');
    const closeSpy = vi.spyOn(el, 'close');
    el.$('[data-role="content"]').click();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('未展开时点击非操作区不触发关闭', () => {
    const el = makeSwipeCell({ content: '内容', right: '<button data-action="delete">删除</button>' });
    const closeSpy = vi.spyOn(el, 'close');
    el.$('[data-role="content"]').click();
    expect(closeSpy).not.toHaveBeenCalled();
  });
});

describe('af-swipe-cell disabled + 键盘可达', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('disabled 时触摸拖拽不生效', () => {
    const el = makeSwipeCell({ content: '内容', right: '<button>删除</button>' });
    Object.defineProperty(el.$('[data-role="right"]'), 'offsetWidth', { value: 100, configurable: true });
    el.disabled = true;
    touch(el, 'touchstart', 100, 0);
    touch(el, 'touchmove', 40, 0);
    touch(el, 'touchend', 40, 0);
    expect(el.$('[data-role="track"]').style.getPropertyValue('--af-swipe-x')).toBe('');
  });

  it('disabled 时 open() 不展开', () => {
    const el = makeSwipeCell({ content: '内容', right: '<button>删除</button>' });
    Object.defineProperty(el.$('[data-role="right"]'), 'offsetWidth', { value: 80, configurable: true });
    el.disabled = true;
    el.open();
    expect(el.$('[data-role="track"]').style.getPropertyValue('--af-swipe-x')).toBe('');
  });

  it('disabled 时点击操作按钮不发事件', () => {
    const el = makeSwipeCell({ content: '内容', right: '<button data-action="delete">删除</button>' });
    const handler = vi.fn();
    el.addEventListener('af-swipe-cell:action', handler);
    el.disabled = true;
    el.$('[data-role="right"]').querySelector('button').click();
    expect(handler).not.toHaveBeenCalled();
  });

  it('track 可聚焦，Enter 打开 / Escape 关闭', () => {
    const el = makeSwipeCell({ content: '内容', right: '<button>删除</button>' });
    Object.defineProperty(el.$('[data-role="right"]'), 'offsetWidth', { value: 80, configurable: true });
    const track = el.$('[data-role="track"]');
    expect(track.getAttribute('tabindex')).toBe('0');
    track.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(track.style.getPropertyValue('--af-swipe-x')).toBe('-80px');
    track.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(track.style.getPropertyValue('--af-swipe-x')).toBe('0px');
  });

  it('设置 disabled 同步 aria-disabled 且已打开时自动收起', () => {
    const el = makeSwipeCell({ content: '内容', right: '<button>删除</button>' });
    Object.defineProperty(el.$('[data-role="right"]'), 'offsetWidth', { value: 80, configurable: true });
    el.open();
    el.disabled = true;
    expect(el.getAttribute('aria-disabled')).toBe('true');
    expect(el.$('[data-role="track"]').style.getPropertyValue('--af-swipe-x')).toBe('0px');
    el.disabled = false;
    expect(el.hasAttribute('aria-disabled')).toBe(false);
  });
});
