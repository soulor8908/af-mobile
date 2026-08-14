---
name: "aiflow-migrate"
description: "将 React/Vue 项目重构为 aiflow 原生应用（createPage + Web Components + L2 白名单 class + L4 约束）。含只读评估（--audit）与全量重写（--execute）两种模式。当用户要把一个 React 或 Vue 项目迁移/重构到 aiflow 组件库时调用。"
---

# aiflow-migrate —— React/Vue → aiflow 原生重构

把一个基于 React 或 Vue 的项目，迁移到 aiflow 原生运行模型：

- **消费端 = `createPage`（state/computed/effects/actions/setup）+ `:bind` + 原生 `<af-*>` 组件 + L2 白名单 class**
- **无框架运行时**：不保留 react/vue 依赖，组件本身是无框架 Web Component，库自带 state.js / router.js / bind.js / data-ref.js / fetch.js / i18n.js

两种模式，通过子命令区分：

| 子命令 | 行为 | 权限 |
|---|---|---|
| `aiflow-migrate --audit <repo>` | 只读评估：影响点盘点 + 工作量估算 + 风险 + 决策，产出《迁移评估报告》 | 只读，不改码 |
| `aiflow-migrate --execute <repo> [--report <path>]` | 全量重写 UI 层 + 拆除框架 + 落地 L4 约束 + 自检 | 写码 |

前置：本 skill 依赖 aiflow 仓库的约束体系（`AGENTS.md` 反模式清单、`eslint-plugin-aiflow`、`src/recipes.css`/`atomic.css`/`tokens.css`、白名单 `whitelist-v1.json`）。重构对象仓库需能以 `file:` 或已发布包方式引入 aiflow 组件库与 `@af-mobile/eslint-plugin`。

---

## 1. 铁律（重构期间不可违反）

1. **业务核不动**：框架无关的 TS/JS 核心（store/engine/parser/领域逻辑）原样保留，绝不重写。
2. **XSS 转义**：用户可控文本插入 innerHTML 前必须 `escapeHtml()` 或 `html\`...\`` 模板。
3. **禁内联 style**：`style="..."` 与 `style={{...}}` 一律禁止，改 recipes/atomic class 或 `--css-var` 自定义属性。
4. **白名单封闭集**：class 只能用 `whitelist-v1.json` 内 class；自定义视觉类走 `data-role` + recipes.css 宿主规则，或登记白名单三源（CSS + whitelist + prompt）。
5. **事件命名**：`af-{组件}:{动作}`，`emit` 带 `composed: true`。
6. **ARIA 必需**：满足 `eslint-plugin-aiflow/utils/aria-requirements.json` 声明的必需属性。
7. **每次改完跑自检**（见 §6），不允许 `eslint-disable` 绕过（测试夹具例外）。

---

## 2. 模式一：`--audit` 只读评估

输入：仓库路径。输出：`<repo>/MIGRATION-REPORT.md`（或指定路径）。

### 2.1 项目画像
- 框架与版本（React 18/19、Vue 2/3）、入口（main.tsx/main.js）、构建工具（vite/webpack）、路由方案。
- 组件库依赖现状：是否已引入 aiflow（直接 `<af-*>` 标签 / wrapper 层 / 未引入）。

### 2.2 业务核判定
- 确认核心逻辑是否框架无关（纯类/纯函数，无 react/vue import）。
- 判定依据：`core/`、`store/`、`services/` 等目录是否 100% 无框架 import；若有耦合，标注"需先抽离"。

### 2.3 影响点清单（逐 UI 文件盘点，产出表格）
| 维度 | 盘点项 |
|---|---|
| 状态 | useState/useRef/useReducer/ref/reactive/watch 数量与语义（→ state/refs/computed/effects/actions） |
| 样式 | 内联 style 数量与属性；自定义 CSS class 集合（→ 白名单 or data-role）；CSS 文件规模 |
| 事件 | onClick/onChange/@click/v-model 等绑定方式与目标（→ `:bind`/`@event`/effects） |
| 弹层 | createPortal / 命令式 modal/confirm/prompt（→ af-dialog / af-action-sheet） |
| 路由 | 路由表、嵌套、守卫、keep-alive（→ router.js） |
| 测试 | RTL/Vue Test Utils 用例数（→ 组件 DOM 测试 + playwright e2e） |
| 依赖 | 独立包（如聊天 SDK）、UI 组件库、worker 等是否受影响 |

### 2.4 工作量估算（按视图打分）
每视图按 3 因子给分：组件数、状态复杂度、样式耦合度 → 结论 `易 / 中 / 难`。
区分两类工作量：
- **机械替换**：React/Vue 语法 → aiflow 语法的直接映射（可套 §4 映射表）。
- **交互重设计**：需要重新设计的交互（虚拟滚动、手势、动画等）。

### 2.5 决策矩阵
- 汇总每视图 `易/中/难` + 风险 + 是否值得迁，输出结论：**全迁 / 部分迁 / 不迁**。
- 列出阻塞项（如关键依赖无法在原生模型下复现）。

---

## 3. 模式二：`--execute` 全量重写

前置：先 `--audit`；若未提供报告则自动先审计。执行流程：

### 3.1 解耦业务核
- 把内嵌在 UI 组件里的业务逻辑抽到框架无关模块；确认 store 提供订阅能力（onChange / 事件），供 aiflow `effect` 消费。

