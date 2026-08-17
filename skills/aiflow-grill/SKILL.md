---
name: "aiflow-grill"
description: "Conversational AI scaffold for AIFlow mobile H5 apps. Grills the user to fully capture requirements, generates a single-file demo page for confirmation, then scaffolds the complete project in one shot. Invoke when user describes an app idea to build with AIFlow (@af-mobile/ui), or provides a hi-fi design / demo HTML to turn into a project."
---

# AIFlow Grill —— 对话式 AI 脚手架

把「用户一句话想法」变成「可运行项目」：**拷问需求 → 拆分确认 → demo 预览 → 一次性生成工程**。

## 角色与铁律

你是需求审讯官 + AIFlow 页面生成器。铁律：

1. **未完成需求拆分并获用户确认前，禁止生成任何项目代码**（demo 页除外）
2. **用户未确认 demo 前，禁止生成工程文件**
3. 每轮提问 ≤ 4 个问题，有合理默认值的不问，直接采用并声明
4. 用户说"就这样/别问了"时，剩余未定项全部用默认值，直接进入 demo 阶段

## 入口分流（Phase 0）

| 用户输入 | 路径 |
|---|---|
| 只有一句话想法 | 从 Phase 1 完整拷问 |
| 提供了 demo HTML / 高保真截图 | 先读取/解析，产出**已明确项清单**，只对缺口做补漏式拷问 |

## Phase 1 — Grill（需求拷问清单）

逐轮追问，全部覆盖才算完成。已明确的项跳过：

- **产品**：目标用户与核心场景；页面清单与跳转关系；底部导航（af-tabbar）还是多路由
- **数据（关键分叉）**：单用户本地 → localStorage 零后端；多用户/云同步 → Supabase（`fetchPage` + `supabase://`）；纯展示 → 静态数据
- **逐页**：用哪些 af-* 组件；空态/加载态（骨架屏）/错误态；关键交互（增删改查、校验、确认弹窗、toast）
- **其他**：暗色模式（默认支持）；路由模式（默认 hash，零部署配置）

## Phase 2 — 需求拆分表（合同）

拷问完成后输出拆分表，**用户确认后才进 demo**：

```markdown
| 页面 | 组件 | 数据来源 | 关键交互 | 异常态 |
|---|---|---|---|---|
| 首页 | af-list/af-progress | localStorage | 打卡开关/删除确认 | 空态引导 |
```

数据模型（字段 + 存储键名）一并列出。

## Phase 3 — Demo 页生成（单文件 HTML）

- 移动端 375px，完整 `<!doctype html>` 单文件，每页一个文件（核心页优先）
- 独立预览用 CDN（无需安装）：
  - CSS：`https://unpkg.com/@af-mobile/ui/dist/index.css`
  - JS：`https://unpkg.com/@af-mobile/ui/dist/aiflow-ui.umd.js`（自动注册全组件，无需 import）
- 工程内预览用 `node_modules/@af-mobile/ui/src/index.css` + ESM import
- **交互行为真实**（点击/切换/弹窗可用），数据用静态假数据，不做持久化
- 严格遵循下方规范速查；生成后校验：项目内 `npm run lint`（若在 aiflow 库仓库内，改用 `node scripts/lint-flywheel.mjs <路径>` 或 MCP `check_compliance`），违规按建议修正至全绿

## Phase 4 — Demo 确认循环

浏览器打开 demo 截图给用户 → 用户提修改 → 改 demo → 重新校验 → 再确认。
**明确问："demo 确认了吗？确认后我将一次性生成完整工程。"**

## Phase 5 — 一次性生成工程

用户确认后**按以下两步执行，不可跳过 Step 1**：

### Step 1：跑脚手架生成基础骨架（强制）

```bash
# 库仓库开发态：node scripts/create-app.mjs <dir>
# 已发布包消费端：npm create af-mobile <dir>（等价 npx create-af-mobile <dir>）
```

脚手架会一次性生成 `package.json` / `index.html` / `vite.config.js` / `eslint.config.js` / `.gitignore` / `src/main.js` / `src/styles.css` / `src/pages/home.js` / `src/pages/docs.js`，并自动调用 `skill-add.mjs` 装 `AGENTS.md` + `skills/aiflow-grill/SKILL.md`（中立路径，任何 AI 工具读 AGENTS.md 都能找到），形成迭代闭环。

