# aiflow-ui 迭代计划

> 基于 v1.0.2 审查报告，P0/P1 已全部修复，剩余 P2 项与新组件缺口列入后续迭代。
> 每个迭代项标注：优先级、预估工作量、所属层级、依赖关系。

---

## v1.1.0 — 工程化补全与类型支持

### IP-1 TypeScript 类型声明（P2-1）

- **优先级**：高（影响第三方集成体验）
- **所属层级**：L4 工程化
- **背景**：库被 AI/工程复用，缺 `.d.ts` 导致 TS 项目使用时类型推断丢失
- **范围**：
  - 新增 `src/index.d.ts`，导出所有公开 API（10 组件类 + AfElement 基类 + escapeHtml + initTheme/setTheme/toggleTheme + register/registerAll）
  - 为每个组件的 props、events、methods 定义接口
  - 在 `package.json` 添加 `"types": "./src/index.d.ts"`
- **验收标准**：TS 项目中 `import { AfDialog } from 'aiflow-ui'` 可获得完整类型提示
- **依赖**：无

### IP-2 ESLint 版本锁定与 CI 验证（P2-2）

- **优先级**：中
- **所属层级**：L4 CI
- **背景**：`package.json` 声明 `eslint: ^10.8.1`，需核实该版本是否存在，避免 `npm i` 失败
- **范围**：
  - 核实当前 ESLint 最新稳定版本
  - 若 `^10.8.1` 不存在，降级到实际可用版本并锁定
  - CI 中增加 `npm ci` 可用性验证
- **验收标准**：`npm ci` 在全新环境成功执行
- **依赖**：无

### IP-3 af-tabs 面板渲染优化（P2-4）✅ 已完成

- **优先级**：低
- **所属层级**：L3 组件
- **背景**：slot 静态面板模式下，`_renderPanels` 把 Light DOM 面板 `move` 到容器，可能破坏面板内已绑定的事件/DOM 引用
- **范围**：
  - 评估改用"只读渲染"方案（克隆内容而非搬运节点）
  - 或在文档明确"面板内不要持有点击回调引用，应通过事件委托"
- **验收标准**：面板内按钮的 click 监听在 tabs 渲染后仍可触发
- **依赖**：无
- **状态**：✅ 已采用"原地加 ARIA，不搬运节点"方案（`_buildShell` 保留 slotted 面板，`_renderPanels` slot 模式仅加 ARIA 不 move）。测试 `af-tabs.test.js` 已断言"面板仍在 el 直接子节点中（未被搬到 container）"且"面板内按钮 click 监听仍可触发"

---

## v1.2.0 — 组件覆盖度扩展

### IP-4 af-switch 开关组件（新增）

- **优先级**：高（OPC/电商 H5 高频刚需）
- **所属层级**：L3 新组件
- **背景**：表单场景缺 switch 开关，目前只有 picker 滚轮，表单交互不足
- **范围**：
  - Light DOM，复用 L2 token
  - 属性：checked / disabled / loading / size
  - 事件：`af-switch:change`（bubbles + composed）
  - a11y：role=switch，aria-checked，键盘 Space/Enter 切换
  - 体积预算：≤ 0.5KB gzip
- **验收标准**：通过 L3 规则 + a11y 测试 + 体积预算
- **依赖**：需在 whitelist-v1.json 登记 `af-switch` 组件

### IP-5 af-search-bar 搜索栏组件（新增）

- **优先级**：高
- **所属层级**：L3 新组件
- **背景**：目前只有 `.search-input` 配方，无封装组件；缺清除/防抖/图标
- **范围**：
  - Light DOM，复用 L2 `.search-input` + `.search` 配方
  - 属性：value / placeholder / clearable / debounce（ms）
  - 事件：`af-search-bar:input`（防抖）、`af-search-bar:search`（回车触发）、`af-search-bar:clear`
  - 内置搜索图标 + 清除按钮（SVG inline）
  - 体积预算：≤ 0.6KB gzip
- **验收标准**：防抖生效，清除按钮 a11y 可达
- **依赖**：需在 whitelist-v1.json 登记 `af-search-bar` 组件

### IP-6 af-skeleton-page 整页骨架屏组件（新增）

- **优先级**：中
- **所属层级**：L3 新组件
- **背景**：目前只有 `.skeleton-line` 片段，缺整页骨架屏
- **范围**：
  - Light DOM，组合多个 `.skeleton-line` + `.skeleton-block`
  - 属性：variant（list/detail/profile/card）/ animated
  - 预设 4 种布局变体
  - 体积预算：≤ 0.4KB gzip
