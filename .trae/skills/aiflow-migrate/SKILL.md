---
name: "aiflow-migrate"
description: "将 React/Vue 项目重构为 aiflow 原生应用。流程：分析技术栈与需求 → 能力覆盖核查 → 反向工程为 aiflow 详细设计/详细技术设计文档 → 按文档当新项目全量重写。当用户要把 React/Vue 项目迁移/重构到 aiflow 组件库时调用。"
---

# aiflow-migrate —— React/Vue → aiflow 原生应用（当新项目重写）

> 核心哲学：**不当映射表翻译、不逐行迁移**。存量项目只作为「需求来源 + 参考实现」。
> 拿到项目：① 分析技术栈 → ② 收集需求（无则从代码反向提取基线）→ ③ 能力覆盖核查 → ④ 反向工程为《详细设计文档 + 详细技术设计文档》→ ⑤ 批准后**把项目当成新项目从零重写**。
>
> 本文档是事实快照（依据 aiflow v2.x 实际实现），与代码冲突时以 `src/` 与 `eslint-plugin-aiflow/` 为准。

---

## 目录

- [0. 两阶段总览与命令](#0-两阶段总览与命令)
- [1. 目标运行模型（事实快照）](#1-目标运行模型事实快照)
- [2. 阶段一 --analyze（只读评估 + 反向设计）](#2-阶段一---analyze只读评估--反向设计)
- [3. 阶段二 --rewrite（当新项目全量重写）](#3-阶段二---rewrite当新项目全量重写)
- [4. 语义对照参考（仅辅助理解，非重写机制）](#4-语义对照参考仅辅助理解非重写机制)
- [5. 反模式清单（每条含"怎么改"）](#5-反模式清单每条含怎么改)
- [6. 自检命令与完成定义（DoD）](#6-自检命令与完成定义dod)
- [7. 决策闸门与通用化说明](#7-决策闸门与通用化说明)

---

## 0. 两阶段总览与命令

| 阶段 | 子命令 | 行为 | 产出 |
|---|---|---|---|
| 分析设计 | `aiflow-migrate --analyze <repo>` | 技术栈分析 + 需求收集 + 能力覆盖核查 + 反向工程设计 | 《能力覆盖矩阵》+《aiflow 详细设计文档》+《aiflow 详细技术设计文档》 |
| 全量重写 | `aiflow-migrate --rewrite <repo> --design <docs> [--out <dir>]` | 按已批准设计文档当新项目从零重写 + L4 约束 + 测试 + 自检 | 可运行的原生应用 |

前置依赖（本 skill 的约束与 API 均来自这些源）：
- `AGENTS.md` —— 库开发 vs 消费端规则边界、反模式、自检命令
- `eslint-plugin-aiflow/` —— 27 条规则；`utils/whitelist-v1.json` 白名单；`utils/aria-requirements.json`
- `src/` —— 28 组件 + 2 blocks + 运行时（state/fetch/resource/router/page/i18n/theme/bind）
- `docs/design/`、`.trae/documents/` —— L1-L4 详设、L3.5 Block 详设

---

## 1. 目标运行模型（事实快照）

### 1.1 消费端五要素（重写产物的唯一形态）

1. **页面**：`createPage({ state, computed, setup, effects, actions, transform, onError, transition, keepAlive })` 实例化 + `page.mount(outlet)`。
2. **视图**：`html\`...\`` 模板字符串（innerHTML）内只出现 **L2 白名单 class + af-* 组件标签**。
3. **绑定**：`:attr="state.x"` / `:attr="derived.x"` / `:attr="refName.x"`（`bind.js` 运行时生效）。
4. **事件**：`effects` 白名单 key 优先；组件事件用 `@event` / 声明式指令（见 1.4）——**须按安装版本验证指令运行时是否接线**，未接线时用 `eslint-disable-next-line wc-no-addeventlistener` + 理由监听。
5. **无框架**：不引入 react/vue；业务核为框架无关 TS/JS。

### 1.2 运行时 API 快照（`@af-mobile/ui` 命名导出）

| 域 | API |
|---|---|
| 响应式 | `signal` `computed` `effect` `batch` `createRoot` `getOwner` `untrack` |
| 数据 | `fetchPage` `FetchError/TimeoutError/HttpError/AbortError` `addInterceptor/removeInterceptor` `invalidateCache/clearCache` `setCacheAdapter` `localStorageAdapter` `createResource` |
| 路由 | `route` `go` `back` `forward` `beforeEach` `afterEach` `notFound` `current` `start` `RouterError` |
| 页面 | `createPage` `destroyPage` |
| i18n | `t` `getLocale` `setLocale` `initLocale` `addMessages` `messages` |
| 主题 | `getTheme` `setTheme` `toggleTheme` `initTheme` |
| 基础 | `AfElement` `escapeHtml` `html` `register` `registerAll` |

- **createPage 9 原语**：`state`（字段→signal）/ `computed`（`(s)=>…` 纯函数自动追踪）/ `setup`（命令式初始化，**返回值挂 `refs`**，如 `createResource` 结果）/ `effects` / `transform` / `actions`（`(s,…args)=>…`，batch 包裹）/ `onError` / `transition` / `keepAlive`。
- **effects 白名单 key**：`mount` `unmount` `route` `online` `offline` `visible` `hidden` `storage` `interval` `resize` `themechange` `localechange`。（`mount` 回调以 `queueMicrotask` 延迟执行；`route` 订阅 `router.afterEach`；`interval` 传 `[ms, cb]`。）
- **路由 API**：`route(path, handler, { children, keepAlive, scroll, meta })`；handler 返回 `void | string(子 outlet 选择器) | () => import(...)`；ctx 为 `{ outlet, signal, go }`；`start({ outlet, scrollRestoration, keepAliveMax, base, scrollBehavior })`。

### 1.3 组件清单（28）+ Blocks（2）

**L3 组件**：`af-list`(虚拟滚动/加载更多/下拉刷新) `af-swiper` `af-tabs` `af-dialog` `af-toast`(单例) `af-action-sheet` `af-picker` `af-cascade-picker` `af-dropdown` `af-img`(懒加载) `af-backtop` `af-badge` `af-calendar` `af-switch` `af-search-bar` `af-skeleton-page` `af-upload` `af-navbar` `af-tabbar` `af-stepper` `af-field`(表单) `af-pull-refresh` `af-swipe-cell` `af-rate` `af-notice-bar` `af-progress` `af-steps` `af-countdown`

**L3.5 Block**：`af-product-card` `af-setting-group`（Light DOM、五态、props 2-5、`af-{block}:{action}` 事件）

### 1.4 `:bind` 语法与指令

`bind.js` 运行时支持（`bindOne` → `effect` → `setAttribute/removeAttribute`）：

```
:attr="state.xxx"       状态（支持点路径）
:attr="derived.xxx"     派生
:attr="refName.xxx"     af-data ref（data-ref.js 注册表）
:attr="<bool>"          true→setAttribute('') / false→removeAttribute
:attr="<object>"        JSON.stringify
```

声明式指令（`wc-bind-syntax` 规则放行，**运行时接线须按安装版本验证**）：
`redirect:/path` / `toast:$msg` / `setState:k=v` / `action:fn` / `dialog:id`

### 1.5 白名单封闭集（`whitelist-v1.json`，三源同步）

| 集 | 内容 | 说明 |
|---|---|---|
| recipe class | btn*/card/cell/list-item*/input/form-row*/skeleton*/tag*/step*/toast/upload-grid…（约 108） | L2 配方 |
| atomic class | p-*/m-*/g-*/f fc aic jcc jcsb jce flex-1 w-full / r-*/t-*/text-*/bg-*/shadow-*（约 53） | L2 原子 |
| components | 28 个 af-* 标签（`token-whitelist` 规则放行 `af-data`） | L3 + L3.5 |
| tokens | `--c-* --s-* --r-* --t-* --lh-* --fw-* --shadow-* --z-* --ease-* --dur-*` + palette | L1 |
| forbiddenInlineStyle | color background background-* padding* margin* font-size border-radius box-shadow | L1-2 |

> 消费端只用白名单 class；自定义视觉类走 `data-role` + recipes.project.css，或登记 extraClass。新增即三源同步：CSS/JS ↔ whitelist ↔ prompt（`npm run whitelist:check`）。

### 1.6 约束规则（27 条，`eslint-plugin-aiflow`）

- **L1(2)** `no-token-modification` `no-inline-style` → error
- **L2(7)** `token-whitelist` `no-recipe-break` `no-arbitrary-value` `no-tailwind-syntax` `prefer-component` `no-variant-conflict` `atomic-duplicate`
- **L3(6)** `wc-light-no-style` `wc-shadow-use-token` `wc-event-naming` `wc-aria-required` `wc-part-naming` `wc-cleanup`
- **L3.5(12)** `no-register-all` `wc-bind-syntax` `wc-block-no-internal-ref` `wc-block-props-count` `wc-block-states` `wc-block-variant-enum` `wc-definepage-single` `wc-effects-whitelist` `wc-no-addeventlistener` `wc-pure-function` `wc-state-schema` `wc-transform-pure`

消费端适用：`no-inline-style`/`token-whitelist`/`wc-bind-syntax`/`wc-no-addeventlistener`/`wc-definepage-single`/`wc-effects-whitelist`/`wc-pure-function`/`wc-state-schema`/`wc-transform-pure`/`no-register-all` 等；库源码适用 `wc-light-no-style`/`wc-shadow-use-token` 等（边界见 AGENTS.md §3）。

---

## 2. 阶段一：`--analyze`（只读评估 + 反向设计）

> 只读，不写业务码。产出三份文档，评审批准后进入阶段二。

### 2.1 技术栈分析

逐项读取并输出表格：

| 维度 | 要点 |
|---|---|
| 框架 | React 18/19 或 Vue 2/3；入口（main.tsx/main.js）；构建（vite/webpack） |
| 路由 | react-router / vue-router 版本、路由表规模、守卫、嵌套、keep-alive |
| 状态 | zustand/redux/pinia/自定义 store；**是否框架无关**（无 react/vue import） |
| 样式 | CSS Modules / Tailwind / styled-components / scoped style；**内联 style 用量** |
| 依赖 | UI 库、图表、聊天 SDK、worker、加密、本地存储；哪些是独立包 |
| 运行时能力 | SPA? PWA/离线? 加密存储? 服务端? —— 决定重写范围与缺口 |

### 2.2 需求收集 / 反向提取需求基线

- 优先用存量需求文档：PRD / 需求文档 / 产品文档 / README / 设计稿 / 历史审计报告。
- 无存量文档时，从代码反向提取《需求基线》：每个功能点的 **输入 / 输出 / 规则 / 边界 / 异常**，落到页面维度。**这是后续两份设计文档的事实依据。**

### 2.3 能力覆盖核查（→《能力覆盖矩阵》）

把项目所需能力逐项对照 1.2-1.6：

```
能力项 | 原实现 | aiflow 覆盖（组件/原语/class） | 覆盖状态(完全/部分/缺口) | 缺口对策
```

**缺口对策决策树**（按成本从低到高）：

```
需要"静态视觉形态"且能用现有 recipe/atomic 组合 → data-role + recipes.project.css 组合（零白名单膨胀）
需要"项目专属静态配方"（大头像/带图标搜索框）    → recipes.project.css 扩展 + extraClass 登记
需要"有状态业务单元、可复用、无全局交互"        → 新增 Block（src/blocks/，见 §3.4）
需要"通用可复用交互组件"（滚动/手势/弹层内核）    → 新增 af-* 组件（遵循 L3 组件规范）
能力完全缺失且成本高（图表/复杂画布等）          → 原生交互替代 / 降级方案，并列入风险
```

**闸门**：存在"关键能力缺口且无法低成本补足"→ 停下回报，不强推重写。

### 2.4 反向工程 → 两份设计文档

以「需求基线 + 原代码实现」为依据（参考其**需求语义**，不抄其框架写法）。

**《aiflow 详细设计文档》**（产品/功能视角）：
- 页面清单与导航结构（对应路由表）
- 每页功能规格：状态、交互、数据流、事件、边界/异常
- 弹层/命令式流程、加载/空/错误态、a11y 要点

**《aiflow 详细技术设计文档》**（实现视角）：
- 每页 `createPage` 结构：state 字段 / computed / setup(refs) / effects(key) / actions 签名
- 组件选型：每块 UI 用哪个 af-* / block；列表 `af-list`(data+renderItem+分页)；弹层 `af-dialog`/`af-action-sheet`；表单 `af-field`+校验
- 数据层：外部 store 如何桥接（§3.2）；`:bind` 绑定哪些 `state.*`；`createResource` 用在哪个 setup
- 路由表、i18n 文案、主题 token 重映射、样式（recipes/atomic + data-role）
- 独立包（如聊天 SDK）集成方式；能力缺口对策的落地设计

### 2.5 评审

用《能力覆盖矩阵》+ 两份文档与用户对齐；批准后才进入 `--rewrite`。

---

## 3. 阶段二：`--rewrite`（当新项目全量重写）

> 前置：已批准的设计文档。**参考原代码的"需求语义"，不参考其 React/Vue 写法。**

### 3.1 工程初始化

```bash
# 依赖（以包发布路径为准）
npm i @af-mobile/ui @af-mobile/eslint-plugin
```

```js
// 入口 main.js
import { registerAll, start, initTheme, initLocale } from '@af-mobile/ui';
import '@af-mobile/ui/src/recipes.css';   // 具体 CSS 路径以安装包为准
import '@af-mobile/ui/src/atomic.css';
import '@af-mobile/ui/src/tokens.css';

registerAll();          // 或 register('af-list') 按需
initTheme();            // 先于组件挂载
initLocale();
start({ outlet: '#app', scrollRestoration: true });
```

```js
// 路由表 app.routes.js
import { route, go, notFound } from '@af-mobile/ui';
route('/',       () => import('./pages/home.js'),  { keepAlive: true });
route('/tx/:id', () => import('./pages/tx-detail.js'));
route('/settings', () => import('./pages/settings.js'), { transition: 'slide' });
notFound(() => go('/'));
```

### 3.2 数据层桥接（外部 store → aiflow 响应式）

业务核（core/）框架无关即可原样复用。桥接三条：

1. **事件桥（推荐）**：store 提供 `onChange`/订阅 → 写入 `page.state` 字段，`:bind`/`computed` 自动响应。
2. **资源桥**：`createResource(source, fetcher)` 在 `setup` 中创建（结果挂 `refs`），`source` 变化自动重取。
3. **命令桥**：`actions` 只转发业务命令到 core（业务不写进页面 state 逻辑）。

```js
// 数据桥示例
setup(s) {
  const res = createResource(s.tab, (tab) => fetchPage(`/api/transactions?tab=${tab}`));
  const unsub = store.onChange((snap) => { s.items = snap.items; s.loading = false; });
  return { res, unsub };                 // 挂 refs，unmount 时清理
},
effects: {
  unmount: () => page.refs.unsub?.(),
},
```

### 3.3 页面实现模式库

**页面骨架（createPage + :bind + 白名单 class）**

```js
// pages/transactions.js —— 页面模块 default 导出渲染函数
import { createPage, createResource, fetchPage, html } from '@af-mobile/ui';
import { store } from '../core/store.js';

export default function (params, ctx) {
  const page = createPage({
    state: { tab: 'month', items: [], loading: true, keyword: '' },
    computed: {
      total: (s) => s.items.reduce((a, b) => a + (b.amount || 0), 0),
    },
    setup(s) {
      const res = createResource(s.tab, (t) => fetchPage(`/api/tx?tab=${t}`, { cache: true }));
      const unsub = store.onChange((snap) => { s.items = snap.items; s.loading = false; });
      return { res, unsub, listEl: null };
    },
    effects: {
      mount: () => store.load(),
      unmount: () => page.refs.unsub?.(),
      route: (p) => store.load(p.id),
      interval: [30000, () => store.refresh()],
      online: () => store.refresh(),
    },
    actions: {
      // 业务转发 core；若页面用 declarative 指令，需确认运行时接线
      remove(s, id) { store.remove(id); },
      setKeyword(s, v) { s.keyword = v; },
    },
    onError: (err) => { /* toast / 空态 */ },
  });

  ctx.outlet.innerHTML = html`
    <div class="page">
      <af-navbar title="账单"></af-navbar>
      <af-tabs :tabs="state.tabs" :active-index="state.tabIndex"></af-tabs>
      <div class="card p-4">
        <div class="title">本月支出 <span class="price" :text="derived.total"></span></div>
      </div>
      <af-list :data="state.items" :loading="state.loading" id="txList"></af-list>
      <af-toast id="toast"></af-toast>
    </div>`;
  page.mount(ctx.outlet);

  // 函数型 props 与组件事件：refs + 监听（组件事件如需监听，用 disable 注释并给理由，
  // 或确认安装版本的 bind.js 支持 @event/action: 指令后改用声明式）
  const list = ctx.outlet.querySelector('#txList');
  list.renderItem = (item) => html`<div class="list-item"><div class="body">${item.title}</div><div class="caption t-right">${item.amount}</div></div>`;
  page.refs.listEl = list;
  return page;
}
```

**常用模式**（每个页面参照此核对）：
- **列表**：`af-list` + `data` + `renderItem` + `totalCount/pageSize` + `endLoadMore(hasMore)`；下拉刷新 `refresh` + `endRefresh()`。
- **弹层**：`af-dialog`（`open`/`close(action)`，`af-dialog:close` detail.action=confirm/cancel）与 `af-action-sheet`（`showPopover`/`hidePopover`）。
- **轻提示**：全局单例 `<af-toast>` + `toast.show(msg)`。
- **表单**：`af-field`（label/type/inputType/error/`setError`）+ `af-switch`/`af-stepper`/`af-picker`/`af-cascade-picker`/`af-upload`。
- **五态**：loading（`af-skeleton-page`/`.skeleton-line`）→ error（`.empty`+重试）→ empty（`.empty`）→ success；`aria-busy` 切换。
- **导航**：`af-navbar`（`af-navbar:back`）/ `af-tabbar`（`af-tabbar:change`）。
- **分页容器**：`af-pull-refresh` 包裹 + `af-list`。
- **i18n**：`addMessages(locale, dict)` + `t(key, vars)`；组件文案走 `static i18n` 映射。
- **主题**：`initTheme()`；深色适配靠 token `var(--c-*)` 自动。

### 3.4 能力缺口落地（新增 Block/组件）

判定见 2.3 决策树。新增 Block 遵循（参考 `src/blocks/af-setting-group.js`）：
- `extends AfElement`，默认 Light DOM（复用 recipe class）。
- `defineProp` 声明 props，**2-5 个**（`wc-block-props-count`）。
- **五态**：loading/error/empty/success（`wc-block-states`），`data-role` 标记内部节点。
- **事件**：`af-{block}:{action}`，`emit` 含 `composed:true`；detail schema 文档化。
- 内部只用 af-* + recipe class + data-role；**不暴露内部 ref 给消费端**（`wc-block-no-internal-ref`）。
- a11y + 键盘导航 + `prefers-reduced-motion` + `unmounted()` 清理。

### 3.5 L4 约束落地

```js
// eslint.config.js（消费端 UI 代码启用 AI 规则集）
import aiflow from '@af-mobile/eslint-plugin';
export default [
  { ignores: ['dist/**', 'core/**'] },          // core 是业务核，不套 UI 约束
  { files: ['src/**/*.js'], plugins: { aiflow }, rules: {
      ...aiflow.configs.recommended.rules,
      'aiflow/token-whitelist': ['error', {
        extraClass: ['avatar-lg', 'search-with-icon'],   // 项目级扩展登记
        extraComponents: ['af-qrcode'],
        allowProjectTokens: true,
      }],
  } },
];
```

```yaml
# .github/workflows/ci.yml（关键步骤，照搬 aiflow 仓库模式）
- run: npx eslint src/ --max-warnings 0
- run: npm run whitelist:check        # 三源同步
- run: npm run size                   # 体积预算
- run: npx vitest run
```

### 3.6 测试

- 业务核：原单测保留（`core/**` 不动）。
- 组件 DOM 测试：jsdom + 自定义元素（`customElements.define` + 属性/事件断言）。
- e2e：playwright 覆盖主流程（进入 → 列表 → 详情 → 表单提交 → 弹层），对照《需求基线》逐条核对。

---

## 4. 语义对照参考（仅辅助理解，非重写机制）

> 重写一律按设计文档从零写；下表只在 `--analyze` 阶段把 React/Vue 语义翻译成 aiflow 语义，便于理解原实现意图。

### React
| React | aiflow 语义 |
|---|---|
| `useState(x)` | `state: { x }`（`s.x` 读 / `s.x = v` 写） |
| `useEffect(fn, [deps])` | `effects.mount / route / unmount / visible / interval...` |
| `useRef` | `setup` 返回值挂 `page.refs`（或 `data-ref`） |
| `useMemo / useCallback` | `computed` / `actions` |
| `useReducer` | `actions`（`(s, ...args)`，batch 包裹） |
| `onClick` / 事件 | `effects` / `@event` / 声明式指令；组件事件见 3.3 |
| `className="x"` | 白名单 class；自定义用 `data-role` + recipes.project.css |
| `style={{...}}` | 禁止 → recipes class / `--css-var` |
| `createPortal` / 命令式 modal | `af-dialog` / `af-action-sheet` / `af-toast` |
| Context/Provider | `createPage` 页面作用域 + store 单例 |
| 路由（react-router） | `route/go/back/beforeEach/afterEach/start/keepAlive/transition` |
| store 订阅 | `setup` + 事件桥写 `state.*` |

### Vue
| Vue | aiflow 语义 |
|---|---|
| `ref/reactive` | `state` |
| `computed` | `computed` |
| `watch` | `effects`（白名单 key） |
| `v-model` | 表单组件 `:bind` + change 事件写回 `state.*` |
| `v-for` | `af-list` `data` + `renderItem` |
| `v-if/v-show` | `state` 条件渲染 / 组件五态 |
| template + scoped style | `html\`...\`` + recipes/atomic class |
| `v-on/$emit` | `@event` / `af-{组件}:{action}` |

---

## 5. 反模式清单（每条含"怎么改"）

1. **用户输入插 innerHTML 不转义** → 一律 `escapeHtml()` 或 `html\`...\`` 模板（`${{raw}}` 显式可信）。
2. **动画无 reduced-motion 覆盖** → 每个含 transition/animation 的 CSS 末尾加 `@media (prefers-reduced-motion: reduce){...}`。
3. **模态无焦点陷阱/还原** → `open()` 存 `document.activeElement`，`close()` 还原。
4. **列表无键盘导航** → 容器 `tabindex="0"` + Arrow/Enter。
5. **ARIA 声明与检测不同步** → 改 `aria-requirements.json` 必同步 `wc-aria-required.js`。
6. **JSON.parse 不包 try-catch** → `try{ return JSON.parse(...) }catch{ return def }`。
7. **Light DOM 组件内联 style/`<style>`** → 用 recipe class + `data-role`（`wc-light-no-style`）。
8. **新 class 未同步白名单三源** → CSS/JS ↔ whitelist ↔ prompt（`npm run whitelist:check`）。
9. **CI 的 ESLint 漏目录** → `npx eslint src/ test/ scripts/ --max-warnings 0`。
10. **布尔 setter false 不 removeAttribute** → `defineProp` Boolean 分支：true set / false remove。
11. **消费端裸 `addEventListener`** → 用 `effects` / `@event`；确需时 `// eslint-disable-next-line wc-no-addeventlistener` + 理由。
12. **事件名不合 `af-{组件}:{action}` 或 emit 无 composed** → 按 L3-4 规范命名。
13. **错误态无 `aria-live`** → 加载/错误/结果区加 `aria-live="polite"`（参考 af-setting-group）。

---

## 6. 自检命令与完成定义（DoD）

```bash
# 目标仓库内
npx eslint src/ test/ scripts/ --max-warnings 0   # 含 aiflow 插件
npx vitest run
npm run size                                       # 有体积预算时
npm run whitelist:check                            # 接入三源检查时
npm run types:check                                # 接入类型同步时
```

**DoD**
- 已批准《能力覆盖矩阵》+《详细设计文档》+《详细技术设计文档》。
- 全部页面按设计文档 `createPage` 化从零实现；仓库无 react/vue 依赖与框架 import（业务核除外）。
- 能力覆盖矩阵缺口均已落地（新增组件/block 遵循库开发规范）。
- 无内联 style、无白名单外 class、无裸 `addEventListener`（除理由注释）。
- aiflow ESLint 0 error；测试全绿；size/whitelist/types 通过。
- 主流程 e2e 覆盖，行为与《需求基线》一致。

---

## 7. 决策闸门与通用化说明

**闸门（任一不满足即停）**
1. `--analyze` 未出齐三份文档 → 不写码。
2. 能力覆盖矩阵有关键缺口且无低成本对策 → 回报，不强推。
3. 需求基线不完整（核心功能无输入/输出/边界定义）→ 先补基线。
4. 重写中任一自检失败 → 修复，不允许绕过（测试夹具除外）。

**通用化**
- `<repo>` 为本地路径或已克隆仓库目录；`--out` 指定重写输出目录（默认原地重写）。
- 目标仓库需能引入 aiflow 组件库（`file:` 本地路径或已发布 npm 包）；`file:` 引用先确认路径可解析。
- 本文档为 aiflow v2.x 事实快照：运行指令（`@event`/`action:`/`redirect:`）与组件 API 以**实际安装版本**的 `bind.js`/`index.d.ts` 为准，使用前先验证。
