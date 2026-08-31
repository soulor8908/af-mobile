# Changelog

## 1.9.1

### Patch Changes

- 80a453b: fix: lint-flywheel 跨项目 lint 误报 + Prompt 边界规则补强（消费端审计反推）
  
  **1. lint-flywheel 按项目上下文分组 lint**：外部项目的 JS/MJS 向上查找最近的
  `eslint.config.js`，套用该项目自身 flat config（extraClass 登记生效）；找不到 config
  回落基准 config（保留对任意裸文件的通用 lint 能力）；HTML 仍走片段抽取。修复「在库开发态
  lint 消费端文件时，消费端已登记的 extraClass 被仓库 config 误报」——实测对消费端项目
  5 error → 0 error，发布态/开发态行为统一。
  
  **2. Prompt 边界规则**（消费端 AI 待办项目实测暴露的两个生成质量问题）：
  
  - 禁令 25→26：新增禁令 26「禁止 API Key/密钥等敏感凭据硬编码进源码」
  - 数据契约节补边界说明：同一数据只用一条更新通道（`:bind` 响应式绑定优先，
    手动 `textContent` 仅限一次性静态位），避免混用产生漏更新/竞态
  - 列表数据节补提醒：innerHTML 重渲染后旧元素监听失效，必须重绑或对持久容器用事件委托
  
  **3. 教材与脚手架收尾**（外部 review 6 项评估，详见 docs/DECISIONS.md D-020）：
  
  - `demo/apps/ai-todo/app.js`（官方教科书入口）去掉顶层 `await register(...)` TLA 写法，
    对齐 02cfca2 register-state 修复后的官方推荐（入口禁 TLA，router 渲染前自动等待）
  - 脚手架 docs 页新增「密钥与凭据」警告：禁止硬编码、运行时输入、仅存本地（呼应禁令 26）
- 02cfca2: 修复 P0：入口顶层 `await register(...)` 在生产分包下形成 entry ↔ chunk 循环依赖，组件永不注册、页面空白且零报错（dev 不复现）
  
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

## 1.9.0

### Minor Changes

- 57267a1: 新增 `.app-shell` 三段式 App 骨架（Issue 2，P0）
  
  此前库内只有 `.page`（内容随 body 滚动，做不了固定底栏）。新增 `.app-shell` 补齐整屏外壳：
  `100dvh` 纵向 flex + `max-width: 640px` 居中，配合既有的 `.page-col.scroll-y` 得到
  「顶栏不动 + 内容区独立滚动 + 底栏贴视口底部」。
  
  ```html
  <div class="app-shell">
    <header class="navbar"><h1 class="title">标题</h1></header>
    <main class="page-col scroll-y p-4"><!-- 内容 --></main>
    <af-tabbar></af-tabbar>
  </div>
  ```
  
  脚手架生成的页面默认改用该骨架，并新增「App 骨架」指引卡片。详见文档站「快速开始 · App 骨架」。
- 57267a1: 注册 API 统一为变参 + DEV 漏注册告警（Issue 3，P1）
  
  **统一语义**：`registerChart(...tags)` 与 `registerChat(...tags)` 改为变参，与主库 `register(...tags)` 一致；
  `registerChart('a','b')` 一次注册多个，`registerChat()` 无参仍默认注册 `af-chat`。单参旧调用向后兼容，既有代码无需改动。
  
  **不再静默失败**：开发态（`import.meta.env.DEV`）下，路由每次渲染后扫描 outlet，对
  「页面已使用但未注册」的 `af-*` 标签打印：
  
  ```
  [@af-mobile/ui] <af-switch> 已使用但未注册：不会渲染且无报错，请在入口 register('af-switch')
  ```
  
  门控在调用点，生产构建 `import.meta.env.DEV` 恒为 `false`，告警代码被整体 tree-shake —— 产物零成本
  （实测 `console.warn` 与 `"af-"` 检查均从产物中消失）。
- 57267a1: 新增 `@af-mobile/ui/test` 测试环境预设（Issue 4，P1）
  
  一个 import 注入 jsdom 缺失的全部浏览器 API 桩，不用每个项目手抄一遍：
  
  ```js
  // test/setup.js
  import '@af-mobile/ui/test';
  ```
  
  覆盖：matchMedia / `<dialog>` showModal·close / popover API + ToggleEvent / IntersectionObserver
  （带 `trigger()` 供主动触发）/ ResizeObserver / requestAnimationFrame / slot assignedElements /
  `URL.createObjectURL` / TouchEvent·Touch。
  
  脚手架生成的 `test/setup.js` 现在就是这一行 + 用例间清理；仓库自身的测试环境也改为复用同一份预设，
  避免「脚手架模板 / 库内预设 / 仓库自用」三份桩各自漂移。
  
  > 非脚手架项目：把上面那行放进你的 setup 文件，并在 vite.config.js 配
  > `test: { environment: 'jsdom', globals: true, setupFiles: ['./test/setup.js'] }`。

