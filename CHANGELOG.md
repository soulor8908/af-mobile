# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 约定，版本号遵循语义化版本（SemVer）。

> 早期版本（v1.0.0 ~ v1.3.x）未维护本文件，变更记录自 v1.4.0 起。

## [1.7.0] - 2026-08-26

> **1.6.x 至 1.7.0 首次实际 npm 发布**（v1.5.3/1.6.0 仅本地标记，未推送到 registry，npm 上 latest 仍指向 1.5.2）。本条目汇总自 v1.5.2 以来的累积变更：v1.5.3 懒加载注册 + v1.6.0 k 渲染层子库 + 本次 v1.7.0 视觉改进。

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
