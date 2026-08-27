# @af-mobile/ui/k —— 声明式应用层（演进中）

> 定位：从可选渲染层演进为应用层（独立入口，不进主包 index.js）。
> 状态：**推广中**（见仓库 docs/DECISIONS.md D-001）——渲染核心（html\`\` + 控制流 + state）已定版；
> 应用能力（res / route 入口重导出、k 层 lint）按闭环计划分阶段补齐。

## 与主包 `html\`\`` 的区别（勿混用）

| | 主包 `html\`\``（`@af-mobile/ui`） | k 的 `html\`\``（`@af-mobile/ui/k`） |
|---|---|---|
| 返回 | 转义**字符串**，配 innerHTML | 真实 **DOM**（DocumentFragment） |
| 插值 | 自动转义（XSS 安全） | 不进 HTML 解析（无 XSS 面），值原样插入 |
| 响应式 | 无（一次性渲染） | signal getter 细粒度更新 |

从错误路径 import **不会报错**：主包 html 返回字符串，`el.append(str)` 合法但渲染出字面量文本。认准 `@af-mobile/ui/k`。

## 词表卡（全部能力 = 以下 API，无其他）

导入：`import { html, signal, computed, effect, batch, Show, For, Switch, render, clean } from '@af-mobile/ui/k'`

`html\`\`` 返回真实 DOM。四种绑定：

1. 子位 `${x}`：文本/节点/数组；传函数（signal/getter）则响应式更新，返回数组渲染多节点
2. 事件 `@ev=${fn}`：addEventListener
3. DOM 属性 `.prop=${x}`：直赋 property（input.value / list.data 等）
4. HTML 属性 `attr=${x}`：setAttribute；null/false 移除，true 置空

```js
import { html, signal, render } from '@af-mobile/ui/k';
const n = signal(0);
const un = render(html`<p @click=${() => n.set(v => v + 1)}>${() => n()}</p>`, '#app');
un(); // 卸载并清理全部副作用
```

- `signal(v)`：读 `s()`，写 `s.set(v)`（可传 fn(旧值)）；set 后 DOM 同步更新
- `computed(fn)`：派生，只读；`effect(fn)`：副作用，创建即执行一次，依赖变化重跑；`batch(fn)`：合并多次 set 只触发一次更新
- `Show({ when: fn, kids: () => html\`\` })`：when() 真值时渲染 kids
- `For({ each: fn, key, kids: (item) => html\`\` })`：keyed 列表
- `Switch({ when: fn, cases: { a: () => html\`\` }, def: () => html\`\` })`：分支，def 兜底
- `render(app, el)`：app 为 html\`\` 或 () => html\`\`，渲染进 el（可为选择器），返回 unmount
- `clean(fn)`：注册清理

Show/For/Switch 返回节点，可直接放 `${}` 子位。

**For 的 key 边界**：key 为字段名字符串，省略则以项本身为键——对象项省略 key 时**以引用为键，引用变则整行重建**；需要稳定复用请显式传 `key: 'id'`。

## 双向绑定（组合范式）

无独立 `bind` 语法，用 `.prop` + `@ev` 组合：

```js
const name = signal('');
html`<input .value=${() => name()} @input=${e => name.set(e.target.value)} />`
```

## 占位符禁区（触发 console.warn）

- 属性名位插值：`<div ${name}="v">` —— 绑定被整体忽略
- 带引号混合值：`class="btn ${x}"` / `class="${x} btn"` —— 占位符留字面量或静态部分丢失

合法形态只有：`attr=${x}`（无引号完整值）、`@ev=${fn}`、`.prop=${x}`、子位 `${x}`。

## 常见框架幻觉（这些写法不存在）

`on:click` / `class:` / `use:`（Solid）、`.value`（Vue ref）、`createSignal` / `createEffect`（Solid）。k 的 signal 读 `s()` 写 `s.set(v)`。
