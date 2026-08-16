# 项目级扩展体系（三逃生舱 + 结晶回路）详细设计

> 背景：154 class 封闭白名单保证了 AI 生成的一致性，但长尾需求（约 20% 场景）无法全部由官方组件覆盖。
> 仓库中已存在三个"半成形"的扩展机制但从未成文、未闭环。本文档将其成文为**统一的项目级扩展体系**，
> 并补齐两块缺失管道：**约定文件自动注册**（lint 侧）与**数据回流**（飞轮侧）。
>
> 核心原则：**封闭集管住下限，逃生舱打开上限，飞轮把上限变下限**——今天的 20% 项目自定义，沉淀为明天的官方 80%。

---

## 目录

- [0. 现状盘点：三个未成文的逃生舱](#0-现状盘点三个未成文的逃生舱)
- [1. 设计原则与升级阶梯](#1-设计原则与升级阶梯)
- [2. 逃生舱 A：data-\* + 原生能力（结构性绕行）](#2-逃生舱-adata--原生能力结构性绕行)
- [3. 逃生舱 B：recipes.project.css 约定文件（主通道）](#3-逃生舱-brecipesprojectcss-约定文件主通道)
- [4. 逃生舱 C：显式 extraClass / extraComponents 注册](#4-逃生舱-c显式-extraclass--extracomponents-注册)
- [5. 结晶回路：遥测回流 + whitelist-v2 候选](#5-结晶回路遥测回流--whitelist-v2-候选)
- [6. 安全与隐私](#6-安全与隐私)
- [7. 体积与命名约束](#7-体积与命名约束)
- [8. 测试与 CI 接入](#8-测试与-ci-接入)

---

## 0. 现状盘点：三个未成文的逃生舱

| # | 机制 | 已有部分 | 缺失部分 |
|---|---|---|---|
| A | `data-*` 属性 + 原生能力 | AGENTS.md #8 推荐；system-prompt 提及 `data-role` | 无成文规范（何时用/约束） |
| B | `recipes.project.css` 约定文件 | prompt 侧已通：`build-prompt.mjs --project` 解析 `/* === N. 用途 === */` 块注入 System Prompt | **lint 侧未接线**：文件里的 class 仍触发 token-whitelist error，需手工复制到 extraClass |
| C | `extraClass` / `extraComponents` 规则选项 | `token-whitelist` 规则已支持（本仓 `af-data` 即用例） | 消费端需手写 class 列表，与 B 双重维护、易漂移 |
| — | 数据回流 | 遥测只记**违规**；`mineWhitelistCandidates` 挖掘白名单外 class | **合法的项目扩展使用无记录** → 无法回答"哪些项目配方该晋升官方" |

结论：A/B/C 三舱各自可用但互不通气，且缺少"项目扩展 → 官方白名单"的回流管道。本设计补齐：

1. **约定单一化**：`recipes.project.css` 的 `/* === N. 用途 === */` 块成为项目扩展的**唯一登记处**，lint / prompt 两端自动读取（消除 B/C 双维护）；
2. **回流闭环**：lint 与 MCP 检查时记录项目扩展的**实际使用**，飞轮报告输出"项目扩展 Top N"作为 whitelist-v2 候选。

---

## 1. 设计原则与升级阶梯

### 1.1 原则

1. **越界必须 lint 可见**：任何白名单外的 class，要么经约定文件登记（压差阀），要么被规则报错（破洞）。没有第三态。
2. **登记即文档**：约定块格式强制写用途说明——登记的成本就是写一行注释，防止白名单无限膨胀成垃圾场。
3. **使用即数据**：登记了不代表该存在——只有被真实使用的扩展才进入回流，供官方评估晋升。
4. **项目扩展不进库预算**：`recipes.project.css` 属项目资产，不计入库体积预算（`size-check` 不涉及）。

### 1.2 升级阶梯（消费端遇到"白名单不够用"时的决策树）

```
需求出现（某个视觉/结构效果 154 class + 28 组件做不出来）
│
├─ L0 现有原语组合 + data-* 变体 + 原生能力     ← 零登记成本，优先引导
│    例：collapse → <details> + data-role 样式；slider → <input type="range">
│
├─ L1 recipes.project.css 约定块登记新配方 class  ← 主通道，lint+prompt 自动生效
│    例：/* === 1. 大头像 === */  .avatar-lg { ... }
│
├─ L2 extraClass 显式注册 / tokens.project.css 覆盖 token 值  ← 少量临时补充
│
└─ L3 自建 af-* 组件（extends AfElement）+ extraComponents 登记  ← 完全自由，wc-* 规则兜底
     │
     ▼ 飞轮回流：某扩展 class 高频/跨项目使用（≥2 项目或加权分 ≥ 阈值）
官方晋升：whitelist-v2 + recipes.css + prompt 三源登记（20% → 80%）
```

AI 的决策顺序同样注入 System Prompt（逃生舱指引段），保证生成代码优先走低成本通道。

---

## 2. 逃生舱 A：data-\* + 原生能力（结构性绕行）

**适用**：效果可以由"现有 class 的结构变体"或"2022+ 浏览器原生能力"表达，不需要新语义 class。

**规范**：

- 用 `data-role` / `data-variant` 等语义化 data 属性做选择器钩子，样式写在页面级 `<style>`（head 内，token 合规）或 `recipes.project.css`：
  ```css
  .cell[data-role="user-card"] { padding: var(--s-4); }
  ```
- 优先考虑原生替代：`<details>`（折叠）、`popover`（弹层）、`:has()`（状态选择）、`field-sizing`（自适应输入）、`loading="lazy"`（懒加载）。
- **约束**：data-* 本身不受白名单约束（不是 class），但内联 style 禁令与 token 纪律不变；不可用 data-* 伪装绕过 `no-recipe-break` 的互斥变体。

**成本**：零登记、零回流（结构变体不产生新 class，无 crystallization 信号）。

---

## 3. 逃生舱 B：recipes.project.css 约定文件（主通道）

### 3.1 文件与约定格式

位置：**项目根目录 `recipes.project.css`**（脚手架自动生成模板）。约定格式与 prompt 侧 `extractProjectExtensions` 完全一致（单一契约）：

```css
/* 项目级扩展配方：每个块 = 一组已登记的白名单外 class，块注释即用途文档 */

/* === 1. 大头像（个人中心页专属） === */
.avatar-lg { width: 64px; height: 64px; border-radius: 50%; }

/* === 2. 筛选条 === */
.filter-bar { display: flex; gap: var(--s-2); padding: var(--s-2) var(--s-3); }
.filter-chip { ... }
```

**规则**：

- 只有 `/* === N. 用途 === */` 块内出现的 `.class` 名会被登记；块外 CSS 无登记效果（强制文档化）；
- 值必须引用 `var(--*)` token（同 L2 纪律；项目级 token 值覆盖走 `tokens.project.css`）；
- class 命名 kebab-case，禁止 `af-` 前缀（那是组件标签命名空间）；
- 文件由项目入口 import（`import '../recipes.project.css'`）。

### 3.2 自动接线（本设计新增）

**lint 侧**（消除手工 extraClass）：

- `eslint-plugin-aiflow/utils/helpers.js` 新增 `projectClassesFromCss(css)` / `loadProjectClasses(cssPath)`（§3.3 API 规范）；
- 插件导出 `withProjectRules(cssPath, baseRules?)`：返回 recommended 规则集，`token-whitelist` 的 `extraClass` 已并入约定块 class（保留 `af-data` 等 extraComponents）。消费端一行接入：
  ```js
  // eslint.config.js
  import aiflow from '@af-mobile/eslint-plugin';
  rules: aiflow.withProjectRules('recipes.project.css')
  ```

**prompt 侧**（已有，消费端补自动感知）：

- `build-prompt.mjs --project <path>` 已支持注入"项目级扩展"段；MCP `get_prompt` 新增自动探测 cwd 下的 `recipes.project.css` 并传入——AI 生成时天然知道项目专属 class。

**脚手架**：

- `npx aiflow create` 生成的工程自带 `recipes.project.css` 模板（含两个注释掉的可选示例块）+ `eslint.config.js` 已接 `withProjectRules` + `src/main.js` 已 import。

### 3.3 API 规范（eslint-plugin-aiflow）

```js
// utils/helpers.js
projectClassesFromCss(cssText)  // 纯函数：解析约定块 → ['avatar-lg', 'filter-bar', ...]（去重，按出现序）
loadProjectClasses(cssPath)     // 读文件（相对 cwd 解析）；文件不存在/解析失败 → []（不崩，AGENTS #6）

// index.js（同时挂到 default export 供 aiflow.withProjectRules 调用）
withProjectRules(cssPath, baseRules = recommended.rules)
  // → { ...baseRules, 'aiflow/token-whitelist': ['error', { ...原 opts, extraClass: [...原 extraClass, ...loadProjectClasses(cssPath)] }] }
```

**MCP 自动感知**（`mcp/index.mjs`）：

- `detectProjectRecipes(cwd = process.cwd())` → 返回存在的 `recipes.project.css` 绝对路径或 null；
- `checkCompliance`：探测到约定文件时，把 class 列表经 `runEslint` 新增的 `opts.rules`（ESLint `overrideConfig.rules`）注入——消费端项目 class 不再误报；
- `getPrompt`：探测到时传 `projectRecipes` 给 `buildPrompt`，注入"项目级扩展"段。

---

## 4. 逃生舱 C：显式 extraClass / extraComponents 注册

**适用**：临时性、不值得建约定块的一次性补充；以及自建组件标签登记。

```js
rules: aiflow.configs.recommended.rules 的覆写或 withProjectRules 之上再叠加：
  'aiflow/token-whitelist': ['error', {
    extraComponents: ['af-qrcode'],        // 自建组件标签（配套 components/project-af-*.js）
  }]
```

- 自建组件 `extends AfElement`，受 `wc-*` 规则（event-naming / aria-required / cleanup / light-no-style）约束——自由但有质量底线；
- **约定**：新 class 一 律优先走 B（约定文件），C 仅用于组件标签与过渡期——报告与 hint 文案统一引导到 B。

---

## 5. 结晶回路：遥测回流 + whitelist-v2 候选

### 5.1 遥测 schema 扩展（向后兼容）

`eval/telemetry.mjs` 的 `recordRun` 新增可选 `extensions` 字段：

```jsonc
{ "v": 1, "ts": "...", "source": "mcp", "tool": "trae-code", "file": "src/a.html",
  "passed": true, "violations": [],
  "extensions": { "classes": ["avatar-lg", "filter-chip"] } }  // 本次运行实际使用的项目扩展
```

- 仅非空时落盘（旧事件/无扩展运行零开销）；schema 版本 `v:1` 不变（新增可选字段，旧读取方无感）；
- **只记 class 名标识符**，不记 CSS 声明内容（沿用 `sanitizeMessage` 隐私红线，§6）。

### 5.2 采集点

| 采集点 | 行为 |
|---|---|
| MCP `check_compliance` / `fix_code` | 探测约定文件 → lint 放行的同时，扫描本次代码中**实际出现**的登记 class → `recordMcpRun` 携带 `extensions` |
| `scripts/lint-flywheel.mjs` CLI | 同上：探测 cwd 约定文件 → 注入规则 + 记录每文件实际使用 |

"实际出现"判定：`extractAllClassLists(code)` 提取的 class 与登记集求交（字符串级，零解析成本）。

### 5.3 飞轮挖掘与报告

`eval/flywheel.mjs`：

- 新增 `mineProjectExtensions(events)`：聚合 `extensions.classes` → `[{ name, count, files }]`（按使用次数降序）；
- `analyze()` 输出新增 `projectExtensions` 字段；
- `renderReport()` 新增章节：
  ```markdown
  ## 项目扩展 Top N（whitelist-v2 候选：高频/被真实使用的项目配方）
  - `.avatar-lg`：12 次（5 文件）→ 跨项目出现 ≥2 或高频使用 → 评估晋升 L2 配方（三源登记）
  ```
- MCP `flywheel_report` 返回体新增 `projectExtensions`。

### 5.4 晋升流程（人工闸门）

```
飞轮报告候选 → 人工评估（通用语义？与现有配方是否重复？命名是否合规？）
  → 通过：recipes.css 新增配方 + whitelist-v2 登记 + prompt 重建（whitelist:check 三源闸门）
  → 不通过：留在项目层（约定文件本来就是正确归宿）
```

数据只产生候选，晋升必须人工确认——防止局部最优的 class 污染封闭集。

---

## 6. 安全与隐私

- 遥测新增 `extensions.classes` 仅为 class 标识符，与现有"保留 class 名用于白名单挖掘"的脱敏策略一致；**不落任何 CSS 声明/属性值**；
- `loadProjectClasses` 读文件失败一律静默回退 `[]`（lint 配置不能因约定文件缺失而崩）；
- MCP 探测范围仅限 cwd（项目自身），不向上/向下扫描。

## 7. 体积与命名约束

- `recipes.project.css` 不进库体积预算（项目资产）；脚手架模板初始为空（注释块），零 CSS 体积；
- 命名：class 一律 kebab-case、禁止 `af-` 前缀、禁止与 154 白名单重名（重名时登记无效——白名单优先，lint 行为不回归）。

## 8. 测试与 CI 接入

| 测试 | 断言 |
|---|---|
| `test/eslint-plugin/project-extension.test.js`（新增） | `projectClassesFromCss` 约定块解析/去重/块外忽略；`loadProjectClasses` 文件缺失回退 `[]`；`withProjectRules` 合并 extraClass 且保留 `af-data`；重名白名单优先 |
| `test/telemetry.test.js`（扩展） | `extensions` 字段写入/读回；空扩展不落字段 |
| `test/flywheel.test.js`（扩展） | `mineProjectExtensions` 聚合排序；报告含"项目扩展"章节 |
| `test/mcp.test.js`（扩展） | `detectProjectRecipes` 探测；携带约定文件时项目 class 检查通过且遥测含 extensions |
| `test/create-app.test.js`（扩展） | 脚手架生成 `recipes.project.css` 且 eslint.config.js 接线 |

CI 无新增步骤（现有 vitest / eslint / whitelist:check 自然覆盖）。
