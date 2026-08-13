import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initBind, registerDataRef, unregisterDataRef, _resetBind } from '../src/lib/bind.js';
import { definePage, createPage, state, derived, _resetPage } from '../src/lib/page.js';

beforeEach(() => {
  document.body.innerHTML = '';
  _resetBind();
  _resetPage();
});

describe(':bind state.field 绑定', () => {
  it('初始值同步到 attribute', () => {
    definePage({ state: { title: 'Hello' } });
    document.body.innerHTML = `<div :title="state.title"></div>`;
    initBind();
    expect(document.querySelector('div').getAttribute('title')).toBe('Hello');
  });

  it('state 变化时 attribute 自动更新', () => {
    definePage({ state: { count: 1 } });
    document.body.innerHTML = `<div :data-count="state.count"></div>`;
    initBind();
    state.count = 99;
    expect(document.querySelector('div').getAttribute('data-count')).toBe('99');
  });

  it('false / null / undefined 移除 attribute', () => {
    definePage({ state: { flag: true } });
    document.body.innerHTML = `<div :disabled="state.flag"></div>`;
    initBind();
    expect(document.querySelector('div').hasAttribute('disabled')).toBe(true);
    state.flag = false;
    expect(document.querySelector('div').hasAttribute('disabled')).toBe(false);
  });

  it('对象值 JSON 序列化', () => {
    definePage({ state: { items: [1, 2, 3] } });
    document.body.innerHTML = `<div :data-items="state.items"></div>`;
    initBind();
    expect(document.querySelector('div').getAttribute('data-items')).toBe('[1,2,3]');
  });
});

describe(':bind derived.field 绑定', () => {
  it('computed 变化时 attribute 更新', () => {
    definePage({
      state: { count: 1 },
      computed: { doubled: () => state.count * 2 },
    });
    document.body.innerHTML = `<div :data-d="derived.doubled"></div>`;
    initBind();
    expect(document.querySelector('div').getAttribute('data-d')).toBe('2');
    state.count = 5;
    expect(document.querySelector('div').getAttribute('data-d')).toBe('10');
  });
});

describe(':bind refName.field（af-data ref）绑定', () => {
  it('注册 ref 后可绑定', () => {
    registerDataRef('ds', () => ({ data: [1, 2, 3], loading: false }));
    document.body.innerHTML = `<div :data-len="ds.data"></div>`;
    initBind();
    expect(document.querySelector('div').getAttribute('data-len')).toBe('[1,2,3]');
  });

  it('ref 读取实时值', () => {
    let data = [1];
    registerDataRef('ds', () => ({ data }));
    document.body.innerHTML = `<div :data-len="ds.data"></div>`;
    initBind();
    expect(document.querySelector('div').getAttribute('data-len')).toBe('[1]');
    // ref 是普通函数，数据变化后需 effect 重新触发（af-data 内部用 signal 驱动）
    data = [1, 2, 3];
    // 重新初始化绑定模拟 effect 重跑
    document.body.innerHTML = `<div :data-len="ds.data"></div>`;
    initBind();
    expect(document.querySelector('div').getAttribute('data-len')).toBe('[1,2,3]');
  });

  it('非法表达式不绑定', () => {
    document.body.innerHTML = `<div :title="a + b"></div>`;
    initBind();
    expect(document.querySelector('div').hasAttribute('title')).toBe(false);
    expect(document.querySelector('div').hasAttribute(':title')).toBe(false);
  });
});

describe('initBind MutationObserver', () => {
  it('新增 DOM 节点自动绑定', async () => {
    definePage({ state: { x: 'foo' } });
    initBind();
    const div = document.createElement('div');
    div.setAttribute(':title', 'state.x');
    document.body.appendChild(div);
    // MutationObserver 异步触发
    await new Promise(r => setTimeout(r, 0));
    expect(div.getAttribute('title')).toBe('foo');
  });
});

describe('initBind 多实例（ctx）', () => {
  it('ctx.state 绑定到独立实例', () => {
    const page = createPage({ state: { title: 'Instance A' } });
    document.body.innerHTML = `<div :title="state.title"></div>`;
    initBind(document.body, page);
    const div = document.querySelector('div');
    expect(div.getAttribute('title')).toBe('Instance A');
    page.state.title = 'Updated';
    expect(div.getAttribute('title')).toBe('Updated');
  });

  it('ctx 实例与全局隔离', () => {
    definePage({ state: { title: 'Global' } });
    const page = createPage({ state: { title: 'Instance' } });
    document.body.innerHTML = `<div :title="state.title"></div>`;
    initBind(document.body, page);
    const div = document.querySelector('div');
    expect(div.getAttribute('title')).toBe('Instance');
    state.title = 'Global2';   // 全局变化不影响 ctx 实例绑定
    expect(div.getAttribute('title')).toBe('Instance');
    page.state.title = 'Instance2';
    expect(div.getAttribute('title')).toBe('Instance2');
  });
});
