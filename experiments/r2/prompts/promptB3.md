导入（按需）：`import { html, signal, computed, effect, batch, Show, For, Switch, render, clean } from './k-flow.js'`

html`` 返回真实 DOM。插值只在**子位**或**属性值位**（属性名位被忽略并告警）：
1. 子位 `${x}`：文本/节点/数组；传函数（signal/getter）则响应式更新
2. 事件 `@ev=${fn}`：addEventListener
3. DOM 属性 `.prop=${x}`：直赋 property
4. HTML 属性 `attr=${x}`：setAttribute；null/false 移除，true 置空
5. 双向绑定：`.value=${() => s()} @input=${e => s.set(e.target.value)}`（勿 `.value=${s}` 直绑 signal）

signal(v)：读 `s()`，写 `s.set(v)`（可传 fn(旧值)）
computed(fn)：派生只读；effect(fn)：副作用，立即执行一次，依赖变化重跑；batch(fn)：合并 set
Show({ when: fn, kids: () => html`` })：when() 真值渲染 kids
For({ each: fn, key, kids: (item) => html`` })：keyed 列表；key 为字段名，省略以项为键
Switch({ when: fn, cases: { a: () => html`` }, def })：分支，def 兜底
render(app, el)：app 为 html`` 或 () => html``；clean(fn)：注册清理

显隐范式（按场景选）：
- 视觉隐藏：`<div hidden=${() => !ok()}>提示</div>`
- 增删节点：`${Show({ when: () => !ok(), kids: () => html`<div>提示</div>` })}`
- 条件文本：`<div id="err">${() => bad() ? '错误' : ''}</div>`

词表完。全部能力 = 以上 API，无其他。
