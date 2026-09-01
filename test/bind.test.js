import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initBind, registerDataRef, _resetBind } from '../src/lib/bind.js';
import { createPage } from '../src/lib/page.js';

// 每个测试的 initBind 都要断开 observer：未断开的旧 observer 会用旧 stateObj
// 抢先绑定新 DOM（WeakMap first-wins），污染后续用例
const _stops = [];
const bind = (root, page) => { _stops.push(initBind(root, page)); };

beforeEach(() => {
  document.body.innerHTML = '';
  _resetBind();
});

afterEach(() => {
  _stops.splice(0).forEach(stop => stop());
});

describe(':bind state.field 绑定', () => {
  it('初始值同步到 attribute', () => {
    const page = createPage({ state: { title: 'Hello' } });
    document.body.innerHTML = `<div :title="state.title"></div>`;
    bind(document.body, page);
    expect(document.querySelector('div').getAttribute('title')).toBe('Hello');
  });

  it('state 变化时 attribute 自动更新', () => {
    const page = createPage({ state: { count: 1 } });
    document.body.innerHTML = `<div :data-count="state.count"></div>`;
    bind(document.body, page);
    page.state.count = 99;
    expect(document.querySelector('div').getAttribute('data-count')).toBe('99');
  });

  it('false / null / undefined 移除 attribute', () => {
    const page = createPage({ state: { flag: true } });
    document.body.innerHTML = `<div :disabled="state.flag"></div>`;
    bind(document.body, page);
    expect(document.querySelector('div').hasAttribute('disabled')).toBe(true);
    page.state.flag = false;
    expect(document.querySelector('div').hasAttribute('disabled')).toBe(false);
  });

  it('对象值 JSON 序列化', () => {
    const page = createPage({ state: { items: [1, 2, 3] } });
    document.body.innerHTML = `<div :data-items="state.items"></div>`;
    bind(document.body, page);
    expect(document.querySelector('div').getAttribute('data-items')).toBe('[1,2,3]');
  });
});

describe(':bind derived.field 绑定', () => {
  it('computed 变化时 attribute 更新', () => {
    const page = createPage({
      state: { count: 1 },
      computed: { doubled: (s) => s.count * 2 },
    });
    document.body.innerHTML = `<div :data-d="derived.doubled"></div>`;
    bind(document.body, page);
    expect(document.querySelector('div').getAttribute('data-d')).toBe('2');
    page.state.count = 5;
    expect(document.querySelector('div').getAttribute('data-d')).toBe('10');
  });
});

describe(':bind refName.field（af-data ref）绑定', () => {
  it('注册 ref 后可绑定', () => {
    registerDataRef('ds', () => ({ data: [1, 2, 3], loading: false }));
    document.body.innerHTML = `<div :data-len="ds.data"></div>`;
    const page = createPage({ state: {} });
    bind(document.body, page);
    expect(document.querySelector('div').getAttribute('data-len')).toBe('[1,2,3]');
  });

  it('ref 读取实时值', () => {
    let data = [1];
    registerDataRef('ds', () => ({ data }));
    const page = createPage({ state: {} });
    document.body.innerHTML = `<div :data-len="ds.data"></div>`;
    bind(document.body, page);
    expect(document.querySelector('div').getAttribute('data-len')).toBe('[1]');
    // ref 是普通函数，数据变化后需 effect 重新触发（af-data 内部用 signal 驱动）
    data = [1, 2, 3];
    // 重新初始化绑定模拟 effect 重跑
    document.body.innerHTML = `<div :data-len="ds.data"></div>`;
    bind(document.body, page);
    expect(document.querySelector('div').getAttribute('data-len')).toBe('[1,2,3]');
  });

  it('支持多段 ref 路径（af-data data-path 场景）', () => {
    registerDataRef('ds', () => ({ list: { items: ['a', 'b'], meta: { total: 5 } } }));
    const page = createPage({ state: {} });
    document.body.innerHTML = `<div :data-items="ds.list.items" :data-total="ds.list.meta.total"></div>`;
    bind(document.body, page);
    expect(document.querySelector('div').getAttribute('data-items')).toBe('["a","b"]');
    expect(document.querySelector('div').getAttribute('data-total')).toBe('5');
  });

  it('多段 ref 路径未命中时置 undefined 并移除属性', () => {
    registerDataRef('ds', () => ({ a: { b: 1 } }));
    const page = createPage({ state: {} });
    document.body.innerHTML = `<div :data-missing="ds.a.nope"></div>`;
    bind(document.body, page);
    expect(document.querySelector('div').hasAttribute('data-missing')).toBe(false);
  });

  it('非法表达式不绑定', () => {
    const page = createPage({ state: {} });
    document.body.innerHTML = `<div :title="a + b"></div>`;
    bind(document.body, page);
    expect(document.querySelector('div').hasAttribute('title')).toBe(false);
    expect(document.querySelector('div').hasAttribute(':title')).toBe(false);
  });

  it('未解析表达式发出 console.warn 告警（不再静默失败）', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const page = createPage({ state: {} });
    document.body.innerHTML = `<div :title="a + b"></div>`;
    bind(document.body, page);
    expect(warnSpy).toHaveBeenCalledWith('[af-mobile] :bind 未解析:title="a + b"');
    warnSpy.mockRestore();
  });
});

