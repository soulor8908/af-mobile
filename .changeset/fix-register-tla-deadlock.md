---
'@af-mobile/ui': patch
---

修复 P0：入口顶层 `await register(...)` 在生产分包下形成 entry ↔ chunk 循环依赖，组件永不注册、页面空白且零报错（dev 不复现）

**根因**：`register()` 走动态 `import()` 按需分包。Vite/Rollup 生产构建会把入口与组件 chunk 共用的模块（典型是入口再导出的 `escapeHtml`/`html`/`t`，组件也从 `lib/af-element.js`/`lib/i18n.js` 引入同一模块）划入**入口 chunk**，于是组件 chunk 反向静态 import 入口 chunk。此时入口顶层 `await register(...)`（TLA）让入口求值被自己 await 的 chunk 卡住，chunk 又等着入口求值完成——互等死锁，`af-switch` 这类无共用依赖的组件能注册、其余全部挂起，且控制台无任何报错。

**修复（三层）**：

1. **入口不再需要 TLA**：新增注册状态中心 `src/lib/register-state.js`，`register()` 把进行中的 promise 登记进去；router 每次渲染前 `whenReady()` 统一等待（无待办时 `hasPending()` 短路，零额外微任务，渲染时序不变）。入口推荐写法变为：

   ```js
   register('af-tabbar', 'af-dialog', 'af-toast');   // 不 await
   route('/', homePage);
   start('#app', { hash: true });                     // 首渲染前自动等待注册完成
   ```

   不使用 router 自绘时，在注入组件 property 前 `await whenReady()`。新增导出：`whenReady()`、`setRegisterTimeout(ms)`。

2. **失败可见性（看门狗）**：组件 chunk 加载超过阈值（默认 2000ms，`setRegisterTimeout(ms)` 可调、传 0 关闭）时 `console.error` 输出根因诊断与修复写法（ASCII 文案指向 `docs/incidents.md` #12），替代「静默空白零报错」。只告警不 reject，慢网下 chunk 最终到达仍会正常注册。

3. **AI 指引与脚手架同步纠偏**：`create-af-mobile` 模板、starter、`prompt/system-prompt.template.md`、`skills/af-mobile-grill` 全部去掉入口顶层 `await register(...)` 写法，并写明死锁成因（脚手架模板此前还带着一行无效的 `await register()`）。

**体积预算（用户已确认）**：total 23.0→23.3KB、coreRuntime 6.8→6.85KB——修复本质是给 router 增加「渲染前等待注册」，实测 total 23.230 / coreRuntime 6.816；两个预算在改动前分别只剩 132B / 21B 余量，纯优化无法容纳。

**顺带统一注册 API 语义**（第二次外部复用反馈「四套注册入口行为不一致」）：

- `registerChart()` 无参 = 注册全部 5 个图表（与 `registerChat()`/`registerBlocks()` 的「无参 = 全量」对齐）；`registerCharts()` 保留为等价别名
- `registerBlocks(...tags)` 改变参（旧单参写法向后兼容）
- 四个入口的未知标签错误统一为 `[@af-mobile/ui] unknown component: <tag>（可用标签：...）`（原先 `[af-mobile/chat]` / `[af-mobile/charts]` / `[af-mobile/blocks]` 各说各话）

**af-chat 可测性**：shadow 内关键节点补稳定 `data-role` 契约（`log`/`bubbles`/`chips`/`input`/`send`/`scroll-bottom`/`error`/`retry`），自动化测试不再依赖 shadow 私有缩写 class；新增公开 `send(text)` 方法（等价输入框发送，宿主/测试编程调用）。

**回归防护**：新增 `npm run register:e2e`（`scripts/check-register-e2e.mjs`）——用仓库 Vite 真实构建一个「入口 import escapeHtml + register」最小工程，经无头 Chrome 断言推荐写法全组件注册且首渲染等待、TLA 旧写法死锁复现且看门狗输出诊断。bundler 级行为 jsdom 不可见，此前该缺陷无任何门禁能拦住。单测契约见 `test/register-state.test.js`。
