# 框架优化 backlog（来自 ai-todo-app 消费端评审）

> 来源：下游消费端 `ai-todo-app`（@af-mobile/ui 1.9.1）的评审。
> 这些缺口不是该 demo 的 bug，而是框架层缺陷——下游每个项目都会重演一遍，
> 所以价值大于对 demo 本身的修补。每条都给了框架侧的确切证据（file:line）。
> 整理日期：2026-09-01。

优先级说明：P0=几乎所有消费端都会踩、且静态检查发现不了；P1=踩中代价高但不普遍；P2=整洁度/体验。

---

## OPT-1 · 缺 layout / 嵌套路由  ⚠️ P0

**问题**：4 个页面各写一遍 `app-shell` + `navbar` + `tabbar`，`activeIndex` 硬编码 `0/1/2/3`。
数字只能靠人肉和 tab 顺序一致，"能跑但随时会错"。

**证据**：`ai-todo-app/src/pages/today.js:245` `${tabbarHTML(0)}`、`:202` `tabbarHTML(2)` 等，
`activeIndex` 由页面手填；`src/layout.js` 的 `tabbarHTML(idx)` 只是字符串拼装。

**建议**：新增 `route(path, page, { layout })`；tabbar 的 active 由**当前路径自动推导**，
不再暴露 `activeIndex` 参数给页面。layout 内可统一渲染 navbar + tabbar。

**价值**：消灭一类"配置错就静默错"的 bug；页面模板平均减 ~15 行。

---

## OPT-2 · 缺表单对话框组件  ⚠️ P0

**问题**：新增/编辑表单（字段 + 校验 + 错误提示）被手写两遍（today/todos 各约 60 行），
且只靠 `af-field` 拼装。框架已经有 `defineTool` 的 JSON Schema（`properties/required/enum`）——
schema → 表单是伸手就能拿的能力，现在没拿。

**证据**：`ai-todo-app/src/pages/todos.js:202-234` 手写的 `af-dialog` + `af-field` 表单；
`ai-todo-app/src/ai.js:16-24` 的 `create_todo` 工具早已声明同结构 Schema。

**建议**：新增 `af-form-dialog`，接收 `schema`（直接复用 `defineTool` 的 `parameters`）+ `onSubmit`，
内部渲染字段、做 `required`/类型校验、显示错误。消费端 1 行调用替代 ~60 行。

**价值**：表单是移动端最高频交互，统一后校验/无障碍/样式一并收敛。

---

## OPT-3 · 有 `:bind` 属性绑定，却无事件绑定  ⚠️ P0

**问题**：`src/lib/bind.js` 实现了 `:attr="state.x"`，但事件必须手写 `addEventListener`。
ai-todo-app 4 个页面共约 20 处 `querySelector(...).addEventListener`，全在 `innerHTML` 之后手工挂。

**证据**：框架 `src/lib/bind.js`（`export function bind` 只处理属性/文本/列表，无事件分支）；
`ai-todo-app/src/pages/today.js:285` 等手写 `addEventListener`。

**建议**：补 `@click="actions.x"` 或 `data-action="x"` 的声明式事件绑定，由同一 bind 机制在渲染后统一挂接。

**价值**：消除"渲染后忘挂事件"类 bug；页面逻辑可读性大幅提升。

---

## OPT-4 · `register()` 的 LAZY 静态表导致产物膨胀  ⚠️ P1

**问题**：`src/index.js` 的 LAZY 有 30 条 `import()`，Vite 静态分析后全部打 chunk。
ai-todo-app 只 `register` 10 个组件，`dist/assets` 仍输出 **32 个文件（30 个未用 chunk）**。
运行时不下载，但产物体积、上传耗时、CDN 缓存条目 ×3。

**证据**：`aiflow-ui/src/index.js` LAZY 表 30 条 `import()`；`ai-todo-app/dist/assets` 32 文件（构建实测）。