### Patch Changes

- 4afba87: chat 子库 index.d.ts 补契约 JSDoc：requestFn（标准 Response + OpenAI SSE）、createSession 管线、parseSSE、ContentBlock 与 OpenAI 格式映射——悬停即可见，不必读 session.js 源码
- e9e9ec9: deploy 新增 IGA provider（D-016）：`af-mobile deploy --provider iga`（首次指定后持久化到 .af-mobile/deploy.json），doctor 增加 iga CLI/登录态检查、国内引导与 env 提示差异化；supabase target 可落 IGA Pages，Workers 全栈仍仅 Cloudflare
- 57267a1: 脚手架默认引入 `src/styles.css`（Issue 1，P0）
  
  `create-app.mjs` 生成的 `src/main.js` 只 `import '@af-mobile/ui/css'`，没有引入同模板生成的 `src/styles.css`
  ——自定义样式**完全不生效且无任何报错**，排查成本极高。现在模板默认带 `import './styles.css';`
  （排在库 CSS 之后以便覆盖），并加注释标明「默认已引入，勿删」。
  
  > `starter/src/main.js` 一直有这行，只有 `create-app` 模板漏了。
- 57267a1: chat 子库补「接真实 LLM」最小示例（Issue 5，P2）
  
  此前 `requestFn(url, init)` 的返回格式与消息转换规则只能靠读 `session.js` 源码搞清楚。
  文档站 af-chat 页新增「接真实 LLM（`requestFn` 契约）」段：
  
  - 请求体结构（`messages` / `stream` / `tools`，含 assistant 的 `tool_calls` 与 `tool` 结果回传格式）
  - 返回值必须是标准 `Response`（内部对 `res.body` 调 `getReader()` 解析 SSE）
  - 示例 1：纯文本对话接 OpenAI 兼容 endpoint（注入 Authorization + model 的正确姿势）
  - 示例 2：工具调用（`name` / `arguments` 跨帧分片的 SSE 实例 + 说明工具循环已内置，`requestFn` 无需分支）
- 57267a1: hash 路由补 `hashchange` 监听（Issue 6，P3）
  
  hash 模式下手动修改地址栏属于同文档片段导航，**只触发 `hashchange`、不触发 `popstate`**，
  此前路由完全无反应（程序内 `go()` 走 `pushState` 则正常）。
  
  现在 popstate / hashchange 共用同一个处理器，并在处理器内用当前路由 path 去重 ——
  前进/后退时两个事件都会触发，不去重会导致同一次导航渲染两次。
- 05253e8: 脚手架子路径部署适配：vite base './' + manifest start_url './' + index.html 配件相对引用（外部实战反馈：子路径部署 PWA 配件全 404）

## 1.8.0

### Minor Changes

- 535433c: 新增 `@af-mobile/ui/blocks` 子路径与 `registerBlocks()` 入口：子库 L3.5 Block 扩至 5 个（新增 `af-product-grid` / `af-order-list` / `af-auth-form`，加上既有 `af-product-card` / `af-setting-group`）。
  
  - 列表型 Block 共享 `list-block.js` 基座：五态（idle/loading/error/empty/success）+ 键盘导航 + 点击委托；
  - wc-block-* 四条规则（states / props-count / no-internal-ref / variant-enum）启用到 `src/blocks/af-*.js`；
  - 默认 System Prompt 仍不含 Block（冻结原状）；Block 表经 `buildPrompt({ blocks: true })` 按需注入，仅 `node eval/ab.mjs` A/B 对照实验处理组使用。
- 00e541a: chat 子库富内容升级（D-013，局部推翻 D-012）：af-chat 对标成熟对话产品补齐 5 项基础能力。
  
  - **markdown 安全子集渲染**：新增 `src/chat/lib/md.js`（escape-first，全文先转义再标注）——h1-h3 / ul/ol / 围栏代码 / 粗斜体 / 行内码 / http(s) 链接；代码块自带复制按钮（`content:attr(aria-label)` 零文本节点）。`javascript:` 链接与 img/script 生成路径被拒绝
  - **消息操作**：`session.regenerate()`（末轮重跑，残片清理语义同 retry）/ `session.resend(id, text)`（编辑重发）；气泡操作行支持复制全文（markdown 原文）与重新生成。副作用工具须 confirm 卡片前置（重复执行风险闸门）
  - **思考展示**：`delta.reasoning_content`（DeepSeek-R1 / o1 类）聚合为 `think` 内容块，UI 原生 `<details>` 折叠（流式无正文=「思考中…」）；think 不回传 API
  - **输入区**：绑定模式忙碌排队（流式中 Enter/发送入队，回空闲自动消化，`af-chat:queued` 事件）；`af-chat:draft` 草稿事件
  - **多会话**（D-014，无组件方案）：`createSessions()`（创建/删除/切换 + localStorage 防抖落盘 + 恢复）/ `sessionsHTML()` / `bindSessions(el, store, target?)`（含 af-chat 自动换绑）；列表复用 L2 白名单 class，弹层交给原生 Popover API；新预算线 chatSessions ≤ 0.9KB（实测 0.883KB，tree-shaking 不用不付费）
  - **预算**：chatUI 3.3→4.6KB（实测 4.514KB），chatRuntime 2.5KB 不变（实测 ~2.22KB）；主库 23KB 红线零影响
  
  设计文档：docs/design/af-chat-rich-features-design.md
