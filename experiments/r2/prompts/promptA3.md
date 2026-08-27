# af-mobile 运行时 API 速查（条件 A：现状词表 v3）

## 运行时导入（@af-mobile/ui）
- `signal(v)`：信号。读 `s()`，写 `s.set(v)`；`s.set(fn)` 传函数时 `fn(旧值)`。
- `effect(fn)`：自动依赖追踪副作用，依赖变化重跑；返回清理函数。
- `computed(fn)`：派生信号，只读。
- `batch(fn)`：合并多次 set 的通知。
- `html\`...\``：模板字符串标签，插值自动 escapeHtml，返回**字符串**（用于 innerHTML 赋值）。
- `escapeHtml(s)`：手动转义。

## DOM 操作约定（mount 惯用法）
- `mount(el)` 负责在 `el` 内创建全部所需元素：先 `el.innerHTML = html\`...\``，再 `el.querySelector('#id')` 取用
- 手动 `addEventListener` 绑定事件（勿放 effect 内）；signal + effect 驱动 `innerHTML` / `textContent` / 属性更新
- 列表渲染：`items.map(it => \`<li>...\`).join('')` 拼 HTML 字符串
- 表单：`new FormData(form)`，`form.checkValidity()` 校验
- 模板插值一律用 `html` 标签或 `escapeHtml`，禁止裸拼用户输入

## 示例（mount 惯用法）
```js
import { signal, effect, html } from '@af-mobile/ui';
export function mount(el) {
  el.innerHTML = html`<button id="add">添加</button><ul id="list"></ul>`;
  const btn = el.querySelector('#add');
  const list = el.querySelector('#list');
  const items = signal([]);
  effect(() => { list.innerHTML = items().map(it => html`<li>${it}</li>`).join(''); });
  btn.addEventListener('click', () => items.set([...items(), '条目' + (items().length + 1)]));
}
```

## 条件文本（✗ 勿模仿）
- ✗ 静态文本 + hidden/display 切换（如 `<div id="err" hidden>错误</div>`）—— 隐藏时文本仍在 textContent
- ✓ 需"隐藏时无文本"时清空文本：err.textContent = bad ? '错误' : ''
