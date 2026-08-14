# AIFlow UI —— L4 AI 约束层详细设计

> 本文档覆盖 L4 AI 约束层的总体设计：三层防线、115 白名单封闭集、System Prompt 骨架、15 条 ESLint 规则、自动修正 3 轮流程、项目级扩展机制、CI 保护链路。
>
> 范围：AI 代码生成的约束系统（Prompt + ESLint + CI 纵深防御）。
> L1 Token / L2 配方原子 / L3 真组件另见对应文档。

---

## 目录

- [0. 概述：三层防线机制](#0-概述三层防线机制)
- [1. 白名单封闭集：154 类 + 20 组件](#1-白名单封闭集154-类--20-组件)
- [2. System Prompt 骨架（结构 + 生成参数 + 动态注入）](#2-system-prompt-骨架结构--生成参数--动态注入)
- [3. ESLint 插件：15 条规则完整定义](#3-eslint-插件15-条规则完整定义)
- [4. AI 代码生成修正流程（4 步 · 最多 3 轮）](#4-ai-代码生成修正流程4-步--最多-3-轮)
- [5. 项目级扩展机制](#5-项目级扩展机制)
- [6. CI 保护链路（PR 三步 + 发布阶段附加检查）](#6-ci-保护链路pr-三步--发布阶段附加检查)
- [7. 附录：Prompt 模板 + ESLint 配置 + CI YAML 源码](#7-附录prompt-模板--eslint-配置--ci-yaml-源码)
- [设计决策索引](#设计决策索引)

---

## 0. 概述：三层防线机制

### 0.1 L4 的位置（四层分层对照）

| 层 | 内容 | 防护方式 | 阻断位置 |
|---|---|---|---|
| L1 | Token（43 变量） | `no-token-modification` + `no-inline-style` | ESLint error |
| L2 | 配方 102 + 原子 52 = 154 类 | `token-whitelist` + `no-recipe-break` + 覆盖矩阵 | ESLint error/warn |
| L3 | 20 个真组件（WC） | `wc-light-no-style` + `wc-shadow-use-token` + `wc-event-naming` 等 | ESLint error |
| **L4** | **AI 约束层** | **Prompt 引导 + ESLint 兜底 + CI 保护** | **Prompt 第一道 + ESLint 第二道 + CI 第三道** |

### 0.2 三层防线流程

```
AI 生成代码请求
    │
    ▼  第 1 道防线（事前 · Prompt 引导）
System Prompt（154 白名单 + 25 条禁令 + 5 正反示例 + 项目级扩展）
temperature = 0.1（极低，白名单确定性空间无需创意）
    │  通过 → 生成合规代码
    │  泄露 → 生成不合规代码
    ▼  第 2 道防线（事后 · ESLint 阻断 + 自动修正 3 轮）
ESLint plugin-aiflow（15 规则：10 error + 5 warn，5 条可自动修）
    ├─ 自动修复（fixable 规则）：--fix diff
    ├─ 非自动修复：错误信息 + 正例 → 构造修正 Prompt → AI 重写违规点
    ├─ 最多循环 3 轮 →
    │  └─ 3 轮失败：代码末尾打注释 + 告警 + error 不进生产
    │  0 error → 通过
    ▼  第 3 道防线（发布前 · CI 保护）
CI Pipeline
    ├─ Step 1：白名单同步检查（CSS/JS ↔ whitelist.json ↔ Prompt，双向 diff）
    ├─ Step 2：体积检查（L1+L2 ≤ 4.2KB；L3 ≤ 10.5KB）
    └─ Step 3：CODEOWNERS（关键文件改动需维护者 approve）
    │
    ▼
生产发布
```

**决策 D0**：三层纵深防御。单层失效，下一层兜底。不依赖任何单一机制。

### 0.3 四层预算汇总（供 CI Step 2 参考）

| 层 | 预算 gzip | 说明 |
|---|---|---|
| L1 + L2 CSS | ≤ 8.0KB | 43 变量 + 102 配方 + 52 原子（含 prefers-reduced-motion + palette 抽象 + 宿主样式） |
| L3 JS（20 组件+基类） | ≤ 19.5KB | ESM 命名导出 + Tree Shaking（含完整 ARIA/键盘，详 L3 §1.4） |
| L3 JS（按需 2 组件） | ≤ 5.5KB | Tree Shaking 效果验证（worst-case 2 大组件） |
| L3 单组件 JS | ≤ 2.6KB | 单组件体积约束（CSS 计入 L1+L2 总预算） |
| 基类 AfElement | ≤ 1.2KB | 所有组件共享的基础（含 html/escapeHtml XSS 防护） |

---

## 1. 白名单封闭集：154 类 + 20 组件

### 1.1 完整清单（合计 154 class + 20 组件）

> 以下为示意分组，**实际清单以 `npm run whitelist` 生成的 `whitelist-v1.json` 为准**（由 `gen-whitelist.mjs` 扫描 `src/**/*.css` + `src/index.js` 自动提取）。文档手敲清单可能滞后于源码，分歧时以 CI `whitelist:check` 为准。

**L2 配方（62）**

```
[按钮 7]     btn btn-sm btn-lg btn-ghost btn-danger btn-success btn-block
[容器 5]     page card cell center sheet
[文本 7]     title subtitle body caption meta price price-del
[表单 8]     label input textarea form-row form-row-h form-err search-input input-err
[列表 6]     list list-item list-item-compact divider thumb avatar
[反馈 9]     empty skeleton skeleton-line tag tag-ok tag-warn tag-danger badge toast
[导航 5]     navbar navbar-fixed tabbar tabbar-fixed tab-item
[布局 5]     hero stats-grid actions input-bar checkout-bar
[状态修饰符 1] active
```

**L2 原子（52）**

```
[间距 p 9]   p-0 p-1 p-2 p-3 p-4 p-5 p-6 p-8 p-10
[间距 m 5]   m-0 m-1 m-2 m-3 m-4
[间距 g 5]   g-0 g-1 g-2 g-3 g-4
[Flex 8]     f fc aic jcc jcsb jce flex-1 w-full
[圆角 5]     r-0 r-s r-m r-l r-f
[文本/字重 7] t-xs t-sm t-md t-lg t-xl t-b t-m
[颜色 6]     text-brand text-muted text-danger text-success bg-brand bg-muted
[阴影 3]     shadow-sm shadow-md shadow-lg
```

**L3 组件标签（10）**

```
af-list af-swiper af-tabs af-dialog af-toast
af-action-sheet af-picker af-dropdown af-img af-backtop
```

### 1.2 白名单版本化

| aiflow-ui 版本 | 白名单文件 | 条目数 | 备注 |
|---|---|---|---|
| 1.0.x（补丁） | whitelist-v1.json | 115 | 补丁不增条目 |
| 1.1.0（次版本） | whitelist-v2.json | 115 + N | 次版本可扩展 |
| 2.0.0（主版本） | whitelist-v3.json | TBD | 主版本允许破坏性变更 |

**决策 D1**：白名单随次版本号递增。新增条目需三处同步：
1. CSS/JS 源（`recipes.css` / `atomic.css` / `components/af-*.js`）
2. `whitelist-v*.json`（ESLint 读取）
3. System Prompt 构建注入（由 whitelist-v*.json 自动生成，人工零操作）

CI Step 1 检查三处同步，缺一阻断。

### 1.3 whitelist-v1.json 格式（ESLint + Prompt 共用源）

```json
{
  "version": "v1",
  "aiflowVersion": "1.0.0",
  "classes": {
    "recipe": ["btn", "btn-sm", "...", "checkout-bar"],
    "atomic": ["p-0", "p-1", "...", "shadow-lg"]
  },
  "components": ["af-list", "...", "af-backtop"],
  "tokens": ["--c-brand", "--c-onbrand", "...", "--dur-slow"],
  "forbiddenInlineStyle": [
    "color", "background", "background-color", "background-image",
    "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
    "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
    "font-size", "border-radius", "box-shadow"
  ]
}
```

`forbiddenInlineStyle` 供 L1-2 `no-inline-style` 规则做属性名精确匹配。

---

## 2. System Prompt 骨架（结构 + 生成参数 + 动态注入）

### 2.1 Prompt 结构（6 段）

```
┌─────────────────────────────────────────────────────┐
│ ① 角色与输出规范（代码只输出单文件 HTML / 无解释）   │
│ ② 设计体系速查（4 层分述 + L4 约束说明）             │
│ ③ L2 白名单（构建时注入：105 class 分组列出）        │
│ ④ L3 组件 API（10 个组件的属性/事件/示例）           │
│ ⑤ 25 条禁令（ESLint error 级，务必遵守）            │
│ ⑥ 正反示例（5 对，含原因解析）                       │
│ ⑦ 项目级扩展（可选：recipes.project.css 注释注入）   │
└─────────────────────────────────────────────────────┘
```

### 2.2 生成参数

| 参数 | 值（决策 D2） | 理由 |
|---|---|---|
| temperature | **0.1** | 白名单确定性空间，低温减少越界漂移 |
| top_p | **0.5** | 窄候选池，限制"创意" |
| max_tokens | **按页类型**：列表页 2000 / 结算页 3000 / 弹窗页 1500 | 防止画蛇添足添加自定义 class |
| 上下文窗口占用 | 白名单 + 禁令 + 示例 ≈ **~2K tokens** | 留出 60%+ 空间给用户需求 |
| stop 序列 | `["__STOP__"]` | 遇到注释块 `<!-- AIFLOW_LINT_FAILED` 时停止（3 轮失败信号） |

### 2.3 Prompt 动态注入（决策 D3）

System Prompt 模板不写死白名单条目，构建时替换两个注入点：

```bash
# 构建脚本 build-prompt.sh
# 1. 读 whitelist-v1.json → 格式化为人类可读分组列表
# 2. 替换模板中的 {{{ WHITELIST_INJECTION_POINT }}}
# 3. 若项目存在 recipes.project.css → 解析 /* === N. 用途 === */ 注释块 + class 名
#    替换 {{{ PROJECT_EXTENSION_INJECTION_POINT }}}
```

**理由**：Prompt ↔ ESLint ↔ CSS 三处同源。白名单扩展时，改 whitelist-v1.json 一处，Prompt 自动更新，零人工同步成本。

---

## 3. ESLint 插件：15 条规则完整定义

### 3.1 规则矩阵（15 条 ESLint + 1 CI 辅助，推荐配置：10 error + 5 warn）

| # | 规则名 | 层 | 级别 | 可自动修 |
|---|---|---|---|---|
| L1-1 | `no-token-modification` | L1 | error | 否 |
| L1-2 | `no-inline-style` | L1 | error | 部分（映射表） |
| L1-3 | `tokens-css-locked` | L1 | CI 阻断 | 否 |
| L2-1 | `token-whitelist` | L2 | error | 否 |
| L2-2 | `no-recipe-break` × 3 子规则 | L2 | error | 否 |
| L2-3 | `no-variant-conflict` | L2 | warn | 是 |
| L2-4 | `no-arbitrary-value` | L2 | error | 部分（最近档位） |
| L2-5 | `no-tailwind-syntax` | L2 | error | 否 |
| L2-6 | `prefer-component` | L2 | warn | 否 |
| L2-7 | `atomic-duplicate` | L2 | warn | 是 |
| L3-1 | `wc-light-no-style` | L3 | error | 否 |
| L3-2 | `wc-shadow-use-token` | L3 | error | 否 |
| L3-3 | `wc-part-naming` | L3 | warn | 否 |
| L3-4 | `wc-event-naming` | L3 | error | 是 |
| L3-5 | `wc-aria-required` | L3 | error | 否 |
| L3-6 | `wc-cleanup` | L3 | warn | 否 |

### 3.2 L1 规则（2 条 ESLint error + 1 CI 辅助）

#### L1-1 `aiflow/no-token-modification`

| 项 | 内容 |
|---|---|
| **检测** | 非 tokens(.project)?.css 文件内，重定义 `--(c\|s\|r\|t\|lh\|fw\|shadow\|z\|ease\|dur)-*` 变量 |
| **错误信息** | `Token variable '--c-brand' is locked. Modify tokens.css or register in tokens.project.css instead` |
| **例外** | 路径匹配 `**/tokens.css` 或 `**/tokens.project.css` |

#### L1-2 `aiflow/no-inline-style`（部分可自动修）

| 项 | 内容 |
|---|---|
| **检测** | `style=""` 中设置 whitelist-v1.json `forbiddenInlineStyle` 列表内的属性（7 大类 16 具体属性） |
| **错误信息** | `Inline style 'padding:16px' is forbidden. Use class="p-4" instead` |
| **例外** | `display`/`transform`/`z-index`/`width`/`height` 等布局属性放行；`skeleton` class 内的 width/height 放行 |
| **自动修正映射（部分）** | |
| | `padding: 0 → p-0` / `4px → p-1` / `8px → p-2` / `12px → p-3` / `16px → p-4` / `24px → p-5` / `32px → p-6` |
| | `margin: 0..32px → m-0..m-4` |
| | `color: var(--c-brand) → text-brand` / `var(--c-muted) → text-muted` / `var(--c-danger) → text-danger` |
| | `background: var(--c-muted-bg) → bg-muted` / `var(--c-brand) → bg-brand` |
| | `border-radius: 4px → r-s` / `8px → r-m` / `12px → r-l` / `9999px → r-f` |
| | `font-size: 12px → t-xs` / `14px → t-sm` / `16px → t-md` / `18px → t-lg` / `22px → t-xl` |

#### L1-3 `aiflow/tokens-css-locked`（CI 辅助）

| 项 | 内容 |
|---|---|
| **检测** | PR diff 包含 `tokens.css` → 检查 CODEOWNERS `@aiflow-ui/l1-owners` 是否 approve |
| **动作** | 未获 approve → GitHub 分支保护禁用合并按钮 |

### 3.3 L2 规则（7 条：4 error + 3 warn）

#### L2-1 `aiflow/token-whitelist`（error）

| 项 | 内容 |
|---|---|
| **检测** | HTML `class=""` / 自定义元素 tagName → 与 whitelist 115 条目 + extraClass/extraComponents（项目扩展）逐一对比 |
| **错误信息** | `Class 'custom-btn' not in whitelist. Use recipe/atomic or register in 'aiflow/token-whitelist' rule's extraClass` |
| **配置项** | `{ extraClass: string[], extraComponents: string[], allowProjectTokens: boolean }` |
| **实现** | 读 whitelist-v*.json + 项目 `.eslintrc` 的配置，取并集 |

#### L2-2 `aiflow/no-recipe-break`（error，3 子规则）

| 子规则 | 检测模式 | 错误信息 |
|---|---|---|
| a | `.cell` + `f`/`fc` 原子 | `.cell` has built-in `display:flex`, adding `f`/`fc` may break layout |
| b | `.btn`（非 `.btn-ghost`） + `text-brand`/`text-danger`/`text-success` | `.btn` background uses `--c-brand`, text color must keep `--c-onbrand` contrast (white). Use `.btn-ghost` instead for colored text |
| c | `.input` + `t-sm`/`t-xs` 原子 | `.input` font-size must be 16px (--t-md) to prevent iOS focus zoom. Put help text in `<label>` or `.form-err` instead |

#### L2-3 `aiflow/no-variant-conflict`（warn，可自动修）

| 项 | 内容 |
|---|---|
| **检测** | 同属性互斥变体对同时出现：`btn-sm+btn-lg` / `tag-ok+tag-warn` / `tag-ok+tag-danger` / `tag-warn+tag-danger` / 两个或以上圆角类 / 两个或以上 padding 类 |
| **错误信息** | `Variant conflict: 'btn-sm' and 'btn-lg' —— only the later one (btn-lg) takes effect, remove the earlier one` |
| **自动修正** | 删除较早出现的变体，保留最后一个（按 CSS 源序后者胜出原则） |

#### L2-4 `aiflow/no-arbitrary-value`（error，部分可自动修）

| 项 | 内容 |
|---|---|
| **检测** | class 名包含 `[`/`]`（Tailwind 任意值语法），或 `p-7`/`t-2xl` 等档位越界 |
| **错误信息** | `'p-[13px]' arbitrary value syntax forbidden; use closest atomic 'p-3' (12px) or extend recipes.project.css` / `'p-7' out of range (0/1/2/3/4/5/6/8/10); use 'p-6' (32px) or 'p-8' (64px)` |
| **自动修正** | `p-7 → p-6`（最近档位）；`p-[20px] → p-5`（24px 最近） |

#### L2-5 `aiflow/no-tailwind-syntax`（error）

| 项 | 内容 |
|---|---|
| **检测** | class 含 `sm:`/`md:`/`lg:`/`xl:`/`hover:`/`focus:`/`active:`/`dark:` 前缀 |
| **错误信息** | `'md:p-4' responsive/state prefix syntax forbidden. Use @container in recipes.project.css for container-queries responsive behavior` |

#### L2-6 `aiflow/prefer-component`（warn）

| 项 | 内容 |
|---|---|
| **检测** | 页面同时出现：(a) `.toast` class vs `<af-toast>` / (b) `.sheet` class vs `<af-action-sheet>` / (c) `.list` class + `window.addEventListener('scroll')` 手动监听 |
| **错误信息** | `Manual .toast + setTimeout detected, prefer <af-toast> for singleton queue / auto-dismiss / aria-live` |

#### L2-7 `aiflow/atomic-duplicate`（warn，可自动修）

| 项 | 内容 |
|---|---|
| **检测** | 同一 class 属性内出现两个同属性原子：`p-4 p-2` / `t-md t-lg` / `r-m r-l` / `m-3 m-1` |
| **错误信息** | `Duplicate padding: 'p-4' is overwritten by 'p-2'. Keep only 'p-2'` |
| **自动修正** | 删除前写的，保留最后写的 |

### 3.4 L3 规则（6 条：4 error + 2 warn）

#### L3-1 `aiflow/wc-light-no-style`（error）

| 项 | 内容 |
|---|---|
| **检测** | Light 组件 JS（含 `useShadow = false`）中：(a) 出现 `.style.xxx =` 赋值 (b) `innerHTML` 内含 `<style>` 标签 |
| **错误信息** | `Light DOM component must use L2 recipe classes only. Custom styles → use Shadow component or recipes.project.css` |

#### L3-2 `aiflow/wc-shadow-use-token`（error）

| 项 | 内容 |
|---|---|
| **检测** | Shadow 组件的 CSS 字符串常量中颜色/间距/字号/圆角硬编码（非 `var(--*)`） |
| **例外白名单** | `dialog::backdrop { background: rgba(0,0,0,.5) }` / `[popover]::backdrop`（遮罩半透明黑，L1 无 mask token） |
| **错误信息** | `'color: #fff' in Shadow CSS must use var(--c-onbrand). Use token variables for cross-theme visual consistency` |

#### L3-3 `aiflow/wc-part-naming`（warn）

| 项 | 内容 |
|---|---|
| **检测** | Shadow 组件暴露的 `part="xxx"` 属性名非 kebab-case，或不在 L3 设计文档 §4.5 的 ::part() 清单中 |
| **错误信息** | `Part name 'DialogContent' should be kebab-case 'dialog-content' and be registered in l3-detailed-design.md §4.5` |

#### L3-4 `aiflow/wc-event-naming`（error，可自动修）

| 项 | 内容 |
|---|---|
| **检测** | `emit('xxx')` 调用名不匹配正则 `/^af-[a-z0-9]+:[a-z]+$/` |
| **错误信息** | `Event name 'afList_LoadMore' should match 'af-{component}:{action}' (e.g. 'af-list:loadmore')` |
| **自动修正** | 自动转换：snake_case / camelCase → kebab-case，分隔符（`_`/大写）→ `:` |

#### L3-5 `aiflow/wc-aria-required`（error）

| 项 | 内容 |
|---|---|
| **检测** | 组件 render 输出的 DOM 缺少声明必需的 ARIA 角色/属性（对照 L3 §7.2 矩阵）。每个组件的 ARIA 要求以 JSON 声明于 `eslint-plugin-aiflow/utils/aria-requirements.json` |
| **错误信息** | `af-tabs missing role="tabpanel" on content area; required by WAI-ARIA tab pattern, see aria-requirements.json` |

#### L3-6 `aiflow/wc-cleanup`（warn）

| 项 | 内容 |
|---|---|
| **检测** | 组件 JS 中出现 addEventListener / new IntersectionObserver / new ResizeObserver / setTimeout / setInterval / requestAnimationFrame，但 `unmounted()` 方法内无对应清理调用 |
| **实现** | AST 对比——扫描"获取资源"调用的参数（如 `type`、`callback` 引用）与 unmounted 内"释放资源"调用是否匹配 |
| **错误信息** | `window.addEventListener('scroll') has no matching removeEventListener in unmounted(); potential memory leak` |

---

## 4. AI 代码生成修正流程（4 步 · 最多 3 轮）

### 4.1 流程图

```
┌──────────────────────────────────────────────────────────┐
│  Step 1：AI 生成代码（System Prompt 引导，temp=0.1）      │
│      │                                                    │
│      ▼                                                    │
│  Step 2：ESLint（plugin:aiflow/recommended）              │
│      ├─ 0 error → 成功 → Step 4                          │
│      └─ ≥ 1 error → 构造修正请求                           │
│          │                                                │
│          ▼                                                │
│  Step 3：构造修正 Prompt → AI 重写（只改违规点）           │
│      ├─ fixable 规则：先运行 --fix 自动 diff，作为 AI 上下文 │
│      └─ 非 fixable：将每条错误 + 禁令编号 + 正例 作为 context │
│          │                                                │
│          ▼                                                │
│  Step 4：重试次数 < 3？                                    │
│      ├─ 是 → 回到 Step 2 再次 ESLint                      │
│      └─ 否 → 3 轮失败 → 输出代码 + 错误注释 + 告警         │
└──────────────────────────────────────────────────────────┘
```

### 4.2 修正 Prompt 构造示例（决策 D4）

ESLint 返回：
```
42:3  error  Class 'cart-custom' not in whitelist [aiflow/token-whitelist]
58:1  error  Inline style 'padding: 20px' is forbidden [aiflow/no-inline-style]
63:12 warn   Variant conflict 'btn-sm' + 'btn-lg' removed btn-sm [auto-fixed]
```

构造给 AI 的修正 Prompt：

```
# 上次生成的代码违反以下 ESLint 规则，请按要求修正（只改违规点，其余保持不变，不改结构/内容/标签）：

## 错误 1（第 42 行）— aiflow/token-whitelist
Class 'cart-custom' not in AIFlow UI whitelist.
【建议】最接近的 L2 配方是 <div class="card">（卡片容器），请替换 class。

## 错误 2（第 58 行）— aiflow/no-inline-style（禁令第 2 条）
style="padding: 20px"（7 类属性之一的 padding 禁止内联）
【建议】20px 最接近原子类 p-5（24px）。请改为 <div class="p-5">。

## 警告 3（第 63 行）— 已自动修正
btn-sm 与 btn-lg 冲突：已删除 btn-sm，保留 btn-lg。请确认修改正确即可，无需再次改动。

输出完整修正后的 HTML（只改违规行，其余内容、顺序、标签全部保持不变）。
```

**关键**：给每条错误具体建议（而非仅错误编号），明确"只改违规点，其余保持不变"——降低 AI 重写时引入新违规的概率。

### 4.3 3 轮失败处理

| 动作 | 说明 |
|---|---|
| 代码末尾打标记 | `<!-- AIFLOW_LINT_FAILED\n{ JSON.stringify(errors, null, 2) }\n-->` |
| 生成告警 | 通知 L4 Owner：3 轮失败率、Top 高频失败规则 |
| 放行规则 | warn 级可进入 PR（需人工审查），error 级禁止进入生产 |
| 学习样本 | 3 轮失败代码 + 最终人工修正代码 → Prompt 优化样本库 |

### 4.4 数据闭环（决策 D5）

每季度 L4 约束报告 → 驱动 Prompt/白名单/禁令/阈值调整：

| 指标 | 阈值 | 动作 |
|---|---|---|
| 单规则触发率 Top 1 | > 20% 请求 | 该规则加入 System Prompt 禁令节首位 + 新增正反示例 |
| 3 轮失败率 | > 10% | temperature 从 0.1 → 0.05，或新增针对性禁令 |
| 白名单外 class Top N 重复出现 | ≥ 10% 请求中出现同一 class | 评估纳入下一版本 whitelist（如 avatar-lg、search-with-icon） |
| 项目级扩展使用率 | > 30% 项目都在扩展同一 class | 考虑升级为核心配方 |

---

## 5. 项目级扩展机制

### 5.1 三类扩展通道

| 扩展类型 | 场景示例 | 通道 | 需登记？ |
|---|---|---|---|
| L2 配方/原子变体 | `.avatar-lg`（大头像）、`.btn-gradient`（渐变按钮） | `recipes.project.css` | ✅ extraClass |
| L1 token 值覆盖 | 项目品牌色替换 `--c-brand: #ff6b35` | `tokens.project.css` | ❌（设 `allowProjectTokens: true`） |
| L3 组件新增 | `<af-qrcode>`（二维码）、`<af-map>`（地图） | `components/project-af-*.js` | ✅ extraComponents |

**决策 D6**：三类通道不混淆。L1 token 覆盖不进白名单（纯变量重定义，不新增 class/component），L2/L3 扩展需登记。

### 5.2 recipes.project.css（L2 配方扩展）

**位置**（固定路径，AI 自动感知）：`aiflow-ui/recipes.project.css`

```css
/* recipes.project.css —— 项目级扩展
   每条扩展必须：
   1. 放入 @layer components 或 @layer utilities
   2. 用 var(--*) 引用 L1 token（硬编码值触发 no-token-modification）
   3. 顶部写 /* === N. 用途 === *\/ 注释块（供 Prompt 自动注入读取）
*/

/* === 1. 大头像（个人主页 72×72，核心 avatar 仅 36×36） === */
@layer components {
  .avatar-lg {
    width: 72px;
    height: 72px;
    border-radius: var(--r-f);
    object-fit: cover;
    background: var(--c-muted-bg);
  }
}

/* === 2. 带图标搜索框（核心 search-input 只留 padding 占位不含图标） === */
@layer components {
  .search-with-icon { position: relative; }
  .search-with-icon .search-icon {
    position: absolute;
    left: var(--s-2);
    top: 50%;
    transform: translateY(-50%);
    color: var(--c-muted);
  }
}
```

### 5.3 tokens.project.css（L1 token 值覆盖）

**位置**：`aiflow-ui/tokens.project.css`

```css
/* tokens.project.css —— 只允许覆盖 L1 变量值，不允许新增 L1 变量名
   加载顺序：tokens.css → tokens.project.css（后者特异性胜出） */

@layer tokens {
  :root {
    --c-brand: #ff6b35;       /* 项目品牌色（替换 AIFlow UI 默认蓝色） */
    --c-danger: #e53935;       /* 项目错误色稍深 */
    --s-4: 20px;              /* 项目偏好更大默认 padding */
  }
  :root[data-theme="dark"] {
    --c-brand: #ff8a5c;
  }
}
```

**决策 D7**：`tokens.project.css` 只改值不改名称。项目需新语义色 → 走 `recipes.project.css` 用现有 token 组合，不新增 token 名。

### 5.4 项目级组件

**位置**：`aiflow-ui/components/project-af-*.js`（文件名必须 `project-af-` 前缀）

```javascript
// components/project-af-qrcode.js
import { AfElement } from '@af-mobile/ui/lib/af-element';

export class AfQrcode extends AfElement {
  static useShadow = true;
  // 遵循 L3 总体架构规范：mounted/unmounted/onThemeChange/emit(composed=true)
}
```

### 5.5 项目级登记（两处同步）

```javascript
// .eslintrc.cjs（项目根）
module.exports = {
  plugins: ['aiflow'],
  extends: ['plugin:aiflow/recommended'],
  rules: {
    'aiflow/token-whitelist': ['error', {
      extraClass: [
        'avatar-lg',
        'search-with-icon',
        'search-icon',
      ],
      extraComponents: ['af-qrcode'],
      allowProjectTokens: true,
    }],
  }
};
```

**决策 D8**：核心 aiflow-ui 的三处同步（CSS/JS → whitelist.json → Prompt）仍严格；**项目级扩展只需改两处**：`recipes.project.css`（源码） + 项目 `.eslintrc`（extraClass）。**Prompt 侧零人工操作**——构建脚本自动读 `recipes.project.css` 的 `/* === N. 用途 === */` 注释块注入。

### 5.6 项目级扩展自动注入 Prompt（决策 D9）

构建时扫描项目 `recipes.project.css`，生成：

```markdown
# 项目级扩展（来自 recipes.project.css）
以下 class 已登记为本项目专属白名单，可正常使用：
1. avatar-lg：大头像 72×72（核心 avatar 36×36），个人主页用
2. search-with-icon + search-icon：带左图标的搜索框
3. btn-gradient：品牌色渐变按钮
```

**注入点**：`system-prompt.template.md` 末尾的 `{{{ PROJECT_EXTENSION_INJECTION_POINT }}}`。

---

## 6. CI 保护链路（PR 三步 + 发布阶段附加检查）

### 6.1 PR 阶段 Pipeline

```
Pull Request
    │
    ▼  Step 1：白名单同步检查（双向 diff）
    检查三源一致：(a) 源码（recipes/atomic/components）、
                  (b) whitelist-v1.json、
                  (c) 构建后 prompt（WHITELIST_INJECTION_POINT 替换结果）
    ├─ 一致 →  通过
    └─ 不一致 → 阻断，PR 评论输出：
       "recipes.css 有 class xxx（来源 PR commit abc），
        但 whitelist-v1.json 未登记。请同步更新 eslint-plugin-aiflow whitelist"
    │
    ▼  Step 2：体积检查（esbuild minify + Node zlib gzip，脚本 scripts/size-check.mjs）
    ├─ L1+L2 总 CSS  ≤ 4.2KB
    ├─ L3 全量 10+基类 ≤ 10.5KB
    ├─ L3 按需 2 组件 ≤ 4.5KB
    ├─ 单组件（JS+CSS） ≤ 2.5KB
    └─ 基类 AfElement ≤ 0.8KB
    全部通过 →
    超限 → 阻断，附建议（"af-picker 2.5KB：检查是否有可提取为 L2 的静态样式"）
    │
    ▼  Step 3：CODEOWNERS 审批检查
    PR diff 涉及关键文件 → 检查对应 Owner approve
      tokens.css        → @aiflow-ui/l1-owners
      af-element.js     → @aiflow-ui/l3-owners
      whitelist-v*.json → @aiflow-ui/l4-owners
      system-prompt.*   → @aiflow-ui/l4-owners
      eslint rules/*    → @aiflow-ui/l4-owners
    已 approve →
    未批准 → GitHub 分支保护禁用合并按钮
    │
    ▼
PR 可合并
```

### 6.2 Step 1：白名单同步检查（决策 D10）

核心逻辑（双向 diff）：
```
A = CSS/JS 实际存在的 class 和组件（扫描源码）
B = whitelist-v1.json 声明的 115 条目
C = 构建后 Prompt 中的白名单（注入结果）

if (A \ B) 非空 → "源码有但 whitelist 未登记：..."
if (B \ A) 非空 → "whitelist 有但源码不存在：..."
if (B \ C) 非空 → "whitelist 有但 Prompt 未注入：..."
```

### 6.3 Step 2：体积阈值矩阵

| 检查项 | 阈值 | 超限建议 |
|---|---|---|
| L1+L2 CSS（tokens+recipes+atomic） | ≤ 4.2KB gzip | `已达 4.0KB，建议删除罕用配方或去除冗余 token 注释` |
| L3 全量（10+基类） | ≤ 10.5KB gzip | `检查是否有组件可降级为 L2 静态配方` |
| L3 单组件（JS+CSS） | ≤ 2.5KB gzip | `超阈值组件需在 PR 附体积解释文档` |
| L3 按需 2 组件 | ≤ 4.5KB gzip | `检查基类 AfElement 是否膨胀（目标 0.8KB）` |
| 基类 AfElement | ≤ 0.8KB gzip | `建议提取非常用功能为独立 mixin` |

### 6.4 Step 3：CODEOWNERS（决策 D11）

```
# CODEOWNERS
# L1 核心 Token
src/tokens.css                              @aiflow-ui/l1-owners

# L3 基类（影响全部组件）
src/lib/af-element.js                        @aiflow-ui/l3-owners

# L4 白名单 + Prompt + ESLint 规则
eslint-plugin-aiflow/utils/whitelist-v*.json @aiflow-ui/l4-owners
system-prompt.template.md                    @aiflow-ui/l4-owners
eslint-plugin-aiflow/rules/**                @aiflow-ui/l4-owners
```

三组 Owner 最小化跨层审批：L1/L3/L4 各自管自己的关键文件。

### 6.5 发布阶段（npm publish 前）附加检查

| 检查项 | 工具 | 阻断 |
|---|---|---|
| sideEffects 标记 | `npm pack --dry-run` + JSON.parse(`package.json`) → 必须 `"sideEffects": false` | 是 |
| ESM 命名导出 | 解析 exports 字段 + grep 10 个组件类名均 `export class AfXxx` | 是 |
| Tree Shaking 效果 | esbuild 打包"只 import AfList + AfDialog"产物 → grep 类名：应含 AfList/AfDialog/AfElement，不含其余 8 个 | 是 |

---

## 7. 附录：源码模板

### 7.1 system-prompt.template.md（完整骨架，两个注入点）

```markdown
# 角色
你是 AIFlow UI 前端代码生成器，负责输出严格遵循 AIFlow UI 分层设计体系的原生 HTML/CSS/JS 代码。
目标基准：移动端 H5 375px 宽度。
输出要求：完整单文件 HTML 代码块（只输出 <!doctype html> ... </html>，不含解释、不含说明文字）。
<head> 内必须引入：<link rel="stylesheet" href="/aiflow-ui.css">
<style> 块只允许存在于 head（页面级自定义样式，仍需 token 合规），body 内只含 L2 class + L3 组件标签。

# 设计体系速查
L1 Token（43 变量）：颜色/间距/圆角/字号/阴影/层级/动效 → 必须用 var(--c-*) / var(--s-*) 等引用，禁止硬编码
L2 配方（53）+ 原子（52）= 105 个白名单 class → 白名单外 class 触发 ESLint error 阻断
L3 真组件（10 个 af-* 自定义元素）→ 需要 JS 行为时使用（见"L3 API"节）
L4 约束层：ESLint 15 规则（10 error + 5 warn）+ 最多 3 轮自动修正 → 请务必遵守禁令

<!-- {{{ WHITELIST_INJECTION_POINT }}} 构建时替换为 whitelist-v*.json 生成的 105 class 分组列表 -->

# L3 真组件 API（10 个）
## <af-list> 长列表虚拟滚动
- 属性：data (Array) | page-size (Number, default 20)
- 事件：af-list:loadmore {page} / af-list:refresh {} / af-list:itemclick {index, item}
- 用法：
  <af-list id="l"></af-list>
  <script type="module">
    import { AfList } from '@af-mobile/ui';
    customElements.define('af-list', AfList);
    l.data = [{title:'商品1'},{title:'商品2'}];
    l.addEventListener('af-list:itemclick', e => console.log(e.detail.index));
  </script>

## <af-swiper> 轮播/滑动
- 属性：autoplay (Number ms, 0=关) | loop (Boolean) | active-index (Number) | show-dots (String, default "true")
- 事件：af-swiper:change {index}
- 内容：<af-swiper><div class="slide">...</div>...</af-swiper>

## <af-tabs> 标签页
- 属性：tabs (JSON Array [{label,value}]) | active-index (Number)
- 事件：af-tabs:change {index, value}
- ARIA：自动注入 tablist/tab/tabpanel + aria-selected + aria-controls

## <af-dialog> 模态框（原生 <dialog> 封装）
- 属性：title (String) | close-on-esc (Boolean) | close-on-backdrop (Boolean) | variant (String, default/top/bottom)
- 内容：<af-dialog><div slot="body">...</div><div slot="footer">...</div></af-dialog>
- API：dialogEl.open() / dialogEl.close(action)
- 事件：af-dialog:open {} / af-dialog:close {action}

## <af-toast> 轻提示（全局单例）
- 单例：全局只需一个 <af-toast id="t"></af-toast>
- 属性：duration (Number ms, default 2000)
- API：t.show(message, duration=2000)
- 事件：af-toast:dismiss {}
- ARIA：role=status + aria-live=polite

## <af-action-sheet> 底部操作面板（popover）
- 属性：options (JSON Array [{label,value, danger?:Boolean}]) | title (String) | show-cancel (Boolean, default true) | cancel-text (String, default "取消")
- 事件：af-action-sheet:select {index,value} / af-action-sheet:close {} / af-action-sheet:open {}
- API：sheet.showPopover() / sheet.hidePopover()

## <af-picker> 滚轮选择器（scroll-snap）
- 属性：columns (JSON Array [[{label,value}], ...]) | title (String)
- 事件：af-picker:change {column,value} / af-picker:confirm {values}

## <af-dropdown> 下拉菜单（popover）
- 属性：options (JSON Array [{label,value}]) | value (String) | placeholder (String)
- 事件：af-dropdown:select {index,value}

## <af-img> 懒加载图片（IntersectionObserver）
- 属性：src (String) | alt (String，必填) | placeholder-src (String) | fail-src (String) | variant (String, default/thumb/avatar) | lazy (Boolean, default true) | root-margin (String, default "200px")
- 事件：af-img:load {} / af-img:error {}

## <af-backtop> 回到顶部
- 属性：threshold (Number px，显示阈值，默认 200) | target (String, CSS selector) | position (String, right-bottom/left-bottom) | text (String, default "↑")
- 事件：af-backtop:click {} / af-backtop:show {} / af-backtop:hide {}
- ARIA：aria-label="回到顶部"

# 25 条禁令（ESLint error 级，务必遵守）
01. 禁止 tokens.css 以外重定义 --c-*/--s-*/--r-*/--t-*/--lh-*/--fw-*/--shadow-*/--z-*/--ease-*/--dur-*
02. 禁止 style="" 设置 color/background*/padding*/margin*/font-size/border-radius/box-shadow
    （display/transform/z-index/width/height 布局属性例外）
03. 禁止使用 115 白名单外的 class 名或自定义组件标签（项目级扩展需先登记）
04. 禁止 .btn（非 ghost）叠加 text-brand/text-danger/text-success（破坏 onbrand 对比度）
05. 禁止 .input 叠加 t-sm/t-xs（iOS 聚焦 < 16px 自动放大页面）
06. 禁止 .cell/.list-item 叠加 f/fc 原子（自带 display:flex，再设会破坏布局）
07. 禁止 Tailwind 式任意值语法：p-[13px]/bg-[#abc]/p-7（p 仅允许 0/1/2/3/4/5/6/8/10）
08. 禁止互斥变体叠加：btn-sm+btn-lg、tag-ok/warn/danger 任意两个同现、
    多个圆角类同现、同属性原子重复（如 p-4 p-2）
09. 禁止 .list-item/.list-item-compact 自带 border-top（分隔线由 .list 容器管理）
10. 禁止 .sheet 手动 display 切换（显隐必须走原生 popover API showPopover/hidePopover）
11. 禁止 .tab-item 用 active class 表达选中态（选中态单一真相源是 aria-selected="true"，视觉由属性选择器 .tab-item[aria-selected="true"] 驱动）
12. 禁止 L3 Light DOM 组件（af-list/af-tabs/af-toast/af-action-sheet/af-dropdown/af-backtop/af-img）
    内含 <style> 或 this.style.xxx（纯 L2 配方，自定义样式请用 Shadow 组件或 recipes.project.css）
13. 禁止 Shadow 组件 CSS 字符串硬编码颜色/间距/字号/圆角（dialog::backdrop 遮罩 rgba(0,0,0,.5) 例外）
14. 禁止事件名不符合 af-{组件}:{动作} 格式；emit 必须 composed:true（Shadow 事件穿透）
15. 禁止 af-dialog/af-action-sheet 无焦点陷阱（Tab 不逃出；关闭时还原焦点到触发元素）
16. 禁止 af-tabs 缺 aria-selected/aria-controls/aria-labelledby（违反 WAI-ARIA tab 模式）
17. 禁止 .price 叠加 text-success/text-brand（电商约定：价格用 --c-danger 红色，不允许改色；
    如需例外，先在项目级登记并加注释说明）
18. 禁止 .empty 与 .center 在同一语义场景混用（.empty 专用于空状态，.center 通用居中）
19. 禁止 .hero 用作内容区主体背景（仅用于页面顶部大留白标题区）
20. 禁止 .actions 内 .btn 与 .btn-block 同时出现（flex-1 均分 vs 块级冲突）
21. 禁止 .tabbar-fixed/.checkout-bar/.input-bar 漏 safe-area-inset-bottom（iOS Home 条遮挡）
22. 禁止 af-swiper/af-tabs/af-picker 方向键切换无焦点跟随（roving tabindex 模式）
23. 禁止手动创建 .toast 元素（必须通过 af-toast.show() 单例管理）
24. 禁止骨架屏 style="" 设宽高（请用 .skeleton-line 配方或 recipes.project.css 扩展）
25. 禁止在 JS 事件回调内调用 setAttribute 修改自身 attribute（单向数据流：attribute=输入 / event=输出 /
    内部状态用 this._xxx 私有字段）

# 正反示例（5 对）
✅ 正确：<button class="btn btn-block">确定</button>
❌ 错误：<button class="btn text-brand btn-block">确定</button>
原因：.btn 背景是品牌色，文字保持 --c-onbrand（白）以保证对比度；再加 text-brand 导致"蓝底蓝字"不可读。

✅ 正确：<div class="card p-4">内容</div>
❌ 错误：<div class="card" style="padding: 16px;">内容</div>
原因：内联 style 设置 padding，违反禁令第 2 条。请使用 p-4 原子类。

✅ 正确：<input class="input input-err"> <span class="form-err">姓名不能为空</span>
❌ 错误：<input class="input" style="border-color: var(--c-danger);">
原因：内联 style 设颜色。错误态请使用 .input-err 配方（border-color 已设为 --c-danger）。

✅ 正确：<af-list id="list"></af-list> + list.data = items
❌ 错误：<div class="af-list-custom">...</div> + 手动滚动监听
原因：白名单外 class + 重复造轮子。请用 af-list 真组件（内置虚拟滚动 + 加载更多）。

✅ 正确：<span class="tag tag-warn">待处理</span>
❌ 错误：<span class="tag tag-ok tag-danger">混合状态</span>
原因：tag-ok 与 tag-danger 互斥变体叠加（禁令第 8 条），只能选一个状态标签。

<!-- {{{ PROJECT_EXTENSION_INJECTION_POINT }}} 构建时替换为 recipes.project.css 注释块注入 -->
```

### 7.2 .eslintrc.cjs（项目推荐配置）

```javascript
module.exports = {
  root: true,
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['aiflow'],
  extends: ['eslint:recommended', 'plugin:aiflow/recommended'],
  rules: {
    // （可选）严格模式：5 warn → error
    // 'aiflow/no-variant-conflict': 'error',
    // 'aiflow/prefer-component': 'error',
    // 'aiflow/atomic-duplicate': 'error',
    // 'aiflow/wc-part-naming': 'error',
    // 'aiflow/wc-cleanup': 'error',

    'aiflow/token-whitelist': ['error', {
      // === 项目级扩展登记处 ===
      extraClass: [
        'avatar-lg',
        'search-with-icon',
        'search-icon',
      ],
      extraComponents: ['af-qrcode'],
      allowProjectTokens: true,
    }],

    // （可选）项目级临时豁免（不推荐）
    // 'aiflow/no-inline-style': ['warn', { allowProperties: ['width'] }],
  },
  settings: {
    aiflow: {
      // SDK 版本，决定加载哪一版 whitelist
      sdkVersion: '1.0.0',
      // 项目级扩展 CSS 路径（供 Prompt 注入扫描）
      projectRecipesCss: './aiflow-ui/recipes.project.css',
    },
  },
};
```

### 7.3 CI YAML（GitHub Actions）

```yaml
# .github/workflows/aiflow-l4-gate.yml
name: AIFlow UI · L4 Gate
on: [pull_request]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci

      - name: Step 0 — Lint（ESLint 15 规则）
        run: npx eslint src/ --max-warnings 0

      - name: Step 1 — 白名单三处同步检查
        run: npm run whitelist:check

      - name: Step 2 — 体积检查（5 阈值）
        run: npm run size

      # Step 3 — CODEOWNERS 审批由 GitHub Branch Protection Rules 自动处理
```

---

## 设计决策索引

| # | 决策 | 所在节 |
|---|---|---|
| D0 | L4 三层纵深防御：Prompt 引导（事前）+ ESLint 自动修 3 轮（事后）+ CI 同步/体积/CODEOWNERS（发布前） | 0.2 |
| D1 | 白名单随次版本号递增；新增三处同步（源码 + whitelist-v*.json + Prompt 构建注入，CI Step 1 检查） | 1.2 |
| D2 | Prompt 生成参数：temperature=0.1（极低）/ top_p=0.5 / 按页类型 max_tokens | 2.2 |
| D3 | Prompt 两注入点动态替换：WHITELIST_INJECTION_POINT ← whitelist-v*.json；PROJECT_EXTENSION_INJECTION_POINT ← recipes.project.css 注释块 | 2.3 |
| D4 | 修正 Prompt 给每条错误具体建议（而非仅错误编号）+ 明确"只改违规点，其余保持不变"以降低 AI 重写引入新错误概率 | 4.2 |
| D5 | 数据闭环：每季度 L4 约束报告驱动 Prompt/白名单/禁令/阈值调整；Top 高频越界 class ≥10% 评估升级为核心配方 | 4.4 |
| D6 | 项目扩展三通道不混淆：L2 配方变体走 recipes.project.css；L1 值覆盖走 tokens.project.css；L3 新组件走 project-af-*.js；仅 L2/L3 需登记 extraClass/extraComponents | 5.1 |
| D7 | tokens.project.css 只覆盖 L1 变量**值**，不允许新增 L1 变量名；项目需新语义色 → 走 recipes.project.css 组合现有 token | 5.3 |
| D8 | 项目级扩展两处同步（recipes.project.css + .eslintrc 的 extraClass/extraComponents），Prompt 侧零人工（构建脚本自动读注释注入） | 5.5 |
| D9 | 项目级扩展自动注入 Prompt：扫描 recipes.project.css 的 /* === N. 用途 === */ 注释块，生成带用途的扩展列表附加到 System Prompt 末尾 | 5.6 |
| D10 | CI Step 1 白名单同步做双向 diff（A\B、B\A、B\C），避免单向漏检 | 6.2 |
| D11 | CODEOWNERS 分三组 Owner（L1/L3/L4），最小化跨层审批面；L4 Owner 管白名单 JSON + Prompt + ESLint 规则 | 6.4 |