describe('initBind MutationObserver', () => {
  it('新增 DOM 节点自动绑定', async () => {
    const page = createPage({ state: { x: 'foo' } });
    bind(document.body, page);
    const div = document.createElement('div');
    div.setAttribute(':title', 'state.x');
    document.body.appendChild(div);
    // MutationObserver 回调在微任务检查点投递，scan 再经 setTimeout 执行：两段 flush 保证确定性
    await new Promise(r => queueMicrotask(r));
    await new Promise(r => setTimeout(r, 0));
    expect(div.getAttribute('title')).toBe('foo');
  });
});

describe('initBind 多实例（ctx）', () => {
  it('ctx.state 绑定到独立实例', () => {
    const page = createPage({ state: { title: 'Instance A' } });
    document.body.innerHTML = `<div :title="state.title"></div>`;
    bind(document.body, page);
    const div = document.querySelector('div');
    expect(div.getAttribute('title')).toBe('Instance A');
    page.state.title = 'Updated';
    expect(div.getAttribute('title')).toBe('Updated');
  });

  it('两个实例各自绑定互不干扰', () => {
    const a = createPage({ state: { title: 'A' } });
    const b = createPage({ state: { title: 'B' } });
    document.body.innerHTML = `<div :title="state.title"></div>`;
    bind(document.body, a);
    expect(document.querySelector('div').getAttribute('title')).toBe('A');
    document.body.innerHTML = `<div :title="state.title"></div>`;
    bind(document.body, b);
    expect(document.querySelector('div').getAttribute('title')).toBe('B');
    a.state.title = 'A2';   // a 实例变化不影响 b 绑定的元素
    expect(document.querySelector('div').getAttribute('title')).toBe('B');
  });

  it('未传 ctx 抛错（definePage 全局单例已移除）', () => {
    document.body.innerHTML = `<div :title="state.x"></div>`;
    expect(() => initBind()).toThrow(/createPage/);
  });
});

describe('@event 声明式事件绑定（OPT-3）', () => {
  it('@click 绑定 actions 方法并透传事件对象', () => {
    const received = [];
    const page = createPage({
      state: {},
      actions: { inc: (s, e) => received.push(e) },
    });
    document.body.innerHTML = `<button @click="actions.inc"></button>`;
    bind(document.body, page);
    const btn = document.querySelector('button');
    btn.click();
    btn.click();
    expect(received.length).toBe(2);
    expect(received[0]).toBeInstanceOf(Event);
    // 挂接后移除 @attr，防 MutationObserver 重扫重复绑定
    expect(btn.hasAttribute('@click')).toBe(false);
  });

  it('与 :attr 绑定共存于同一元素', () => {
    const page = createPage({
      state: { n: 1 },
      actions: { add: (s) => { s.n += 1; } },
    });
    document.body.innerHTML = `<button :data-n="state.n" @click="actions.add"></button>`;
    bind(document.body, page);
    const btn = document.querySelector('button');
    expect(btn.getAttribute('data-n')).toBe('1');
    btn.click();
    expect(btn.getAttribute('data-n')).toBe('2');
  });

  it('处理器缺失或表达式非 actions.* 时告警且不绑定', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const page = createPage({ state: {} });
    document.body.innerHTML = `<button @click="actions.missing" @hover="notActions"></button>`;
    bind(document.body, page);
    expect(warnSpy).toHaveBeenCalledWith('[af-mobile] @click 未解析:actions.missing');
    expect(warnSpy).toHaveBeenCalledWith('[af-mobile] @hover 未解析:notActions');
    document.querySelector('button').click(); // 不抛错
    warnSpy.mockRestore();
  });

  it('动态新增的 @event 元素自动挂接', async () => {
    const page = createPage({ state: {}, actions: { hit: (s, e) => e.target.dataset.hit = '1' } });
    bind(document.body, page);
    // @attr 只能经 HTML 解析进入 DOM（setAttribute 不接受 @ 开头属性名）
    const wrap = document.createElement('div');
    wrap.innerHTML = `<button @click="actions.hit"></button>`;
    document.body.appendChild(wrap);
    const btn = wrap.querySelector('button');
    await new Promise(r => queueMicrotask(r));
    await new Promise(r => setTimeout(r, 0));
    btn.click();
    expect(btn.dataset.hit).toBe('1');
  });
});