**建议**：拆出可 tree-shake 的显式入口，或提供 build 插件按实际 `register()` 调用裁剪 LAZY 表。

**价值**：消费端部署包体积与 CDN 失效面直接下降。

**落地（2026-09-01）**：`@af-mobile/ui/vite` 的 `afMobileTrimLazy()` 已实施（`test/vite-plugin.test.js`）；D-022 补齐最后一环——`create-app.mjs` 脚手架 vite.config 模板接线，新项目开箱即生效。

---

## OPT-5 · 穿透选择器零约束，组件无官方扩展点  ⚠️ P0

**问题**：消费端可写 `.hero-grad af-progress .progress` 依赖内部 class（框架既不禁止、也不承诺稳定）；
`af-dialog [data-role="panel"]` 因 Shadow DOM 完全失效却不报错。这类错误 lint 与构建都发现不了。

**证据**：`ai-todo-app/src/styles.css`（原 `:380`）写 `af-dialog [data-role="panel"]`，
而 `aiflow-ui/src/components/af-dialog.js:57` 是 Shadow DOM 且**内部无 `data-role="panel"`** → 纯死代码。

**建议**：三件套——
1. 新增 ESLint 规则，禁止消费端样式/JS 穿透 `af-*` 内部节点；
2. 组件改用 `::part()` 或 CSS 自定义属性暴露官方扩展点；
3. 文档明确标注每个组件是 Light / Shadow（评审时是 grep `attachShadow` 确认的）。

**价值**：把"写了也不生效"的静默错误变成编译期错误。

---

## OPT-6 · `.seg` 官方示例自身 a11y 不合规  ⚠️ P1

**问题**：`src/recipes.css:911-917` 的 `.seg > .seg-it[aria-selected]` **没有 `role="tablist"` / `role="tab"`**。
下游照抄后 `aria-selected` 实际无效，但源头在框架——会教坏所有下游。

**证据**：`aiflow-ui/src/recipes.css:911-917`；`ai-todo-app/src/todo-form.js:15-19` 照抄（含 `aria-selected` 但无 tablist role）。

**建议**：官方示例补 `role="tablist"` / `role="tab"` + 键盘方向键导航；或提供更合规的 `af-seg` 组件。

**价值**：框架示例是下游的"事实文档"，源头合规才能避免成批 a11y 缺陷。

---

## OPT-7 · `@af-mobile/ui/test` 已存在，脚手架却没配  ⚠️ P1

**问题**：`create-app.mjs` 生成的工程没有 `setupFiles`，下游必然手写桩。
ai-todo-app 手写了 114 行（matchMedia/dialog/popover/IO/RO/scrollTo/Touch…）。

**证据**：`aiflow-ui/src/index.js` exports 有 `./test`（`test-setup.js` 覆盖上述全部 API + rAF）；
`aiflow-ui/create-af-mobile/` 或 `starter/` 的 `eslint.config.js` / vite 配置未引用它；
`ai-todo-app/test/setup.js` 原 114 行手写桩（已在本轮评审中精简为 1 行 import）。

**建议**：脚手架模板直接注入 `vitest.setupFiles` 指向 `@af-mobile/ui/test`，并带最小全局清理。

**价值**：新项目测试零门槛，且桩与框架版本自动同步。

---

## OPT-8 · 缺日期工具  ⚠️ P1

**问题**：消费端在 `store.js` 和 `ai.js` 各写一份 `fmtDate`，结果出现 UTC/本地时区不一致 bug
（逾期判断在 UTC+8 每天前 8 小时是错的）。

**证据**：`ai-todo-app/src/store.js:22` `todayISO()`（本轮修复新增）、
原 `src/pages/todos.js:170` 用 `new Date().toISOString().slice(0,10)`（UTC）造成时区 bug。

**建议**：框架层导出 `todayISO()` / `formatDate(date, fmt)`，从源头消灭口径不一致。

**价值**：时区类 bug 是移动端高发且隐蔽的一类，框架统一提供可彻底规避。