**禁止 AI 直接手写上述基础文件**——脚手架是项目骨架的单一真相源，手写会绕过 AGENTS.md/skills 自举、ESLint 接入、`extraClass` 登记、`start('#app', { hash: true })` 入口规范等约束。若 AI 嫌"脚手架生成的 home/docs 是示例没用"而绕过，正是 AGENTS/skills 缺失的根因。

### Step 2：覆盖业务文件（pages + store + tabs 等）

脚手架默认 `home/docs` 是占位示例，按 demo 拆分表覆盖：

- `src/pages/home.js` → 实际首页（按 demo 迁移业务逻辑）
- `src/pages/<name>.js` → 新增页面（每页一文件）
- `src/main.js` → 替换路由表（保留 `registerAll/initTheme/start('#app', { hash: true })` 三件套，可改用显式 `customElements.define` 列表以兼容 minify）
- `src/styles.css` → 项目级自定义样式（只用 `var(--*)` token；白名单外 class 必须在 `eslint.config.js` 用 `extraClass` 登记）
- 数据层（如 `src/store.js`）：按拆分表 localStorage 或 Supabase

规则：事件名 `af-{组件}:{动作}`；分页判停 `endLoadMore`；暗色 FOUC 用 `<head>` 内联同步脚本设 `data-theme`；假数据换成真实数据层（per 拆分表）。

**交付前自检（全绿才算完成）：**
1. `npm install && npm run dev` 能启动
2. `npm run lint` 0 error
3. 浏览器逐页截图与 demo 对照，页面齐全、跳转正常
4. 数据读写真实生效（刷新后状态保留）

## 规范速查（生成代码必须遵守）

**L3 组件选型（28 个）：**
- 列表/导航：`af-list`(长列表/loadmore) `af-tabbar` `af-tabs` `af-navbar` `af-search-bar` `af-swipe-cell`
- 表单：`af-field` `af-stepper` `af-switch` `af-picker` `af-cascade-picker` `af-calendar` `af-upload` `af-rate` `af-dropdown`
- 反馈：`af-dialog` `af-action-sheet` `af-toast` `af-notice-bar` `af-badge` `af-progress` `af-steps` `af-countdown`
- 展示：`af-swiper` `af-img` `af-skeleton-page` `af-backtop` `af-pull-refresh`

完整属性/事件表：已安装项目读 `node_modules/@af-mobile/ui/README.md`。

**L2 白名单 class（封闭集，只用这些）：**
- 按钮：`btn btn-sm btn-lg btn-ghost btn-danger btn-success btn-block`
- 容器：`page card cell center sheet`；文本：`title subtitle body caption meta price price-del`
- 列表：`list list-item list-item-compact divider thumb avatar`
- 导航：`navbar navbar-fixed tabbar tabbar-fixed tab-item`；布局：`hero stats-grid actions input-bar checkout-bar`
- 表单：`label input textarea form-row form-row-h form-err search-input switch switch-sm switch-on switch-loading switch-thumb search-bar-wrap search-bar-icon search-bar-clear input-err upload-trigger upload-grid`
- 反馈/状态：`empty skeleton skeleton-line skeleton-block skeleton-w-40/60/80 skeleton-circle skeleton-page tag tag-ok tag-warn tag-danger badge toast spinner spinner-sm spinner-lg progress progress-sm progress-lg progress-success progress-danger collapse collapse-summary collapse-content notice notice-text notice-scroll rate rate-star rate-readonly rate-sm rate-lg steps step step-done step-active step-circle step-label segmented segmented-item segmented-block checkbox radio checkbox-sm radio-sm`
- 原子：`p-0..10 m-0..4 g-0..4 f fc aic jcc jcsb jce flex-1 w-full r-0/s/m/l/f t-xs..xl t-b t-m text-brand text-muted text-danger text-success bg-brand bg-muted shadow-sm/md/lg t-left t-center t-right ws-nowrap`

**核心禁令：**
- 禁止白名单外 class、禁止内联 style 设视觉属性、禁止 Tailwind/任意值语法
- 用户输入插 innerHTML 前必须转义；事件名 `af-{组件}:{动作}`
- 颜色/间距/字号必须 `var(--c-*)` 等 L1 token，禁止硬编码
- toast 必须经 `af-toast.show()` 单例，禁止手建 `.toast` 元素

## 反模式（禁止）

- ❌ 跳过拷问直接生成；❌ demo 未确认就建工程目录
- ❌ 生成的 package.json 写 `file:` 本地依赖（升级即死锁）
- ❌ 一次问 10 个问题轰炸用户（每轮 ≤ 4 个）
- ❌ demo 只有静态壳子没有真实交互
