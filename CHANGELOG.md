# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 约定，版本号遵循语义化版本（SemVer）。

> 早期版本（v1.0.0 ~ v1.3.x）未维护本文件，变更记录自 v1.4.0 起。

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
- **首个 npm 发布补全**：新增并发布 `@af-mobile/mcp@1.0.0`（MCP Server）、`@af-mobile/prompt@2.0.0`（System Prompt builder）、`@af-mobile/adapters@0.1.0`（supabase scheme 适配器）
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
