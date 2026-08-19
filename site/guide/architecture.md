# 架构理念

@af-mobile/ui 是一套**分层设计体系**（L1/L2/L3 真组件 + L3.5 block + charts 子库），并内置一套与组件解耦的**运行时**（signal / fetch / router / page / i18n）。整体"一次写作、两处消费"——人类读本文档站，AI 读压缩版 prompt，二者同源。

## 分层总览

| 层 | 内容 | 位置 | 数量 |
|---|---|---|---|
| **L1 Token** | 设计变量（颜色/间距/字号/行高/字重/圆角/阴影/z-index/动效）+ reset + base | `src/tokens.css` | 颜色 `--c-*`、间距 `--s-*`、字号 `--t-*` 等变量族 |
| **L2 配方 + 原子** | 156 个白名单封闭集 class（104 配方 + 52 原子，`btn`/`card`/`p-4` 等） | `src/recipes.css` / `src/atomic.css` | 156 |
| **L3 真组件** | 原生 Custom Elements（`af-list`/`af-dialog`/…），ESM 命名导出 + Tree Shaking | `src/components/` | **30** |
| **L3.5 Block** | 同质化业务大块组件 | `src/blocks/` | **2** |
| **Charts 子库** | 独立入口 `@af-mobile/ui/charts`，SVG 原生图表，不进主包 | `src/charts/` | **5** |

### L1 — Design Token（`src/tokens.css`）

定义全局设计变量，是样式一致性的单一真相源。外层是"主题调色板"（`--palette-*`，light/dark 共享一次定义），内层是对外 token（从调色板派生的 `--c-*`/`--s-*`/`--t-*`/`--r-*` 等）。支持系统暗色自动跟随（`prefers-color-scheme`）与手动 `data-theme="dark"` 切换。tokens.css 由库维护者管理，CI 通过 CODEOWNERS 保护。

### L2 — 配方 + 原子（`src/recipes.css` / `src/atomic.css`）

复合视觉单元的 class 集合：配方如 `.btn` / `.card` / `.list-item`，原子如 `.p-4`。消费端代码被约束在 **156 个白名单 class 封闭集**内，白名单外 class 会触发 ESLint error（见「AI 协作」）。

### L3 — 真组件（30 个 af-\*，`src/components/`）

封装交互行为的原生 Web Components，事件名遵循 `af-{组件}:{动作}` 格式。Light DOM 与 Shadow DOM 组件并存（如 `af-list` 为 Light，`af-dialog`/`af-swiper`/`af-picker` 为 Shadow），支持按需注册与 Tree Shaking。由 `src/index.js` 汇总导出，`register('af-dialog', ...)` 变参按需注册（`registerAll()` 已移除）。

### L3.5 — Block（2 个 af-\*，`src/blocks/`）

同质化的业务级大块，本质是"把多个 L2 配方 + L3 组件组合成一个可复用块"。当前 2 个：`af-product-card`（商品卡片）、`af-setting-group`（设置分组）。

### Charts 子库（5 个 af-chart-\*，`src/charts/`）

独立入口 **不进主包**——不 `import '@af-mobile/ui/charts'` 就零字节加载。SVG 原生渲染 + 2022+ 移动端基线。5 个图表组件：`af-chart-bar` / `af-chart-funnel` / `af-chart-line` / `af-chart-pie` / `af-chart-radar`。注册方式：`import { registerChart } from '@af-mobile/ui/charts';` 或 `registerCharts()` 全量。取色读 `--c-brand/--c-success/--c-warn/--c-danger/--c-muted` token，深色模式免费跟随。

## 运行时能力

组件与运行时在 `src/index.js` 中按需 import（不看类型则不计入组件体积预算），能力各自独立：

| 模块 | 导出（`src/index.d.ts`） | 职责 |
|---|---|---|
| **state / signal** | `signal` / `computed` / `effect` / `batch` / `createRoot` / `untrack` | 细粒度响应式原语：`signal()` 可写信号，`computed()` 自动追踪派生态，`effect()` 订阅副作用，`createRoot()` 级联清理 |
| **fetch** | `fetchPage` / `addInterceptor` / `registerBackend` / `invalidateCache` / `setCacheAdapter` / `localStorageAdapter` / `createResource` | 数据获取主入口：超时/重试/去重/缓存/拦截器，scheme 后端适配器（`scheme://` 分发），`createResource` 桥接信号与异步拉取 |
| **router** | `route` / `go` / `back` / `forward` / `beforeEach` / `afterEach` / `notFound` / `current` / `start` | SPA 路由：History 模式默认，`{ hash: true }` 切 hash 模式；支持守卫/懒加载模块/scrollBehavior |
| **page** | `createPage(PageConfig)` | 页面运行时工厂：state/computed/setup/effects/actions 结构化声明，`mount()` / `unmount()` 生命周期 |
| **i18n** | `t` / `getLocale` / `setLocale` / `initLocale` / `addMessages` / `messages` | 国际化：翻译回退链"当前 locale → zh-CN → key 自身"，语言包可懒加载 |

## 一次写作、两处消费

同一套设计体系的描述，会同时写入两份入口让两端消费：

- **人类读**：本文档站（`site/`），面向开发者理解分层、API 与用法。
- **AI 读**：`prompt/system-prompt.md` —— token 优化的压缩版 System Prompt，注入白名单 + 组件 API + few-shot，按需求裁剪后交给 AI 生成合规页面。

两份内容同源（都由 `scripts/build-prompt.mjs` 从白名单/类型声明/组件源码汇聚），保证人类说"别用白名单外 class"和 AI 遵守的是同一条规则。