- c5c3130: 新增 `af-mobile doctor` 与 `af-mobile deploy`（交付链 P1）：AI 生成代码之后到「手机浏览器可访问」之间的命令补位。
  
  - `doctor`：只读自检 —— 构建产物、P0 配件（manifest + 3 图标 + favicon，且 index.html 已引用）、密钥 `VITE_` 前缀红线、部署端环境变量提示、target 专属检查（Supabase 环境变量 / wrangler.toml 含 D1 binding）、线上可达（`--url`）
  - `deploy`：前置检查全绿才执行，Cloudflare provider 已实现（Pages 静态托管 / Workers 全栈）；`self-hosted` 与 `cn` 按 D-010 留接口并明确报未实现
  - 两个正交维度：`target`（后端形态 supabase / cloudflare）与 `provider`（部署落点 cloudflare / self-hosted / cn），组合非笛卡尔积 —— Workers 全栈不可脱离 Cloudflare
  - 网络与命令执行均可注入（`opts.fetch` / `opts.run`），便于测试与 mock
- 81ec650: `@af-mobile/ui/k` 入口升级为应用层（DECISIONS.md D-001=B）：新增 `createResource`（res）与路由全套原语（`route`/`go`/`back`/`forward`/`beforeEach`/`afterEach`/`notFound`/`current`/`start`/`RouterError`）重导出——用 k 写应用不再需要回主包取数与路由 API。
  
  - 词表卡定版于 `src/k/README.md`（含双 `html\`\`` 同名不同义警示、双向绑定组合范式、占位符禁区）；
  - k 独立体积预算不变（≤2KB gzip，共享运行时模块 external 计量）；
  - k 层占位符报警器（patch，同版本合入）：属性名位 / 带引号混合值插值静默失败改为 console.warn。

### Patch Changes

- dee4343: `@af-mobile/ui/k` 模板占位符位置校验：属性名位插值（`<div ${name}="v">`）与带引号混合值插值（`class="btn ${x}"`）此前静默丢失绑定，现于模板首次解析时 console.warn 一次（模板缓存级去重）。仅告警，不改变绑定行为。
- 9e5fb9a: 脚手架补齐 PWA 配件（G1 消费端交付链 P0）：`create` 生成的工程开箱含 manifest.webmanifest、三张占位图标（192/512/maskable-512）与 favicon.ico，index.html 增加 theme-color / description / og 分享 meta；新增 `--desc` / `--theme` 参数控制插值。图标随包分发于 `assets/icons/`，配套 `npm run scaffold:check` 验证闸门。

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 约定，版本号遵循语义化版本（SemVer）。

> 早期版本（v1.0.0 ~ v1.3.x）未维护本文件，变更记录自 v1.4.0 起。

## [Unreleased]

### Added
- **chat 多会话**（D-014，无组件方案）：`src/chat/sessions.js` 单文件三合一——`createSessions()`（创建/删除/切换 + localStorage 防抖 300ms 落盘 + 恢复）、`sessionsHTML()`（全 L2 白名单 class 列表，active 走 aria-current）、`bindSessions(el, store, target?)`（渲染 + 委托 + af-chat 自动换绑）；弹层交给原生 Popover API。新预算线 chatSessions ≤ 0.9KB（实测 0.883KB，tree-shaking 不用不付费）
- **chat 富内容升级**（D-013，局部推翻 D-012 的 markdown/regenerate 禁令）：`src/chat/lib/md.js` 安全子集渲染（escape-first：h1-h3/ul/ol/围栏代码/粗斜体/行内码/http(s) 链接）+ 代码块复制；`session.regenerate()/resend()` 与气泡操作行（复制全文/重新生成）；`delta.reasoning_content` → `think` 块 + 原生 `<details>` 思考折叠（不回传 API）；绑定模式忙碌排队（`af-chat:queued`）+ `af-chat:draft` 草稿事件。chatUI 预算 3.3→4.6KB（实测 4.514KB），chatRuntime 不变（实测 2.157KB）；主库 23KB 红线零影响（设计文档 docs/design/af-chat-rich-features-design.md）
- **i18n 治理闸门**：`scripts/check-i18n.mjs` 静态扫描组件/blocks 的字典定义（messages 对象与 addMessages 两种形态）与引用，校验 key 已注册且 zh-CN ↔ en-US 对齐；npm script `i18n:check` + CI Step 1f（11 单测）

