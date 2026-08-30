// @af-mobile/ui/test 测试环境预设：一个 import 应注入全部 jsdom 缺失的浏览器 API 桩
// 仓库自身的 test/setup.js 已 import 本预设，这里显式再引一次并断言桩可用
import { describe, it, expect } from 'vitest';
import '../src/test-setup.js';

describe('@af-mobile/ui/test 测试环境预设', () => {
  it('补齐 jsdom 缺失的浏览器 API', () => {
    expect(window.matchMedia).toBeTypeOf('function');
    expect(HTMLDialogElement.prototype.showModal).toBeTypeOf('function');
    expect(HTMLDialogElement.prototype.close).toBeTypeOf('function');
    expect(HTMLElement.prototype.showPopover).toBeTypeOf('function');
    expect(HTMLElement.prototype.hidePopover).toBeTypeOf('function');
    expect(typeof global.ToggleEvent).toBe('function');
    expect(global.IntersectionObserver).toBeTypeOf('function');
    expect(global.ResizeObserver).toBeTypeOf('function');
    expect(global.Touch).toBeTypeOf('function');
    expect(global.TouchEvent).toBeTypeOf('function');
    expect(HTMLSlotElement.prototype.assignedElements).toBeTypeOf('function');
    expect(URL.createObjectURL).toBeTypeOf('function');
    expect(URL.revokeObjectURL).toBeTypeOf('function');
    expect(window.scrollTo).toBeTypeOf('function');
    expect(global.requestAnimationFrame).toBeTypeOf('function');
    expect(global.cancelAnimationFrame).toBeTypeOf('function');
  });

  it('dialog 桩：showModal/close 置 open 并派发 close 事件', () => {
    const d = document.createElement('dialog');
    document.body.appendChild(d);
    d.showModal();
    expect(d.open).toBe(true);
    let closed = false;
    d.addEventListener('close', () => { closed = true; });
    d.close('ok');
    expect(d.open).toBe(false);
    expect(d.returnValue).toBe('ok');
    expect(closed).toBe(true);
  });

  it('popover 桩：show/hide 打 dataset 标记并派发 toggle 事件', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    let state = null;
    el.addEventListener('toggle', (e) => { state = e.newState; });
    el.showPopover();
    expect(el.dataset.popoverOpen).toBe('true');
    expect(state).toBe('open');
    el.hidePopover();
    expect(el.dataset.popoverOpen).toBe('false');
    expect(state).toBe('closed');
  });

  it('IntersectionObserver 桩：trigger 主动触发交叉回调（jsdom 无布局，不会自动触发）', () => {
    let seen = null;
    const io = new IntersectionObserver((entries) => { seen = entries[0]; });
    const target = document.createElement('div');
    io.observe(target);
    io.trigger(target, true);
    expect(seen.target).toBe(target);
    expect(seen.isIntersecting).toBe(true);
  });

  it('rAF 桩：回调在 microtask 内 flush（vi.runAllTicks 可驱动）', async () => {
    let called = false;
    global.requestAnimationFrame(() => { called = true; });
    await Promise.resolve();
    expect(called).toBe(true);
  });
});