---

## OPT-9 · CSS 只能全量引入，无按需能力  ⚠️ P1

**问题**：JS 侧早已按需（`register()` 只加载用到的组件），CSS 侧却只有 `@af-mobile/ui/css`
一个全量入口（L1 tokens + L2 recipes + atomic 的 `@import` 聚合，无 Tree Shaking）。
消费端用 10 个组件和用 41 个组件，付的 CSS 完全一样——「按需」叙事里唯一的破口。

**证据**：全量 CSS gzip 8.32KB（esbuild minify + zlib L9，与 size-check 同口径）；
其中 recipes 6.32KB(76%) / tokens 1.50KB(18%) / atomic 0.99KB(12%)。

**建议**：构建期按消费端实际用到的 class 裁剪 L1+L2，做成 Vite 插件与 `afMobileTrimLazy` 并列。

**落地**（2026-09-07，`src/vite.js` 的 `afMobileShakeCss()` + `src/css-shake.js`）：

| 项 | 说明 |
|---|---|
| 实测收益 | ai-todo 8.32→4.36KB（**-47.6%**）、starter 8.32→3.87KB（-53.5%）、demo/components -50.2% |
| 真源 | `src/css-shake.js`（零依赖，随包发布）；`scripts/css-tree-shake.mjs` 退化为 CLI 薄壳，两者同一套裁剪语义 |
| postcss 来源 | 由 **Vite 自身的 CSS 管道提供**（插件只往 `css.postcss.plugins` 塞插件对象），包不新增运行时依赖 |
| 仅 build | `apply: 'build'`；dev 下 CSS 的 postcss 只跑一次，裁剪后新增 class 不重跑 → 会「样式莫名消失」 |
| 保底一 | 扫描不到任何 class 时不裁剪（否则等于把样式全删光），并 console.warn |
| 保底二 | 只处理本包 `src/` 下的 CSS，绝不碰消费端自有 CSS |
| 保底三 | `css.postcss` 若为配置文件路径则不注入，避免静默覆盖用户既有 postcss 链路 |
| 动态 class | 静态 `class="..."` 扫描抓不到 `class="a ${x ? 'b' : ''}"` 里的 `b` → 用「源码引号字符串字面量 ∩ CSS 里出现过的 class」做 safelist 兜底；代价不对称（误报多留几十字节 vs 漏报样式静默失效），故宁可保守。实测加固成本 +0.01~0.58KB |

逃生舱：`afMobileShakeCss({ safelist: ['rate'] })` 强制保留；`{ enabled: false }` 整体关闭；
`{ include: '/linked/pkg/' }` 自定义命中路径特征（混合 symlink 解析时的兜底）；`{ verbose: true }`
打印统计，且整轮没命中任何 CSS 时告警（把「静默不生效」变成可见）。

回归：`npm run css:e2e`（真实 vite build 比对开关插件的产物 CSS，实测 -54.2%）+
`test/vite-css-shake.test.js`（11 条，含「救回三元里的 class」「不碰消费端 CSS」）。

**放弃了什么**：① 不裁 tokens（`:root` 变量是设计系统根基，收益 1.5KB 不值得引入风险）；
② 不做 tag 维度裁剪（`af-xxx [data-role]` 规则按组件归属可再省约 0.95KB），需改
`shouldKeepSelector` 语义，误判会静默破样式，留待有人真喊 CSS 大时再做；
③ 不支持 dev 裁剪（见上）。

---

## 推进建议

| 优先级 | 条目 | 工作量 | 影响面 |
|---|---|---|---|
| 先上 | OPT-1 / OPT-3 | 中 | 每个新页面都受益 |
| 先上 | OPT-5 / OPT-6 | 小 | 防呆 + 无障碍合规 |
| 跟组件节奏 | OPT-2 / OPT-8 | 中 | 高频交互收敛 |
| 构建期 | OPT-4 / OPT-7 / **OPT-9** | 小-中 | 部署体积 + 测试体验 |

