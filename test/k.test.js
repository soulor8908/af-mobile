import { describe, it, expect, vi } from 'vitest';
import {
  html, Show, For, Switch, render, clean,
  signal, computed, effect, batch,
} from '../src/k/index.js';

// k 渲染层：html`` 四种绑定 + Show/For/Switch 控制流 + render/clean 作用域清理
// 契约与 experiments/r2 词表卡一致（B3 实验任务集的同款 API 面）

describe('k html`` 四种子位/属性绑定', () => {
  it('静态文本 + 值插值渲染为文本节点（null/undefined → 空串）', () => {
    const f = html`<p>a${1}b${null}c</p>`;
    expect(f.querySelector('p').textContent).toBe('a1bc');
  });

  it('HTML 属性绑定：值 / getter / null 移除 / true 置空', async () => {
    const s = signal('x');
    const f = html`<a href=${() => s()} title=${'t'} disabled=${false} data-x=${null}></a>`;
    const el = f.querySelector('a');
    expect(el.getAttribute('href')).toBe('x');
    expect(el.getAttribute('title')).toBe('t');
    expect(el.hasAttribute('disabled')).toBe(false);
    expect(el.hasAttribute('data-x')).toBe(false);
    s.set('y');
    await Promise.resolve();
    expect(el.getAttribute('href')).toBe('y');
  });

  it('.prop DOM 属性绑定 + @ev 事件绑定', async () => {
    const v = signal('a');
    const on = vi.fn();
    const f = html`<input .value=${() => v()} @input=${on} />`;
    const el = f.querySelector('input');
    expect(el.value).toBe('a');
    v.set('b');
    await Promise.resolve();
    expect(el.value).toBe('b');
    el.dispatchEvent(new Event('input'));
    expect(on).toHaveBeenCalledTimes(1);
  });

  it('插值不进 HTML 解析：值含 <script> 无 XSS 面', () => {
    const f = html`<p>${'<script>alert(1)</' + 'script>'}</p>`;
    expect(f.querySelector('script')).toBeNull();
    expect(f.querySelector('p').textContent).toContain('<script>');
  });

  it('signal getter 子位：set 后 DOM 原位更新（不重建整棵树）', async () => {
    const n = signal(1);
    const f = html`<span data-keep="1">${() => n()}</span>`;
    const span = f.querySelector('span');
    document.body.appendChild(f);
    n.set(2);
    await Promise.resolve();
    expect(span.textContent).toBe('2');
    expect(span.dataset.keep).toBe('1'); // 同一节点未被替换
    document.body.innerHTML = '';
  });

  it('getter 返回数组：展开渲染多节点，更新时整组替换', async () => {
    const items = signal([1, 2]);
    const f = html`<ul>${() => items().map(i => html`<li>${i}</li>`)}</ul>`;
    document.body.appendChild(f);
    expect(document.body.querySelectorAll('li').length).toBe(2);
    items.set([3]);
    await Promise.resolve();
    const lis = [...document.body.querySelectorAll('li')];
    expect(lis.length).toBe(1);
    expect(lis[0].textContent).toBe('3');
    document.body.innerHTML = '';
  });
});

