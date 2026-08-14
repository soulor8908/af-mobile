---
name: "aiflow-migrate"
description: "将 React/Vue 项目重构为 aiflow 原生应用。流程：分析技术栈与需求 → 能力覆盖核查 → 反向工程为 aiflow 详细设计/技术设计文档 → 按文档当新项目全量重写。当用户要把 React/Vue 项目迁移/重构到 aiflow 组件库时调用。"
---

# aiflow-migrate —— React/Vue 项目 → aiflow 原生应用（当新项目重写）

核心哲学：**不当映射表翻译、不逐行迁移**。存量项目只作为「需求来源 + 参考实现」：
先分析技术栈与需求，核查 aiflow 能力是否全覆盖，把「原需求文档 + 实际代码实现」反向工程为 aiflow 的**详细设计文档 + 详细技术设计文档**，然后**把项目当成新项目从零重写**。

目标运行模型：
- **消费端 = `createPage`（state/computed/setup/effects/actions）+ `:bind` + 原生 `<af-*>` 组件 + L2 白名单 class**
- **无框架运行时**：不保留 react/vue 依赖，组件本身是无框架 Web Component，库自带 state.js / router.js / bind.js / data-ref.js / fetch.js / i18n.js / theme.js

两个阶段，通过子命令区分：

| 阶段 | 子命令 | 行为 | 产出 |
|---|---|---|---|
| 分析设计 | `aiflow-migrate --analyze <repo>` | 技术栈分析 + 需求收集 + 能力覆盖核查 + 反向工程设计 | 《能力覆盖矩阵》+《aiflow 详细设计文档》+《aiflow 详细技术设计文档》 |
| 全量重写 | `aiflow-migrate --rewrite <repo> --design <docs> [--out <dir>]` | 按已批准设计文档当新项目从零重写 + L4 约束 + 测试 + 自检 | 可运行的原生应用 |

前置：本 skill 依赖 aiflow 仓库的约束体系（`AGENTS.md` 反模式清单、`eslint-plugin-aiflow`、`src/recipes.css`/`atomic.css`/`tokens.css`、白名单 `whitelist-v1.json`）。目标仓库需能以 `file:` 或已发布包方式引入 aiflow 组件库与 `@af-mobile/eslint-plugin`。

---

## 1. 铁律（全流程不可违反）

1. **先文档后代码**：设计文档未批准，不进入重写。
2. **业务核当作需求/算法来源**：框架无关的纯 TS/JS 逻辑（store/engine/parser/领域算法）保留复用，但**不照抄原 UI 结构**。
3. **XSS 转义**：用户可控文本插入 innerHTML 前必须 `escapeHtml()` 或 `html\`...\`` 模板。
4. **禁内联 style**：`style="..."` 与 `style={{...}}` 一律禁止，改 recipes/atomic class 或 `--css-var` 自定义属性。
5. **白名单封闭集**：class 只能用 `whitelist-v1.json` 内 class；自定义视觉类走 `data-role` + recipes.css 宿主规则，或登记白名单三源（CSS + whitelist + prompt）。
6. **事件命名**：`af-{组件}:{动作}`，`emit` 带 `composed: true`。
7. **ARIA 必需**：满足 `eslint-plugin-aiflow/utils/aria-requirements.json` 声明的必需属性。
8. **每次改完跑自检**（见 §6），不允许 `eslint-disable` 绕过（测试夹具例外）。

---

## 2. 阶段一：`--analyze` 分析设计（只读）

### 2.1 技术栈分析
- 框架/版本（React 18/19、Vue 2/3）、入口（main.tsx/main.js）、构建工具（vite/webpack）、路由、状态管理、样式方案、依赖清单（UI 库/SDK/worker）。
- 运行时能力画像：SPA？多页？SSR？PWA？本地优先/离线？加密存储？——决定 aiflow 能力核查与重写范围。

### 2.2 需求文档收集
- 优先找存量需求文档：PRD / 需求文档 / 产品文档 / README / 设计稿 / 历史审计报告。
- 若无存量文档：从实际代码实现**反向提取需求基线**——每个功能点的输入/输出/规则/边界/异常，整理成《需求基线》作为后续设计依据。

