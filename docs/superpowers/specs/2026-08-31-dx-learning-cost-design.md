# D-019 学习成本专项设计（外部实战反馈第二轮）

- 日期：2026-08-31
- 状态：待评审
- 输入：豆包第二轮实战反馈（chat 子库接入耗时分析 + 学习层发现）+ 其交付 app 的浏览器实测 + 源码审计归因
- 关联回链：D-011（子库进教材）、D-012/D-013/D-014（chat 能力演进）、D-017/D-018（第一轮反馈处理）、D-009（消费端交付链配件）

## 一、背景与定性

豆包（外部用户，`@af-mobile/ui@1.8.0`）反馈接入最耗时的是 chat 子库：`requestFn` 契约隐蔽（要读 `session.js` 源码才懂）、缺接真实 LLM 的最小示例、本地验证要来回试。学习层补充发现：缺「最小完整应用」范例、理念文档与 API 文档割裂。

与第一轮反馈（D-017/D-018，API 缺陷）不同，本轮性质是**学习成本问题**——修法几乎全是文档/示例工程。优化目标不是让接入变草率（豆包自认严格验证的慢是质量保证），而是**消除纯摩擦**：来回试、只能读源码、规则散落。与 D-011 哲学同构：教材与 demo 是 AI 学习素材，素材质量决定生成质量。

### 1.1 实测归因（源码审计结论，已核实）

对其交付 app（`https://4ky7zn4xg4gnc.aiforce.cloud/app/app_17d4hrv3yu9/`）浏览器实测四页 + 两次真实 AI 对话，工具调用端到端闭环通过。源码审计归因：