### Changed
- **监听器注册表防膨胀**：`AfElement._listen` 新增已挂载期死条目惰性回收与 `(target, type, handler, capture)` 去重，innerHTML 重渲染不再使登记表膨胀；`escapeHtml`/`html` 拆分至 `lib/html.js`（基类一行再导出，全部 import 路径兼容），基类 gzip 回落 1.969KB ≤ 2KB 预算
- **blocks 五态渲染收敛**：新增 `list-block.js` 的 `withBlockList(Base, tag)` 工厂统一 loading/error(重试)/empty/success 骨架与列表键盘导航，af-product-card / af-setting-group 改为差异化渲染，净删约 150 行
- **escapeHtml 转义结果缓存**：有界 Map（256 条满即清空、超 512 字符不入缓存防内存膨胀），html 模板插值与手动 esc() 共用单一咽喉点；列表重渲染热路径实测约 16x 加速（200 标签 ×51 轮基准），新增缓存命中/互不污染行为测试 ×2

## [1.7.0] - 2026-08-26

> **1.6.x 至 1.7.0 首次实际 npm 发布**（2026-08-28 已推送 registry，npm latest = 1.7.0）。本条目汇总自 v1.5.2 以来的累积变更：v1.5.3 懒加载注册 + v1.6.0 k 渲染层子库 + 本次 v1.7.0 视觉改进。

### Added（本次新增）

- **视觉改进 P0/P1**（v1.6.1 规则化落地，详见 `.workbuddy/原型样式诊断/改进方案.md`）：
  - 白名单 188 → 228 class（新增 25 原子 + 15 配方），三源同步通过
  - CSS 体积预算 6.0 → 7.0KB（用户确认，实测 6.516KB）；全量 JS 预算 23KB 不变
  - Prompt 新增视觉设计规范章节（对标小红书/美团/Apple H5），场景包按需注入，token 成本 -29%
  - 新增 ESLint 规则 `no-emoji-icon`（warn，L2-8）：禁止 emoji 当图标，改用 24px stroke SVG
  - 修复：`atomic-duplicate` 字号/字重分桶（`t-*` vs `fw-*`）误判；`no-inline-style` 报错信息带具体违规属性
- **k 渲染层**（v1.6.0 本地标记，`./k` 子入口）：html 模板 + 控制流，1.352KB
- **懒加载注册**（v1.5.3 本地标记）：组件注册改动态 import，启用 Tree Shaking
- **数据飞轮需求分布环**：遥测新增 `kind`（lint/prompt）与 `scene`（场景包 key 封闭集，不落需求原文）字段；`get_prompt`（MCP）/ `generate`（CLI）记录需求事件；flywheel 报告新增"场景需求分布"段（prompt 事件不掺水规则榜/收敛度）——场景包落地优先级由真实需求数据驱动
- **场景包治理**：8 品类关键词探测（含未落地包）；营销包 negativeKeywords 误命中防护（企业后台"首页"不注入高视觉基准）；场景包（品类骨架）与 Few-shot（页面模式）双层分工定型（`.trae/documents/场景包与页面模式边界设计.md`）
- **验证矩阵升级**：原型 3 页 + 空态/错误态共 5 个 e2e 夹具，17 个视觉模式断言（hero-grad/grid-3/card-media/tabbar/dots/seg-brand/cob/stats 彩数字/订单三态），`e2e/prototype.spec.js`；修复循环回归测试 `test/fix-loop-regression.test.js`（fixPrompt 引导力 + RULE_HINTS 全规则覆盖闸门）；修复 ai-fix 陈旧文案（"115 白名单"计数 + `.eslintrc` 引用）并补 5 条 L3.5 规则 hint

### Published

- `@af-mobile/ui@1.7.0`（白名单 228：recipe 136 + atomic 92）
- `@af-mobile/eslint-plugin@2.1.0`（新增 no-emoji-icon + lint 规则修复）
- `create-af-mobile@1.4.4`（依赖 `@af-mobile/ui` `^1.5.2` → `^1.7.0`）
- `@af-mobile/prompt@2.1.0`（视觉设计规范章节 + 白名单同步）
- `@af-mobile/mcp@1.0.4`（assets 同步）

## [1.5.2] - 2026-08-19

