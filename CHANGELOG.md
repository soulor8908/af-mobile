# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 约定，版本号遵循语义化版本（SemVer）。

> 早期版本（v1.0.0 ~ v1.3.x）未维护本文件，变更记录自 v1.4.0 起。

## [1.4.1] - 2026-08-17

### Added
- **脚手架薄壳包 `create-af-mobile`**：npm create 约定入口（`npm create af-mobile <目录名>`），按需下载执行，无需先手动 `npm install`；转发 `@af-mobile/ui` CLI 并默认注入 `create` 子命令，`skill` 子命令原样透传
- 脚手架模板依赖改为 npm 版本号（`^1.4.x`，禁 `file:` 本地依赖），生成工程自动自举 aiflow-grill skill

### Changed
- **skill 安装方式修复**：新增 `aiflow skill add [目录]` 子命令（`npx @af-mobile/ui skill add`），已建项目可补装 / 升级 skill（幂等，默认当前目录）
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
