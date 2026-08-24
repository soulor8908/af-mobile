import { JSDOM } from 'jsdom';
const dom = new JSDOM('<div id="app"></div>');
for (const k of ['document','Node','DocumentFragment']) globalThis[k] = dom.window[k];
const { html, render, signal, computed, effect, Show, For, Switch, clean } = await import('./k-flow.js');
const assert = (c, msg) => { if (!c) { console.error('FAIL:', msg); process.exit(1); } };

// 用例1：子位绑定 + 事件 + signal 响应
const n = signal(0);
const btn = html`<button @click=${() => n.set(n() + 1)}>${n}</button>`;
render(btn, '#app');
const el = document.querySelector('#app button');
assert(el.textContent === '0', '初始渲染');
el.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
assert(el.textContent === '1', '点击后 signal 更新');

// 用例2：.prop 绑定 + 派生
const name = signal('a');
const up = computed(() => name() + '!');
const input = html`<input .value=${name} class=${() => up()}>`;
document.querySelector('#app').replaceChildren(input);
const inp = document.querySelector('#app input');
assert(inp.value === 'a' && inp.className === 'a!', 'prop + attr 派生绑定');
name.set('b');
assert(inp.value === 'b' && inp.className === 'b!', 'signal 变化驱动两种绑定');

// 用例3：For keyed 复用 + 增删
const list = signal([{ id: 1, t: '一' }, { id: 2, t: '二' }]);
const ul = html`<ul>${For({ each: list, key: 'id', kids: (it) => html`<li>${it.t}</li>` })}</ul>`;
document.querySelector('#app').replaceChildren(ul);
assert(document.querySelectorAll('li').length === 2, 'For 渲染 2 行');
list.set([{ id: 2, t: '二' }, { id: 3, t: '三' }]);
assert(document.querySelectorAll('li').length === 2 && document.querySelector('li').textContent === '二', 'For keyed 增删');

// 用例4：Show 切换
const on = signal(false);
const box = html`<div>${Show({ when: on, kids: () => html`<b>hi</b>` })}tail</div>`;
document.querySelector('#app').replaceChildren(box);
assert(!document.querySelector('b') && document.querySelector('div').textContent === 'tail', 'Show 隐藏');
on.set(true);
assert(document.querySelector('b')?.textContent === 'hi', 'Show 显示');

// 用例5：Switch + render 清理
const tab = signal('a');
const app = () => html`<main>${Switch({ when: tab, cases: { a: () => html`<p>A</p>`, b: () => html`<p>B</p>` } })}</main>`;
const un = render(app, '#app');
clean(() => {});
assert(document.querySelector('p').textContent === 'A', 'Switch a');
tab.set('b');
assert(document.querySelector('p').textContent === 'B', 'Switch b');

// 用例6：多插值混排文本
const x = signal(3);
const p = html`<p>共${x}件，合计${() => x() * 10}元</p>`;
document.querySelector('#app').replaceChildren(p);
assert(document.querySelector('p').textContent === '共3件，合计30元', '文本混排插值');
x.set(4);
assert(document.querySelector('p').textContent === '共4件，合计40元', '混排响应更新');

// 用例7（v2 新增）：响应式数组子位——getter 返回数组应渲染多节点而非逗号文本
const tags = signal(['a', 'b']);
const wrap = html`<p>${() => tags()}</p>`;
document.querySelector('#app').replaceChildren(wrap);
assert(document.querySelector('p').textContent === 'ab', '响应式数组子位渲染多节点');
tags.set(['x', 'y', 'z']);
assert(document.querySelector('p').textContent === 'xyz', '数组子位响应更新');

// 用例8（v2 新增）：For 省略 key（以项本身为键）
const words = signal(['一', '二']);
const ul2 = html`<ul>${For({ each: words, kids: (w) => html`<li>${w}</li>` })}</ul>`;
document.querySelector('#app').replaceChildren(ul2);
assert([...document.querySelectorAll('li')].map(l => l.textContent).join() === '一,二', 'For 省略 key 渲染');
words.set(['二', '三']);
assert([...document.querySelectorAll('li')].map(l => l.textContent).join() === '二,三', 'For 省略 key 增删');

// 用例9（v2 新增）：Switch def 兜底
const tab2 = signal('x');
const sw2 = html`<div>${Switch({ when: tab2, cases: { a: () => html`<p>A</p>` }, def: () => html`<p>D</p>` })}</div>`;
document.querySelector('#app').replaceChildren(sw2);
assert(document.querySelector('p').textContent === 'D', 'Switch def 兜底');
tab2.set('a');
assert(document.querySelector('p').textContent === 'A', 'Switch 命中分支');

console.log('ALL 9 TESTS PASSED');