> **1.5.x line 首次实际 npm 发布**（v1.5.0/1.5.1 仅本地标记，未推送到 registry，npm 上 latest 仍指向 1.4.3）。本条目汇总自 v1.4.3 以来的累积变更：v1.5.0 视觉基线重构 + v1.5.1 类名简写 + 本次的 af-chat AI 对话子库新增。

### Added（本次新增）
- **af-chat AI 对话子库**（`./chat` 子入口，独立预算线）：
  - `af-chat` Shadow DOM 气泡 + composer + 工具芯片 + 卸片塔
  - 三种封闭卡片：`confirm`（diff 确认）/ `list`（查询结果）/ `actions`（快捷回复芯片），透传 `kind` 兜底
  - 双模式 API：绑定 session（推荐）/ 受控 messages
  - 5 事件：`send` / `action` / `confirm` / `abort` / `error`，流式 a11y（`aria-hidden` 靜态 + sr 播报）
  - 渲染器纯函数 `lib/render.js`，`i18n` 独立 `ct.*` 字典经入口注册（核心体积零影响）
  - `size-check` 新增 `chatUI` 预算线 3.3KB（实测 3.212），chat 内核 1.860KB；主库预算 23KB 不变
  - demo 页 + playground 组件区 + prompt 注入 + site 文档
- **ESLint 插件**：`aria-requirements.json` 新增 af-chat 的 ARIA 必需字段；`whitelist-v1.json` 新增 chat 子库白名单条目
- **Prompt 子包**：`system-prompt.template.md` 注入 af-chat 组件 API + 卡片 schema 片段；`whitelist-v1.json` 同步

### Accumulated（v1.5.0/1.5.1 累积，未发布到 npm，本次首次实际推送）

#### v1.5.1 — 深度性能优化（含**类名破坏性变更**，33 项，纯改名零行为差异）
- **特长类名简写**（≥12 字符为主）：`skeleton*` → `sk*`（10 项）、`search-bar-*` → `sb-*`（3 项）、`checkout-bar*` → `cob*`（2 项）、`segmented*` → `seg*`（3 项）、`collapse*` → `clp*`（3 项）、`switch-thumb/loading` → `switch-th/ldg`、`notice-text/scroll` → `notice-tx/scr`、`upload-trigger/grid` → `upload-tg/gd`、`list-item-compact` → `list-item-cp`、`rate-readonly` → `rate-ro`、`section-title` → `section-tt`、`input-bar-fixed` → `input-bar-fx`、`hairline-top/bottom` → `hl-t/hl-b`
- **豁免家族**：`toast-*` / `progress-*` 保持原名（运行时动态拼接 + `<progress>` 原生标签同名，改名有三重冲突风险）
- **同步范围**：源码/测试/demo/e2e/starter/site/skills/prompt 模板/README/AGENTS 全量 codemod；五配方文件镜像同步；白名单三源与 `prompt/dist` 均已重建
- **体积收益**：gzip 后 CSS 5.990KB → 5.969KB（-21B）、全量 JS 22.015KB → 22.004KB（-11B）。类名简写在 gzip 下收益有限（重复文本已被字典压缩），本项主要为原则一致性
- **结构性去重**：`af-toast` `dismiss()` 双清理路径合并为单一路径；`af-list` 空态与骨架屏的重复逻辑抽取为 `_clearView()` 共用
- **Fixed**：`eslint-plugin` typo 建议测试样本随白名单更新

#### v1.5.0 — UI v6 视觉基线重构（含少量**视觉破坏性变更**）
- **Token 层重构**：品牌 hue 275→262（靛紫偏蓝）；灰阶 5 角色→8 档阶梯（`--c-gray-1..8`）；字号 `--t-md` 15→14、`--t-sm` 13→12；圆角收紧 `--r-s` 8→6、`--r-m` 12→8、`--r-l` 16→12；`--tabbar-h` 52→50
- **去拟物**：`.btn` 删 inset 高光 / 按压位移 / 多层阴影；`.card` 去投影改纯描边；`.navbar`/`.tabbar`/`.input-bar`/`.checkout-bar`/`af-navbar` 去投影改 0.5px hairline
- **触控与行高**：`.cell`/`.list-item` min-height 52→48；`.switch` 对齐大触控规格（52×32 / thumb 28）
- **表单字号恒 16px**：`.input`/`.textarea`/`.search-input` 统一 `--t-input:16px`（iOS Safari 聚焦 <16px 自动放大整页）
- **五配方文件同步**：`recipes-form/feedback/display.css` 与全量 `recipes.css` 对齐
- **Added**：对比度 CI（`scripts/check-contrast.mjs`，挂入 `npm test`）；新 Token `--t-input`/`--tabbar-h`/`--c-gray-1..8`；新配方 `.btn-plain`/`.btn-round`/`.tag-plain`/`.ellipsis-2`/`.hairline-top`/`.hairline-bottom`；`af-navbar` 标题单行截断
- **Fixed**：feedback 子集对比度 bug（`.tag-warn`/`.notice`/`.toast-warning` 黄底配白字不达标）；`recipes-core.css` tab-item 硬编码 48px → `var(--tabbar-h)`；`.btn-danger`/`.btn-success` :active 串色；`no-recipe-break` 子规则 c 扩展到 `.textarea`/`.search-input`

