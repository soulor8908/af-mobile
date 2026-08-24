# af-mobile 运行时 API 速查（条件 A：现状词表，提取自 prompt/system-prompt.md）

## 运行时导入（@af-mobile/ui）
- `signal(v)`：信号。读 `s()`，写 `s.set(v)`；`s.set(fn)` 传函数时 `fn(旧值)`。
- `effect(fn)`：自动依赖追踪副作用，依赖变化重跑；返回清理函数。
- `computed(fn)`：派生信号，只读。
- `batch(fn)`：合并多次 set 的通知。
- `html\`...\``：模板字符串标签，插值自动 escapeHtml，返回**字符串**（用于 innerHTML 赋值）。
- `escapeHtml(s)`：手动转义。
- `fetchPage(url, opts)`：分页/缓存请求。`go(path)`：路由跳转。`route(path, fn)`：注册路由。

## 信号联动（system-prompt.md 原文）
10. signal 变化自动更新组件：effect(() => { list.data = items() })
11. 路由 handler 内 fetchPage → signal.set
12. 离开路由时取消 effect：返回的 cleanup 函数在 afterEach 或 beforeEach 调用

## DOM 操作约定（现状 few-shot 惯用法，见示例 1：page-list）
- `document.getElementById()` / `querySelector` 获取元素
- 手动 `addEventListener` 绑定事件
- signal + effect 驱动 `innerHTML` / 属性更新
- 列表渲染：`items.map(it => \`<li>...\`).join('')` 拼 HTML 字符串
- 表单：`new FormData(form)`，`form.checkValidity()` 校验
- 模板插值一律用 `html` 标签或 escapeHtml，禁止裸拼用户输入

## 示例（现状惯用法，摘自 system-prompt.md 示例 1）
```js
import { signal, effect, fetchPage } from '@af-mobile/ui';
const list = document.getElementById('list');
const items = signal([]);
effect(() => { list.data = items(); });
list.addEventListener('af-list:refresh', async () => {
  items.set(await fetchPage('/api/messages'));
  list.endRefresh();
});
items.set(await fetchPage('/api/messages'));
```