| 检查项 | 结论 |
|---|---|
| 接入姿势（pages/*.js + main.js） | ✅ 规范：按需注册、hash 路由、af-chat session 注入、工具分流正确 |
| styles.css + index.html | ✅ 白名单/a11y 良好；❌ manifest/图标用绝对根路径 |
| @af-mobile/ui 版本 | ✅ 1.8.0（非旧版本问题） |
| 部署结构 | ✅ public/ 带上了（dist 和 deploy.zip 都有 manifest）；**根因是路径引用** |

**实锤的脚手架 bug（新增第 ⑤ 项）**：`create-app.mjs` 模板与 `starter/index.html` 的配件引用全是绝对根路径（`/manifest.webmanifest`、`/favicon.ico`、`/icon-192.png`、og:image `/icon-512.png`）。子路径部署（妙搭 `/app/app_17d4hrv3yu9/` 已证明是真实场景）下全部 404。本仓 router 是 hash 路由（D-017），文档 URL 不随导航变化，相对路径 `./` 在根部署与子路径部署下均正确，无历史模式深链风险。

### 1.2 实测问题清单（→ demo 的验收加分项）

1. PWA 配件全 404（上述根因）
2. a11y 缺口：form field 缺 id/name（console issue）；chat 工具卡片内两个无 accessible name 的按钮
3. 流式完成后消息末尾残留蓝色光标条（`state=idle` 时截图可证）
4. 工具芯片卡片留白过大（约 200px 空区）
5. 噪音：「今日」页 banner 与 hero 卡重复显示同一日期；「我的」页文案暴露内部路径（「见项目 docs/supabase.sql」对终端用户无意义）
6. D-014 多会话未用上（只有「新对话」，无历史/切换/删除 UI）

### 1.3 实测亮点清单（→ demo 的需求对标）

4 tab 信息架构（今日/AI 助手/全部/我的）；快捷指令 chips；工具芯片流（新建待办… → ✓ → 确认文本）；复制/重新生成（D-013）；`role=log` live region；回到底部；「我的」页自带豆包 API Key 配置（真实 LLM `requestFn` 定制）+ Supabase 云同步 + 深色模式；主库组件各得其所（af-progress 完成率 / af-swipe-cell 滑动删除 / af-dialog / af-tabbar）。

## 二、现状核查（反馈点 vs 仓库已有动作）

| 反馈点 | 现状 |
|---|---|
| requestFn 契约隐蔽、无最小示例 | ✅ 已补：site/components/af-chat.md「接真实 LLM」段（changeset `issue5-chat-llm-docs.md` 已备） |
| jsdom 打桩成本高 | ✅ 已补：D-018 `@af-mobile/ui/test` |
| 第一轮 6 项 API 问题 | ✅ D-017 已决 |
| 缺最小完整应用 | ❌ 本设计 §四 |
| 理念与 API 文档割裂 | ❌ 本设计 §三 |
| .d.ts 行为藏实现 | ❌ 本设计 §二 |
| 环境摩擦（浏览器自动化/dev server） | 不立项，非框架职责（登记明确放弃） |

## 三、方案（五项）

### ① mock LLM server（P0，消「本地起服务来回试」）

- 落点：`demo/apps/ai-todo/mock-llm.mjs`，零依赖 Node `http`，单文件
- 能力：OpenAI 兼容 `POST /v1/chat/completions`，SSE 流式（`data:` 帧分片，含跨帧 tool_call arguments 分片以复现真实解析路径）；按请求中的 `tools` 回一次 `tool_calls`；可选 `reasoning_content` 帧演示 think 折叠；`stream:false` 时回完整 JSON
- 骨架（实施时按 session.js 实际解析格式校准）：

```js
// node mock-llm.mjs [--port 8787]
import { createServer } from 'node:http';
createServer((req, res) => {
  // CORS: *（本地调试用）；解析 body.messages/tools
  // SSE: data: {"choices":[{"delta":{"content":"..."}}]}\n\n
  // 工具轮: delta.tool_calls[0].function.{name,arguments 分片}
  // 收尾: data: [DONE]
}).listen(port);
```

- site/components/af-chat.md「接真实 LLM」段末尾加一行链接指向仓库内该文件；教程页（§④C）详述用法
- **边界**：不进 npm 包（浏览器库不背 Node 脚本，动 exports 需过 build+publish:check，不值）；不做多 provider 模拟

### ② 类型契约 JSDoc（P0，消「行为藏实现」）

- 直接在 `src/chat/index.d.ts`（手工维护，已有 JSDoc 先例）补四处：
  - `SessionOptions.requestFn`：返回标准 `Response`（内部对 `res.body` 调 `getReader()` 解析 SSE）；body 为 OpenAI 格式；工具循环已内置、`requestFn` 无需分支
  - `createSession`：会话管线一句话说明（send → SSE → 块转换 → 工具循环 → subscribe 通知）
  - `parseSSE`：输入输出契约
  - `ContentBlock` 与 OpenAI 块格式对应关系（块格式 → OpenAI 消息格式的双向映射说明）
- 门禁：`npm run types:check`；产物体积零影响
- 发版：`@af-mobile/ui` patch changeset（类型注释增强）

### ③ 单页上手指南 app-recipe（P1，消「规则散落」）

- 新增 `site/guide/app-recipe.md`（应用配方），**入口汇总页 + 高频规则速查**，只链接不复制长文（割裂的解药是单一入口，不是一个大页面）
- 内容段：注册规则（`register`/`registerChart`/`registerChat` 变参 + DEV 漏注册告警，D-017）→ 路由与守卫 → 样式规则（L2 白名单 + tokens 红线）→ 子库引入（D-011 教训）→ 测试打桩（`@af-mobile/ui/test`，D-018）→ 部署配件（`base` 相对路径，⑤）
- `.vitepress/config.mts` 注册侧边栏

### ④ 最小完整应用（P2，B+C 形态，用户已拍板）

**B — `demo/apps/ai-todo/`**：三页 SPA，一页覆盖一个能力域：

| 页 | 覆盖能力 |
|---|---|
| 待办列表 | 主库 CRUD（createPage + L2 白名单 class + af-swipe-cell/af-dialog） |
| AI 助手 | chat 子库（af-chat + defineTool 工具闭环 + sessions.js 多会话完整示范——差异化加分，豆包 app 未做） |
| 统计 | charts 子库（af-chart-*，呼应 D-011 漏用 trap） |

- 形态：`index.html + app.js（hash 路由注册）+ pages/*.js + mock-llm.mjs`；包名 `@af-mobile/ui` 引入（消费端视角一致）
- 需求对标：§1.3 亮点清单；验收加分：§1.2 问题全修（配件齐全、a11y 过闸、无光标残留、紧凑工具芯片、多会话 UI）
- 吃满现有门禁：ESLint（demo/ 在列）、`demo:check`、whitelist、ARIA；**无需新 package.json / vite 配置**（根 vite 直接 serve）
- **放弃了什么**：脚手架模板变体 A（`--template chat`）——模板分叉维护成本翻倍，延后到真实需求触发（与 D-016 provider 纪律一致）
- 边界：演示数据走 localStorage；「我的」页不配 API Key UI（demo 用 mock-llm 跑通，教程页说明如何换豆包/OpenAI 兼容 endpoint——与豆包 app 的差异化：demo 证明 0 成本跑通，教程桥接真实 LLM）

**C — `site/guide/tutorial-todo-app.md`**：从零到跑通教程，按步骤讲解，代码块与 demo 工程文件一一对应（标注「以仓库文件为准」+ GitHub 链接），末尾两段：换真实 LLM（豆包/OpenAI 兼容 + API Key 注意 XSS/泄露边界）与云同步指引。config.mts 注册。

### ⑤ 脚手架子路径部署适配修复（P0 bug fix，回链 D-009；根因由豆包源码审计 + 对方修复清单交叉确认）

子路径部署（GitHub Pages `/repo/`、Vercel 子目录、妙搭 `/app/app_xxx/` 已实测）下，脚手架产物必然 404 的三处根因，`create-app.mjs` 模板与 `starter/` 双双修复：

1. **`vite.config.js` 加 `base: './'`**——否则 vite 默认 `base: '/'` 把构建产物 JS/CSS 注入为 `/assets/*` 绝对路径，子路径部署必 404（仅改 index.html 的 link 不够）。hash 路由下文档 URL 不随导航变化，相对 base 无深链风险
2. **manifest `start_url` 改 `"./"`**（现为 `"/"`，L104/L5）——PWA 从子路径正确启动；icons `src` 本就是相对（以 manifest URL 为基准），无需改
3. **`index.html` 配件引用改相对**：`/manifest.webmanifest`、`/favicon.ico`、`/icon-192.png` → `./`；og:image `/icon-512.png` → `./icon-512.png`（vite 不改 meta content，必须手改）

- 落点：`scripts/create-app.mjs`（vite.config 模板 L116-121、manifest 模板 L100-114、index.html 模板 L79-81）+ `starter/vite.config.js`、`starter/public/manifest.webmanifest`、`starter/index.html`
- `starter/DEPLOY.md` 补一段：子路径部署三处相对路径已默认；`base: './'` 的适用边界（hash 路由安全；若未来切 history 路由需重新评估）
- doctor 关联：consumer-delivery P1 的 deploy/doctor「配件线上可达 + JS 可达」检查项把本案例登记为活体验证场景——不属本次实施，仅登记
- 发版：`@af-mobile/ui` patch changeset（create-app.mjs 随包分发）

## 四、明确不做（登记）

| 项 | 理由 |
|---|---|
| 环境摩擦（浏览器自动化/dev server 中断） | 豆包自身工具链问题，非框架职责 |
| mock server 进 npm 包 | 浏览器库不背 Node 脚本 |
| 脚手架 `--template chat` 变体 | 模板分叉成本，等真实需求触发 |
| index.d.ts 生成式改造（JSDoc → 自动生成） | 现有手工 .d.ts + JSDoc 已满足，不引入构建步骤 |

## 五、验证闸门

1. `npx eslint src/ test/ scripts/ e2e/ prompt/ eval/ mcp/ eslint-plugin-af-mobile/ adapters/ starter/src/ demo/ --max-warnings 0`
2. `npx vitest run`（全绿）+ `npm run scaffold:check`（⑤ 改了 create-app.mjs 模板）
3. `npm run size && npm run whitelist:check && npm run types:check && npm run aria:check`
4. `npm run prompt:check`（改了 src/）
5. `npm run demo:check`（改了 demo/）
6. `npm run docs:build`（site 两页 + config.mts）
7. 浏览器实测：`demo/apps/ai-todo` 三页渲染 + mock-llm 对话闭环（含工具调用 + 多会话切换/删除）
8. 脚手架冒烟：`node scripts/create-app.mjs <临时目录>` → 核对 index.html 相对链接、manifest `start_url:"./"`、vite.config `base:'./'`，并 `vite build` 核对产物内 JS/CSS 均为相对路径