### Migration
- v1.4.3 → v1.5.2 用户需阅读 `docs/migration-guide.md` § UI v6（视觉破坏性）+ § UI v7（类名简写破坏性）。`@af-mobile/ui` peer 依赖方升级时需同步更新类名引用。

### Published
- `@af-mobile/ui@1.5.2`（白名单 188：recipe 121 + atomic 67，含 af-chat 子库白名单）
- `@af-mobile/eslint-plugin@2.0.4`（af-chat aria-requirements + whitelist 同步）
- `create-af-mobile@1.4.3`（依赖 `@af-mobile/ui` `^1.4.3` → `^1.5.2`，脚手架默认拉起新版 UI）
- `@af-mobile/prompt@2.0.3`（system-prompt.template 注入 af-chat + 白名单同步）
- `@af-mobile/mcp@1.0.3`（assets 同步 + 本地领先 patch）

### 体积基线对照（v1.4.3 → v1.5.2）

| 指标 | v1.4.3 npm | v1.5.2 终态 | 预算 |
|------|-----------|-----------|------|
| L1+L2 CSS | 5.990KB | 5.969KB | ≤ 6KB |
| 基类 AfElement | 1.951KB | 1.951KB | ≤ 2KB |
| 全量 JS（30 组件 + 基类） | 22.015KB | 22.004KB | ≤ 23KB |
| charts 全量 | 10.706KB | 10.706KB | ≤ 15KB |
| chatUI（子库，独立预算） | — | 3.212KB | ≤ 3.3KB |

## [1.5.1] - 2026-08-19

> 深度性能优化（结构性去重 + 白名单类名简写）。含**类名破坏性变更**（33 项，纯改名零行为差异），迁移见 `docs/migration-guide.md` § UI v7。

### BREAKING（白名单类名简写，33 项）
- **特长类名简写**（≥12 字符为主）：`skeleton*` → `sk*`（10 项）、`search-bar-*` → `sb-*`（3 项）、`checkout-bar*` → `cob*`（2 项）、`segmented*` → `seg*`（3 项）、`collapse*` → `clp*`（3 项）、`switch-thumb/loading` → `switch-th/ldg`、`notice-text/scroll` → `notice-tx/scr`、`upload-trigger/grid` → `upload-tg/gd`、`list-item-compact` → `list-item-cp`、`rate-readonly` → `rate-ro`、`section-title` → `section-tt`、`input-bar-fixed` → `input-bar-fx`、`hairline-top/bottom` → `hl-t/hl-b`
- **豁免家族**：`toast-*` / `progress-*` 保持原名（运行时动态拼接 `toast-${type}` / `progress-${color}` + `<progress>` 原生标签同名，改名有三重冲突风险）
- **同步范围**：源码/测试/demo/e2e/starter/site/skills/prompt 模板/README/AGENTS 全量 codemod（token 边界正则 + 长名优先替换，零误伤组件标签）；`recipes-core/display/form/feedback.css` 四个子集镜像**已显式同步**（镜像无自动闸门，后续维护仍需人工五文件同步）；白名单三源（源码 ↔ `whitelist-v1.json` ↔ Prompt 注入）与 `prompt/dist` 均已重建
- **体积收益**：gzip 后 CSS 5.990KB → 5.969KB（-21B）、全量 JS 22.015KB → 22.004KB（-11B）。类名简写在 gzip 下收益有限（重复文本已被字典压缩），本项主要为**原则一致性**（高频类名短写、HTML 传输体积下降）；预算主力是下方结构性去重

### Changed（结构性去重，无 API 变化）
- **af-toast**：`dismiss()` 的 if/else 双清理路径合并为单一路径（退场动画回调与立即清理共用 `done()`）
- **af-list**：空态与骨架屏的重复"置零双 spacer + 渲染 viewport + 清空 loadmore"抽取为 `_clearView()` 共用
- CSS 相同声明块合并经实测为 gzip **负收益**（重复声明已被字典压缩，抽象选择器组引入新字面量反而变大），已回退，仅保留 JS 去重

### Fixed
- `eslint-plugin` typo 建议测试样本随白名单更新（`chekout-bar → checkout-bar` 样本失效，换 `sk-lin → sk-ln`，编辑距离 1 触发最近邻建议）