---

## 落地记录（2026-09-01，8/8 完成）

| 条目 | 落地 | 实测/说明 |
|---|---|---|
| OPT-1 | `withLayout({ title, tabbar }, handler)`（src/lib/layout.js） | navbar/tabbar 一遍渲染，active 按当前路径自动推导（精确>前缀），点击委托导航 + 方向键导航；独立预算 0.860/0.9KB |
| OPT-2 | `openFormDialog({ title, schema, onSubmit })`（src/lib/form-dialog.js），**无组件方案** | 复用 af-dialog+af-field；schema 与 defineTool parameters 同构；required/number 校验、enum 下拉、textarea/password；实测 1.158KB（重组件方案预估 1.5~2KB，性价比 3 倍） |
| OPT-3 | bind.js 补 `@click="actions.x"` | 处理器取自 createPage actions（batch 包装）；告警 DEV 门控（生产 tree-shake）；coreRuntime 6.911KB |
| OPT-4 | `@af-mobile/ui/vite` 的 `afMobileTrimLazy()` | 扫描 register() 字面量调用裁剪 LAZY 表；**真实 vite build 实测 35 chunk → 4 chunk**；动态注册自动全量保底 |
| OPT-5 | ESLint 第 25 条规则 `no-af-pierce`（error）+ 下方 Light/Shadow 标注 | 修复指引：Shadow 用 `::part()`（af-dialog 已暴露 dialog/header/close/content/footer），Light 用白名单 class |
| OPT-6 | recipes.css `.seg` 示例补 `role="tablist"/"tab"` | aria-selected 必须配显式 role；键盘导航指引改用 `<af-tabs>` |
| OPT-7 | starter 接入 vitest + `setupFiles: ['./test/setup.js']` | create-app.mjs 脚手架在评审时（1.9.1 生成物）已具备该链路，本轮仅对齐 starter |
| OPT-8 | `todayISO()` / `formatDate()`（src/lib/date.js） | `'YYYY-MM-DD'` 一律按本地时区解析（new Date(str) 是 UTC，UTC+8 前 8 小时逾期判断出错的根因） |
| OPT-9 | `@af-mobile/ui/vite` 的 `afMobileShakeCss()`（src/css-shake.js 为真源） | 构建期按实际用到的 class 裁剪 L1+L2 CSS；**真实 vite build 实测 -54.2%**、gzip 口径 -47.6%；三条保底 + safelist 兜底动态 class；回归 `npm run css:e2e`。2026-09-07 落地，见上 OPT-9 章节 |

预算变更（均已用户确认）：coreRuntime 6.85→6.95（@event 净增）、total 23.3→23.4（index.js 三条 re-export 导出面 +88B）；新增独立条目 layout 0.9 / date 0.4 / formDialog 1.2（tree-shaking 不用不付费）。

### 组件 Light / Shadow 一览（OPT-5 第 3 件套）

**Shadow DOM**（内部不可达，定制走 `::part()` / CSS 变量；穿透选择器为死代码）：
`af-dialog`（part: dialog/header/close/content/footer）、`af-picker`、`af-cascade-picker`（继承 picker）、`af-calendar`、`af-swiper`、`af-number-keyboard`、`af-password-input`

**Light DOM**（可看到内部节点，但内部 class/结构是实现细节、无稳定性承诺，穿透依赖升级即碎；定制走白名单 class 组合与 CSS 变量）：
`af-list`、`af-tabs`、`af-toast`、`af-action-sheet`、`af-dropdown`、`af-img`、`af-backtop`、`af-badge`、`af-switch`、`af-search-bar`、`af-skeleton-page`、`af-upload`、`af-navbar`、`af-tabbar`、`af-stepper`、`af-field`、`af-pull-refresh`、`af-swipe-cell`、`af-rate`、`af-notice-bar`、`af-progress`、`af-steps`、`af-countdown`、`af-data`（L3.5 数据源，非注册组件）