- **验收标准**：4 种变体渲染正确，动画流畅
- **依赖**：需在 L2 补 `.skeleton-block` 配方（如不存在）

### IP-7 组件配套：步骤条 / 数字输入 / 倒计时 / 进度条

- **优先级**：低
- **所属层级**：L3 新组件
- **背景**：审查报告提及的 OPC 场景补充控件
- **范围**：按需评估，优先级低于 IP-4/5/6
- **依赖**：无

---

## v1.3.0 — SSR 与可观测性

### IP-8 SSR / hydration 指引（P2-6）✅ 已完成

- **优先级**：中
- **所属层级**：文档
- **背景**：`customElements` + 属性 JSON 在 SSR 下需谨慎，缺官方指引
- **范围**：
  - 在 README 新增"SSR 使用指南"章节
  - 说明 `customElements.define` 在服务端需 polyfill 或条件加载
  - 提供 hydration 模式建议（先渲染 Light DOM 结构，客户端再 upgrade）
  - 标注各组件 SSR 兼容性矩阵
- **验收标准**：文档覆盖主流 SSR 框架（Next.js / Nuxt / Remix）
- **依赖**：无
- **状态**：✅ README §"SSR / Hydration 使用指南"已含核心问题表、客户端条件注册、SSR 预渲染示例（Next.js/Nuxt/Remix）、20 组件 SSR 兼容性矩阵

### IP-9 官方 demo 站 / Storybook（P2-7）

- **优先级**：中
- **所属层级**：工程化
- **背景**："AI 快速开发"场景强烈建议配可视化 Playground
- **范围**：
  - 评估 Storybook vs 自建 demo 站
  - 每个组件提供基础 demo + 可调 props
  - 与 eval 飞轮的 prompts.jsonl 互为补充
- **验收标准**：10 组件均有可交互 demo
- **依赖**：无

### IP-10 slotchange 监听补齐（P2-5 剩余项）✅ 已完成

- **优先级**：低（af-swiper 已完成）
- **所属层级**：L3 组件
- **背景**：af-tabs、af-picker 的 mounted 仅首帧 rAF，动态增删子元素不更新
- **范围**：
  - af-tabs：监听 slotchange，动态增删 tab 时重建 tabbar + panels
  - af-picker：监听 slotchange（若需 slot 模式）
- **验收标准**：动态增删 tab 后 ARIA + 面板同步更新
- **依赖**：无
- **状态**：✅ af-tabs 已用 `MutationObserver`（childList）监听 slotted 面板增删，动态重建 ARIA + 显隐（Light DOM 无 `<slot>` 元素故用 MO 而非 slotchange）；测试 `af-tabs.test.js` §"slotchange 监听（IP-10）"已覆盖。af-picker 为 `columns` 属性数组驱动（无 slot 模式），无需 slotchange

---

## 迭代节奏建议

| 版本 | 目标 | 包含项 |
|---|---|---|
| v1.1.0 | 工程化补全 | IP-1 / IP-2 / IP-3 |
| v1.2.0 | 组件扩展 | IP-4 / IP-5 / IP-6 / IP-7 |
| v1.3.0 | SSR + demo | IP-8 / IP-9 / IP-10 |

> 注：每个版本发布前需通过 CI 全流程（vitest + size-check + whitelist-sync）。

---

## 已完成（v1.0.1 / v1.0.2）

以下审查报告问题已在 v1.0.1 / v1.0.2 修复，不再列入迭代：

- ✅ P0-1 af-backtop 定位失效
- ✅ P0-2 XSS innerHTML 注入（6 组件接入 escapeHtml）
- ✅ P0-3 af-list 无高度失效（新增 height 属性）
- ✅ P0-4 af-dialog 焦点盲区（composed 树遍历）
- ✅ P1-1 af-swiper duration 死属性（接通 CSS 变量）
- ✅ P1-2 af-swiper loop 无缝循环（首尾 clone + 边界瞬移）
- ✅ P1-3 af-list totalCount 默认 Infinity
- ✅ P1-4 af-img thumb/avatar display:block
- ✅ P1-6 主题持久化（initTheme）
- ✅ P1-7 白名单 .active 不一致（移出 L2 白名单）
- ✅ P1-8 af-dropdown 打开移焦
- ✅ P2-3 CSS 导出路径别名（./aiflow-ui.css）
- ✅ P2-5 af-swiper slotchange 监听
