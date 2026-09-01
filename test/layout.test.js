// layout.test.js —— withLayout 页面布局包装器（OPT-1）
// 覆盖：骨架渲染 / active 自动推导（精确 + 前缀）/ 内容区 outlet 指向 / 点击导航 / 方向键导航
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { withLayout } from '../src/lib/layout.js';
import { _resetRouter } from '../src/lib/router.js';

const TABS = [
  { path: '/today', label: '今天', icon: '✓' },
  { path: '/todos', label: '清单' },
  { path: '/mine', label: '我的' },
];

function makeCtx() {
  const outlet = document.createElement('div');
  document.body.appendChild(outlet);
  return { outlet, signal: new AbortController().signal };
}

const setup = (layout, handler) => withLayout(layout, handler || (() => {}));

beforeEach(() => {
  document.body.innerHTML = '';
  history.pushState({}, '', '/');
  _resetRouter();
});

afterEach(() => {
  _resetRouter();
});

describe('withLayout 骨架渲染', () => {
  it('渲染 navbar + 内容区 + tabbar', () => {
    const ctx = makeCtx();
    setup({ title: '我的应用', tabbar: TABS })({}, ctx);
    expect(ctx.outlet.querySelector('.navbar .title').textContent).toBe('我的应用');
    expect(ctx.outlet.querySelector('[data-role="page"]')).toBeTruthy();
    expect(ctx.outlet.querySelectorAll('.tab-item').length).toBe(3);
  });

  it('缺省 title / tabbar 时对应骨架不渲染', () => {
    const ctx = makeCtx();
    setup({})({}, ctx);
    expect(ctx.outlet.querySelector('.navbar')).toBeNull();
    expect(ctx.outlet.querySelector('.tabbar')).toBeNull();
  });

  it('handler 的 ctx.outlet 指向内容区', () => {
    const ctx = makeCtx();
    const page = vi.fn();
    setup({ tabbar: TABS }, page)({}, ctx);
    expect(page).toHaveBeenCalledTimes(1);
    const [params, pageCtx] = page.mock.calls[0];
    expect(params).toEqual({});
    expect(pageCtx.outlet).toBe(ctx.outlet.querySelector('[data-role="page"]'));
    expect(pageCtx.signal).toBe(ctx.signal);
  });
});

describe('tabbar active 自动推导', () => {
  it('精确匹配：/todos 激活第 2 项', () => {
    history.pushState({}, '', '/todos');
    const ctx = makeCtx();
    setup({ tabbar: TABS })({}, ctx);
    const items = [...ctx.outlet.querySelectorAll('.tab-item')];
    expect(items.map((i) => i.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    expect(items[1].getAttribute('tabindex')).toBe('0');
  });

  it('前缀匹配：/todos/1 激活 /todos（子路径沿用父 tab）', () => {
    history.pushState({}, '', '/todos/1');
    const ctx = makeCtx();
    setup({ tabbar: TABS })({}, ctx);
    const items = [...ctx.outlet.querySelectorAll('.tab-item')];
    expect(items.map((i) => i.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
  });

  it('hash 路由模式同样生效', () => {
    location.hash = '#/mine';
    const ctx = makeCtx();
    setup({ tabbar: TABS })({}, ctx);
    const items = [...ctx.outlet.querySelectorAll('.tab-item')];
    expect(items.map((i) => i.getAttribute('aria-selected'))).toEqual(['false', 'false', 'true']);
    location.hash = '';
  });
});

describe('tabbar 交互', () => {
  it('点击 tab 项导航到对应路径（已激活项不重复导航）', async () => {
    history.pushState({}, '', '/today');
    const pushSpy = vi.spyOn(history, 'pushState');
    const ctx = makeCtx();
    setup({ tabbar: TABS })({}, ctx);
    const items = [...ctx.outlet.querySelectorAll('.tab-item')];
    items[1].click();
    await new Promise((r) => setTimeout(r, 0));
    expect(pushSpy).toHaveBeenCalledWith({}, '', '/todos');
    // 当前路径已是 /todos：再点同一项不重复导航
    pushSpy.mockClear();
    items[1].click();
    await new Promise((r) => setTimeout(r, 0));
    expect(pushSpy).not.toHaveBeenCalled();
    pushSpy.mockRestore();
  });

  it('方向键在 tab 间移动焦点并激活', async () => {
    const pushSpy = vi.spyOn(history, 'pushState');
    const ctx = makeCtx();
    setup({ tabbar: TABS })({}, ctx);
    const items = [...ctx.outlet.querySelectorAll('.tab-item')];
    items[0].focus();
    ctx.outlet.querySelector('.tabbar').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(items[1]);
    await new Promise((r) => setTimeout(r, 0));
    expect(pushSpy).toHaveBeenCalledWith({}, '', '/todos');
    pushSpy.mockRestore();
  });
});