### Published
- `@af-mobile/ui@1.5.1`（白名单 188：recipe 121 + atomic 67，数量不变纯改名）、`@af-mobile/eslint-plugin`（白名单同步）、`@af-mobile/prompt`（assets 同步）

### 体积基线对照（Step 0 基线 vs 终态）

| 指标 | 1.5.0 基线 | 1.5.1 终态 | 预算 |
|------|-----------|-----------|------|
| L1+L2 CSS | 5.990KB | 5.969KB | ≤ 6KB |
| 基类 AfElement | 1.951KB | 1.951KB（未动） | ≤ 2KB |
| 全量 JS（30 组件+基类） | 22.015KB | 22.004KB | ≤ 23KB |
| charts 全量 | 10.706KB | 10.706KB（未动） | ≤ 15KB |

## [1.5.0] - 2026-08-19

> UI v6 视觉基线：去拟物 + 对比度 CI 化 + 五配方文件同步。对标 Vant 4 的系统性整改，含少量**视觉破坏性变更**（见 `docs/migration-guide.md` § UI v6）。

### Changed（视觉破坏性）
- **Token 层重构**：品牌 hue 275→262（靛紫偏蓝）；灰阶 5 角色→8 档阶梯（`--c-gray-1..8`）；字号 `--t-md` 15→14、`--t-sm` 13→12（中文移动端安全基准）；圆角收紧 `--r-s` 8→6、`--r-m` 12→8、`--r-l` 16→12；`--tabbar-h` 52→50
- **去拟物**：`.btn` 删 inset 高光 / `translateY(1px)` 按压位移 / 多层阴影，active 回归换深底色的扁平反馈；`.card` 去投影改纯描边；`.navbar`/`.tabbar`/`.input-bar`/`.checkout-bar`/`af-navbar` 去投影改 0.5px hairline
- **触控与行高**：`.cell`/`.list-item` min-height 52→48；`.switch` 对齐大触控规格（52×32 / thumb 28）
- **表单字号恒 16px**：`.input`/`.textarea`/`.search-input` 统一 `--t-input:16px`（iOS Safari 聚焦 <16px 输入框会自动放大整页且用户不可关闭）
- **五配方文件同步**：`recipes-form/feedback/display.css` 与全量 `recipes.css` 对齐（switch 规格 / skeleton 行高 / segmented clamp 内边距），消除子集间漂移

### Added
- **对比度 CI**：`scripts/check-contrast.mjs`（OKLCH→sRGB 转换 + WCAG 比值断言，正文/次级/按钮/警示等关键组合 AA 达标），挂入 `npm test` 与 `ci`
- **新 Token**：`--t-input`、`--tabbar-h`、`--c-gray-1..8`、`--palette-gray-1..8`
- **新配方/原子**：`.btn-plain`（描边按钮）、`.btn-round`（胶囊）、`.tag-plain`（描边标签）、`.ellipsis-2`（两行截断）、`.hairline-top`/`.hairline-bottom`（0.5px 分隔线工具类）
- **af-navbar 标题单行截断**（`min-width:0` + ellipsis，长标题不再撑破布局）

### Fixed
- **feedback 子集对比度 bug**：`.tag-warn`/`.notice`/`.toast-warning` 黄底配白字（AA 不达标）→ 改 `--c-onwarn` 暖深棕；黑底 `.toast` 在 dark 主题下文字随 onbrand 变深不可读 → 恒 `#fff`
- **`recipes-core.css` tab-item 硬编码 48px** → `var(--tabbar-h)`（此前改 token 不生效）
- **`.btn-danger`/`.btn-success` :active 串色**（继承 `.btn:active` 的 brand-strong）→ 各自补深底色
- **ESLint `no-recipe-break` 子规则 c** 扩展到 `.textarea`/`.search-input`，报错文案修正为 `--t-input`
- 规则 05（Prompt 25 条禁令）同步更新为三控件 + `--t-input` 表述

### Published
- `@af-mobile/ui@1.5.0`（白名单扩至 185：recipe 118 + atomic 67）、`@af-mobile/eslint-plugin@2.0.2`、`@af-mobile/prompt@2.0.3`（assets 同步）

## [1.4.2] - 2026-08-17

### Fixed
- **`register` / `registerAll` 压缩安全化**：以显式 tag→Ctor 字面量表替代 `Function.name` 推导，规避 minify 后类名被混淆为 a/b/c 导致组件注册失败；`start()` 增补 outlet 参数归一化守卫（回归测试 6 例）

### Added
- **布局配方 `.page-col` / `.scroll-y`**：`src/recipes.css` 新增两布局 class，白名单同步扩至 156（recipe 104 + atomic 52）
- **消费端 AI 开发体验**：`mcp/assets` 与 `prompt/assets` 的 system-prompt 增补完整 App 骨架示例（index.html / main.js / list.js / 设计范式）