### 2.3 能力覆盖核查（技术栈 → aiflow）
- 把项目所需 UI/交互/运行时能力逐项对照 aiflow：af-* 组件、L3.5 block、L2 recipes/atomic class、运行时原语（state/router/bind/data-ref/fetch/i18n/theme）、L4 约束。
- 产出《能力覆盖矩阵》：每项能力 → 覆盖组件/原语 → 覆盖状态（完全 / 部分 / 缺口）→ 缺口对策（新增组件 / 新增 block / data-role 组合 / 降级方案）。
- **这是"能否重写"的闸门**：存在关键能力缺口且无法低成本补足时，停下回报，不强推。

### 2.4 反向工程 → 设计文档
以「原需求文档 + 实际代码实现」为依据，反向产出两份文档：

**《aiflow 详细设计文档》**（产品/功能视角）：
- 页面清单与导航结构（对应 router 路由表）
- 每页功能规格：状态、交互、数据流、事件、边界/异常条件
- 弹层/命令式流程、加载/空/错误态、a11y 要点

**《aiflow 详细技术设计文档》**（实现视角）：
- 每页 `createPage` 结构：state / computed / setup / effects / actions 的字段与职责
- 组件选型：哪个视图用哪个 af-* / block；列表用 `af-list`（data + renderItem）；弹层用 `af-dialog`/`af-action-sheet`；表单用 `af-field`/`af-switch` 等
- 数据层：store 单例如何被 effect/computed 订阅；`:bind` 绑定 `state.*`
- 路由表、i18n 文案、主题 token 重映射、样式（recipes/atomic class + data-role）
- 独立包（如聊天 SDK）集成方式；能力缺口对策的落地设计

### 2.5 评审
- 用《能力覆盖矩阵》+ 两份设计文档与用户对齐，批准后进入重写。未批准不写码。

---

## 3. 阶段二：`--rewrite` 当新项目全量重写（写码）

前置：有已批准的设计文档（`--design`）。**重写时参考原代码的「需求语义」，不参考其 React/Vue 写法。**

1. **工程初始化**：新建/重置入口（`main.js` + `start({ outlet })`）、引入 aiflow 组件库 CSS（recipes/atomic/tokens）、按技术设计文档建路由表。
2. **数据层**：按技术设计文档组织 store（复用/抽取框架无关逻辑），确认订阅接口（onChange/事件）供 aiflow `effect` 消费。
3. **逐页实现**：严格按《详细技术设计文档》从零实现每个页面（createPage + af-* + 白名单 class + `:bind`），五态齐全（loading/error/empty/success），弹层/命令式用 `af-dialog`/`af-action-sheet`。
4. **能力缺口落地**：按能力覆盖矩阵的"缺口对策"实现新增组件/block（遵循 aiflow 库开发规范，见 §6 与 AGENTS.md §3/§4）。
5. **落地 L4 约束**：安装注册 `@af-mobile/eslint-plugin`，UI 代码启用完整 AI 规则集；接入白名单三源检查（CSS ↔ whitelist.json ↔ prompt）与 CI 闸门（照搬 aiflow 仓库 `.github/workflows/ci.yml` 模式）。
6. **测试**：核心逻辑单测 + 组件 DOM 测试（jsdom + 自定义元素）+ playwright e2e 覆盖主流程（登录/记账/查询/设置等关键路径）。
7. **自检 + DoD**（§6）。

---

## 4. 语义对照参考（仅帮助理解原代码含义，**非**重写机制）

> 重写一律按设计文档从零写；下表只在分析阶段用于把 React/Vue 语义翻译成 aiflow 语义，方便理解原实现意图。

### React
| React | aiflow 语义 |
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
| Vue | aiflow 语义 |
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
- 已产出且批准《能力覆盖矩阵》+《aiflow 详细设计文档》+《详细技术设计文档》。
- 全部页面按设计文档 `createPage` 化从零实现，仓库内无 react/vue 依赖与框架 import。
- 能力覆盖矩阵中的缺口均已落地（新增组件/block 遵循库开发规范）。
- 无内联 style、无白名单外 class、无裸 `addEventListener`。
- aiflow ESLint 0 error；测试全绿；size/whitelist/types 通过。
- 主流程 e2e 覆盖，行为与需求基线一致。

---

## 7. 通用化说明

- 本 skill 面向任意 React/Vue 仓库：`<repo>` 可以是本地路径或已克隆的仓库目录；`--out` 指定重写输出目录（默认原地重写）。
- 目标仓库需能引入 aiflow 组件库（`file:` 本地路径或已发布 npm 包）；若为 `file:` 引用，先确认路径可解析。
- 若能力覆盖核查判为"有关键缺口且无法低成本补足"，或需求基线不完整，应停下回报，不强行重写。
