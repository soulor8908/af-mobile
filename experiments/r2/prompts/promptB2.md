# k 词表卡 v3（10 词 + 显隐反例）

运行时导入（按需取用）：`import { html, signal, computed, effect, batch, Show, For, Switch, render, clean } from './k-flow.js'`

html`` 返回真实 DOM（DocumentFragment）。四种绑定——插值只允许出现在**子位**或**属性值位**；属性名位/标签名内插值会被忽略（元素保持原样）：
1. 子位 `${x}`：文本/节点/数组；传函数（signal/getter）则响应式更新，返回数组渲染多节点
2. 事件 `@ev=${fn}`：addEventListener
3. DOM 属性 `.prop=${x}`：直赋 property（input.value / list.data 等）
4. HTML 属性 `attr=${x}`：setAttribute；null/false 移除，true 置空

signal(v)：读 `s()`，写 `s.set(v)`（可传 fn(旧值)）。set 后 DOM 同步更新
computed(fn)：派生，只读
effect(fn)：副作用，创建时立即执行一次，依赖变化重跑
batch(fn)：合并多次 set，只触发一次更新

Show({ when: fn, kids: () => html`` })：when() 真值时渲染 kids
For({ each: fn, key, kids: (item) => html`` })：keyed 列表；key 为字段名字符串，省略则以项本身为键
Switch({ when: fn, cases: { a: () => html`` }, def: () => html`` })：分支，def 兜底（也是函数）

Show/For/Switch 返回节点，可直接放 ${} 子位。

render(app, el)：app 为 html`` 或 () => html``，渲染进 el（el 可为选择器）
clean(fn)：注册清理

## 条件显隐（✗ 勿模仿）
- ✗ `<div id="x" ${() => ok() ? 'hidden' : ''}>提示</div>` —— 属性名位插值被忽略，元素恒可见
- ✓ ${Show({ when: () => !ok(), kids: () => html`<div>提示</div>` })} —— 条件增删节点
- 需"隐藏时无文本"（如错误提示）：用 Show 或条件文本 ${() => bad() ? '错误' : ''}；hidden=${fn} 仅视觉隐藏，文本仍留 DOM

词表完。全部能力 = 以上 API，无其他。