### Docs
- 新增 charts demo 详细设计文档（`docs/design/charts-demo-detailed-design.md`：5 组件 demo + 联动场景页 / `demo/index.html` 接入）
- 文档站补齐 5 个 chart 组件文档（`site/components/af-chart-{line,bar,pie,radar,funnel}.md`）与 `component-list.json` 登记

### Published
- `@af-mobile/ui@1.4.2`（含上述 register 修复与布局配方）、`@af-mobile/eslint-plugin@2.0.1`（白名单 +2）、`@af-mobile/prompt@2.0.2`、`@af-mobile/mcp@1.0.2`（assets 同步）
- **`create-af-mobile@1.4.1` 首发**：含 skill 安装修复与 `@af-mobile/ui@^1.4.1` 依赖

## [1.4.1] - 2026-08-17

### Added
- **脚手架薄壳包 `create-af-mobile`**：npm create 约定入口（`npm create af-mobile <目录名>`），按需下载执行，无需先手动 `npm install`；转发 `@af-mobile/ui` CLI 并默认注入 `create` 子命令，`skill` 子命令原样透传
- 脚手架模板依赖改为 npm 版本号（`^1.4.x`，禁 `file:` 本地依赖），生成工程自动自举 af-mobile-grill skill

### Published
- **首个 npm 发布补全**：新增并发布 `@af-mobile/mcp@1.0.0`（MCP Server）、`@af-mobile/prompt@1.5.1`（System Prompt builder）、`@af-mobile/adapters@0.1.0`（supabase scheme 适配器）
  - 修复发布前问题：`@af-mobile/adapters` peer 依赖 `@af-mobile/ui` 校正为 `^1.4.0`（`registerBackend` 于 1.4.0 引入）；`@af-mobile/mcp` 的 `@modelcontextprotocol/sdk` 从 `*` 收紧为 `^1.30.0`
  - `.gitattributes` 为 mcp/prompt 的 assets 副本与 `system-prompt.md` 钉 `text eol=lf`，根治 Windows 下 pkg-assets / build-prompt 快照闸门因 autocrlf 反复误报
  - 三包补充 README（依赖缺失时发布页面将随下个 patch 版更新）

### Changed
- **skill 安装方式修复**：新增 `af-mobile skill add [目录]` 子命令（`npx @af-mobile/ui skill add`），已建项目可补装 / 升级 skill（幂等，默认当前目录）
  - 安装器多目标幂等同步：`skills/`、`.trae/skills/`、`.claude/skills/` 三处落盘 + `AGENTS.md` marker 守卫追加指引段，重复执行安全（覆盖 TRAE / Claude Code / AGENTS.md 标准读者）

## [1.4.0] - 2026-08-17

### Added
- **charts 子库**：新增 5 个图表组件 `af-chart-bar / af-chart-line / af-chart-pie / af-chart-radar / af-chart-funnel`，含独立内核（scale / geometry / render / chart-theme / tooltip / chart-base），入口 `@af-mobile/ui/charts`，独立体积预算（全量 10.6KB ≤ 15KB）
- i18n 新增 charts 文案 `ch.em / ch.rt / ch.otr`
- `size-check` 增加 charts 子库独立测量（`npm run size`）

### Changed
- **体积优化，主库 total 23.1KB → 19.9KB（达成 <20KB 目标）**
  - 修复测量泄漏：size-check 的 external 未覆盖组件内 `../lib/i18n.js`、page.js 内 `./state.js` 等路径变体，i18n/page/bind/router/state 曾被误计入 total；page+bind 纳入 coreRuntime 独立预算
  - `defineProp` 紧凑签名：属性定义从对象字面量简化为默认值直传，消除样板代码
  - 焦点陷阱 / 滚动锁逻辑下沉基类 `AfElement`，4 个模态组件去重
  - 基类新增 `_listen()` 自动事件解绑：断开时统一清理监听并清空登记表，重连由 mounted 重新绑定；`wc-cleanup` ESLint 规则改为强制走 `_listen`（覆盖 components / blocks / charts/components）
- 体积预算锚定：主库 total ≤ 20KB、基类 ≤ 2.0KB、coreRuntime ≤ 6.8KB（含 page+bind）、onDemand2 ≤ 6.5KB

### Docs
- 新增 charts 子库详细设计文档（Phase 1-2 完成）
- 更新 L3 体积预算说明

### Known limitation
- charts 子库经 `@af-mobile/ui/charts` 源码入口提供（ESM，Tree Shaking 友好）；**unpkg / jsdelivr CDN 直引暂不含 charts 的 dist 打包产物**，CDN 场景需通过源码入口或自行打包