describe('k 控制流', () => {
  it('Show：when 翻转渲染/清空 kids', async () => {
    const on = signal(false);
    const f = html`<div>${Show({ when: () => on(), kids: () => html`<b>hi</b>` })}</div>`;
    document.body.appendChild(f);
    expect(document.body.querySelector('b')).toBeNull();
    on.set(true);
    await Promise.resolve();
    expect(document.body.querySelector('b')?.textContent).toBe('hi');
    on.set(false);
    await Promise.resolve();
    expect(document.body.querySelector('b')).toBeNull();
    document.body.innerHTML = '';
  });

  it('For：keyed 增删，未变项节点复用', async () => {
    const rows = signal([{ id: 1, t: 'a' }, { id: 2, t: 'b' }]);
    const f = html`<ul>${For({ each: () => rows(), key: 'id', kids: (r) => html`<li>${r.t}</li>` })}</ul>`;
    document.body.appendChild(f);
    let lis = [...document.body.querySelectorAll('li')];
    expect(lis.map(l => l.textContent).join('')).toBe('ab');
    const nodeA = lis[0];
    rows.set([{ id: 1, t: 'a' }, { id: 3, t: 'c' }]); // 删 id2 增 id3，id1 保留
    await Promise.resolve();
    lis = [...document.body.querySelectorAll('li')];
    expect(lis.map(l => l.textContent).join('')).toBe('ac');
    expect(lis[0]).toBe(nodeA); // id1 节点复用
    document.body.innerHTML = '';
  });

  it('Switch：按值切分支，def 兜底', async () => {
    const tab = signal('a');
    const f = html`<div>${Switch({
      when: () => tab(),
      cases: { a: () => html`<p>A</p>`, b: () => html`<p>B</p>` },
      def: () => html`<p>D</p>`,
    })}</div>`;
    document.body.appendChild(f);
    expect(document.body.querySelector('p').textContent).toBe('A');
    tab.set('b');
    await Promise.resolve();
    expect(document.body.querySelector('p').textContent).toBe('B');
    tab.set('zzz');
    await Promise.resolve();
    expect(document.body.querySelector('p').textContent).toBe('D');
    document.body.innerHTML = '';
  });
});

describe('k render/clean 作用域', () => {
  it('render 渲染 + 卸载清理 effect 与 clean 注册项', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    const n = signal(0);
    const cb = vi.fn();
    const un = render(() => {
      clean(cb); // 作用域内注册，卸载时统一清理
      return html`<p @click=${() => n.set(v => v + 1)}>${() => n()}</p>`;
    }, '#app');
    const p = document.querySelector('#app p');
    expect(p.textContent).toBe('0');
    p.click();
    await Promise.resolve();
    expect(p.textContent).toBe('1');
    un();
    n.set(99); // effect 已卸载，不再更新 DOM
    await Promise.resolve();
    expect(p.textContent).toBe('1');
    expect(cb).toHaveBeenCalledTimes(1);
    document.body.innerHTML = '';
  });

  it('模板缓存：相同模板二次渲染复用（结果一致）', () => {
    const a = html`<i>${'x'}</i>`;
    const b = html`<i>${'x'}</i>`;
    expect(a.querySelector('i').textContent).toBe('x');
    expect(b.querySelector('i').textContent).toBe('x');
    expect(a).not.toBe(b); // DocumentFragment 独立克隆
  });
});

describe('k 重导出响应式核心', () => {
  it('signal/computed/effect/batch 可从子库入口直接使用', async () => {
    const a = signal(1);
    const b = computed(() => a() * 2);
    expect(b()).toBe(2);
    let seen = 0;
    effect(() => { a(); seen++; });
    batch(() => { a.set(5); a.set(6); });
    await Promise.resolve();
    expect(seen).toBe(2); // 初始 1 次 + batch 合并后 1 次
    expect(b()).toBe(12);
  });
});

describe('k 模板占位符位置校验（报警器：坏位置响亮失败）', () => {
  it('属性值混合插值（带引号）：缓存 miss 时告警一次，占位符按字面量留在属性值', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const f = html`<div class="btn ${'x'}"></div>`;
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('class');
    // 行为不变（只告警不拦截）：占位符留在属性值里
    expect(f.querySelector('div').getAttribute('class')).toContain('\u0001');
    warn.mockRestore();
  });

  it('属性名位插值：告警一次，绑定被忽略', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    html`<div ${'data-x'}="v"></div>`;
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('合法绑定不告警：无引号完整值 / @ev / .prop / 子位混合文本', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = signal('a');
    html`<a href=${() => s()} @click=${() => {}} .title=${'t'}>a${1}b</a>`;
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('相同模板二次渲染走缓存，不重复告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    html`<i class="a${'b'}"></i>`;
    html`<i class="a${'b'}"></i>`;
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