### 3.2 重写 UI 层（每个视图一个页面）
- 用 `createPage({ state, computed, setup, effects, actions })` 组织页面。
- 手写 DOM 换成 `af-*` 组件；列表用 `af-list`（data + renderItem + 虚拟滚动），弹层用 `af-dialog`/`af-action-sheet`，表单用 `af-field`/`af-switch` 等。
- `:bind` 只绑 `state.*` / `computed.*` / `{ref}.*`；禁裸 `addEventListener`（走 effects 或 `@event`）。
- 样式：recipes/atomic 白名单 class 替代自定义 CSS 与内联 style。

### 3.3 样式接入
- 引入 `@af-mobile/ui` 的 `recipes.css`/`atomic.css`/`tokens.css`。
- 主题定制用 `:root { --c-*: ... }` 重映射 token（禁改 tokens.css 本身），或 `initTheme()`。

### 3.4 拆除框架
- 删除 react / react-dom / vue 依赖与构建插件，移除 wrapper 层与手写 d.ts。
- 入口改为原生引导：`import { start } from '@af-mobile/ui'; start({ outlet: '#app' });`，路由用 `route()`/`go()`。

### 3.5 落地 L4 约束
- 安装并注册 `@af-mobile/eslint-plugin`，UI 代码启用完整 AI 规则集。
- 接入白名单三源检查（CSS ↔ whitelist.json ↔ prompt）与 CI 闸门（照搬 aiflow 仓库 `.github/workflows/ci.yml` 模式）。

### 3.6 测试迁移
- RTL / Vue Test Utils 用例改为组件 DOM 测试（jsdom + 自定义元素）+ playwright e2e 覆盖主流程。

---

## 4. 映射表（React / Vue → aiflow）

### React
| React | aiflow |
|---|---|
| `useState(x)` | `state: { x }`（读 `s.x`，写 `s.x = v`） |
| `useEffect(fn, [deps])` | `effects.mount` / `effects.route` / `effects.unmount` |
| `useRef(x)` | `setup` 返回值挂 `page.refs` + `data-ref` |
| `useMemo / useCallback` | `computed` / `actions` |
| `useReducer` | `actions`（纯函数，state 为第一参数） |
| `onClick={fn}` 等 | `@event` / `effects`；组件内部 `data-ref` + `bind` |
| `className="x"` | 白名单 class；自定义样式用 `data-role` + recipes 宿主规则 |
| `style={{...}}` | 禁止，改 recipes class 或 `--css-var` |
| `createPortal` / 命令式 modal | `<af-dialog>` / `<af-action-sheet>` |
| Context / Provider | `createPage` 页面作用域 + store 单例 |
| 框架路由 | `router.js`（`route`/`go`/`start`/`scrollBehavior`/keep-alive） |
| store 版本号订阅 | `effect` 订阅 store 事件 / `computed` |

### Vue
| Vue | aiflow |
|---|---|
| `ref` / `reactive` | `state` |
| `computed` | `computed` |
| `watch` | `effects` |
| `v-model` | 表单组件 `:bind="state.x"` |
| `v-for` | `af-list` `data` + `renderItem` |
| `v-if` / `v-show` | `state` 条件渲染 / 组件五态（loading/error/empty/success） |
| template + scoped style | `html\`...\`` 模板 + recipes/atomic class |
| `v-on` / `$emit` | `@event` / `af-{组件}:{动作}` |

---

## 5. 反模式清单（复用 AGENTS.md 10 条）

1. 用户输入插 innerHTML 前不转义 → 必须 `esc()` 或 `html` 模板。
2. 动画无 `@media (prefers-reduced-motion: reduce)` 覆盖。
3. 模态组件无焦点陷阱 / 关闭不还原焦点。
4. 交互列表无键盘导航（Arrow/Enter）。
5. ARIA 字段声明与检测逻辑不同步。
6. `JSON.parse` 不包 try-catch。
7. Light DOM 组件出现 `this.style.*` / `<style>` 标签。
8. 新增 class 未同步白名单三源。
9. CI 的 ESLint 范围漏掉 test/scripts。
10. 布尔属性 setter 为 false 时不 `removeAttribute`。

---

## 6. 自检命令（每次改动后必跑，全部通过才交付）

```bash
# 目标仓库内
npx eslint . --max-warnings 0      # 含 aiflow 插件规则
npx vitest run
npm run size                       # 若目标仓库有体积预算
npm run whitelist:check            # 若接入三源检查
npm run types:check                # 若接入类型同步
```

### 完成定义（DoD）
- 全部视图 `createPage` 化，仓库内无 react/vue 依赖与框架 import。
- 无内联 style、无白名单外 class、无裸 `addEventListener`。
- aiflow ESLint 0 error；测试全绿；size/whitelist/types 通过。
- 主流程 e2e 覆盖，功能与重构前一致（对照审计报告核对影响点）。

---

## 7. 通用化说明

- 本 skill 面向任意 React/Vue 仓库：`<repo>` 可以是本地路径或已克隆的仓库目录。
- 目标仓库需能引入 aiflow 组件库（`file:` 本地路径或已发布 npm 包）；若为 `file:` 引用，先确认路径可解析。
- 若目标仓库规模极大（>30 个视图），审计报告的决策矩阵若判为"部分迁/高阻塞"，应停止并回报，不强行全量重写。
