# 组件库深度性能优化方案 v2（评审修订版）

> v1 评审结论：方向正确，但存在 **2 处不合理、3 处遗漏、2 处不满足 decision-complete**。本版逐项修正，并补齐 41 项完整类名映射表与 codemod 安全规格。
> 用户已确认的三项决策不变：①范围=全量（JS+CSS+charts）②类名简写含白名单 class ③首要产出=gzip 预算腾余量。

---

## 0. v1 → v2 修订摘要

| # | v1 问题 | 严重度 | v2 修正 |
|---|---|---|---|
| 1 | P2 计划重命名全部 ~164/185 个白名单 class。但原则 6 原文是"**特长**的类名要简写"——`btn`/`card`/`tag` 等短类改名零收益、最大化破坏面 | 高 | 收窄为 **41 个 ≥13 字符的特长类 + 家族一致性成员**，附完整映射表（§4.2） |
| 2 | P2 的 gzip 收益被高估（类名在模板字符串中出现一次，gzip 重复压缩后节省极小） | 高 | 重新定性：**P0 去重才是预算主力**（目标 0.2~0.5KB），P2 定位为原则 6 的一致性收益 + 小幅体积（~0.3-0.5KB），并给出诚实预估 |
| 3 | P1"批量简写私有变量"违反 AGENTS.md §0 最小改动原则，且 minify+gzip 后收益为零，还破坏 git blame | 高 | 删除批量改名；原则 4 仅在**因 P0/P2 触碰的行内顺手应用** |
| 4 | 无基线测量步骤，"完成"无法量化 | 中 | 新增 Step 0：改动前记录 size 全量数字 |
| 5 | 映射表"执行期再定"，不满足 decision-complete | 高 | 本文档即为唯一真相源（§4.2，41 项） |
| 6 | 未识别替换顺序陷阱：`list-item` 是 `list-item-compact` 的子串；`\bskeleton\b` 在正则中会**误伤 `af-skeleton-page` 标签名**（连字符是 \W，边界成立） | 致命 | codemod 强制 **token 边界正则** `(?<![a-z0-9-])旧名(?![a-z0-9-])` + **长名优先**排序（§4.3） |
| 7 | 验证清单缺 5 项 CI 闸门：`skill:check`、contrast（npm test 内含）、`test:e2e`、`eval:dry`、`build+publish:check` | 中 | P3 验证镜像 ci.yml 全部闸门（§6） |
| 8 | 未识别 `recipes-core/display/feedback/form.css` 是 `recipes.css` 的**五文件人工同步子集镜像**（CHANGELOG v6 明确"五配方文件同步"），v1 只写了个通配符 | 中 | 明确五文件必须同步重命名；并确认只有 `tokens+recipes+atomic` 三件进入构建与体积测量（build.mjs L46、size-check L230），子集文件不影响体积 |
| 9 | 迁移面遗漏：`site` 文档部分由 `gen-docs.mjs` 生成（`<!-- gen:start:api -->` 标记段），手改后须重跑 `docs:gen`；`.cursor/rules/*.mdc`、`AGENTS.md`、`README.md`、`prompt/models/*.md` 未列 | 中 | 补齐迁移面清单 + 豁免清单（§4.4） |
| 10 | "移除自闭合 `/>`"建议有解析风险（非 void 元素的自闭合在 HTML 解析中被忽略，等于未闭合标签），且 gzip 后收益可忽略 | 中 | 删除该项；仅保留 void 元素（input/img/br）顺手清理，明确标注收益可忽略 |
| 11 | 未声明 `--af-*` 组件级 CSS 变量（如 `--af-pi-cell-w`）是**消费端可覆盖的公开 API**（af-password-input.js L10 注释明示） | 中 | 加入"不改清单"；同理 `part` 属性值、`data-role` 值、事件名、公开 JS API 全部冻结 |
| 12 | v1 曾考虑删除组件内 `this._onXxx = ` 句柄赋值（视为冗余）——实际是**测试缝隙**：test/af-list.test.js L238 直接调用 `el._onTouchStart(...)` 模拟触摸 | 中 | 明确写入"禁止事项"（§5） |

---

## 1. Summary

- **对象**：`@af-mobile/ui` 全量——基类 + lib + 30 组件 + blocks + charts + L1/L2 CSS + 仓库内消费端资产（test/demo/e2e/starter/site/skills/prompt）。
- **六原则落位**：原则 1/2/3/5 → P0（结构性去重，预算主力）；原则 4 → 触碰行内顺手简写；原则 6 → P2（41 个特长类 breaking 简写）。
- **完成判据**：§6 全部 CI 闸门绿 + 基线对比表显示 CSS/total 真实下降。
- **版本**：1.5.0 → 2.0.0（breaking 类名变更）。

## 2. 现状与关键机制（探索核实版）

### 2.1 体积现状（size-check.mjs，minify+gzip 口径）
- 预算：CSS ≤6.0KB、base ≤2.0KB、单组件 ≤2.8KB、total ≤23.0KB、chartsTotal ≤15.0KB。
- 最近实测（2026-08-19 会话）：total 22.015KB（余量 ~1KB），**CSS 余量仅 ~10B**——CSS 是最紧的红线。
- 注意：**minify 会剥离 JS/CSS 注释**，故"删注释"不构成预算手段（v1 未犯此错，此处显式排除）。

### 2.2 白名单与三源同步链路（决定 P2 落地方式）
1. `whitelist-v1.json` 是**生成物**：`gen-whitelist.mjs` 扫描 `recipes.css` + `atomic.css`（class）、`tokens.css`（token）、`index.js`/`charts/index.js`（组件标签）。
2. 三源检查 A(源码)↔B(whitelist)↔C(Prompt 注入)：`check-whitelist-sync.mjs`，B 的 `af-mobileVersion` 必须等于 package.json 版本 → **版本号必须先于 `npm run whitelist` 提升**。
3. Prompt 资产链：源码 → `npm run prompt` 生成 `prompt/system-prompt.md` → `npm run pkg:assets`（sync-pkg-assets.mjs）同步镜像到 `prompt/assets/` 与 `mcp/assets/`（含 models 目录）。
4. ESLint 规则（token-whitelist/no-recipe-break）读生成的 JSON，重命名后自动跟随，无需改规则。

### 2.3 CSS 五文件镜像（v1 遗漏的事实）
`recipes.css` 为全量单一真相源（无 @import）；`recipes-core/display/feedback/form.css` 是**人工维护的子集镜像**（CHANGELOG v6："五配方文件同步……消除子集间漂移"）。进入构建/体积测量的只有 `tokens.css + recipes.css + atomic.css`（build.mjs L46、size-check.mjs L230、index.css）。→ **重命名必须五文件同步**，但子集文件不产生体积收益。

### 2.4 类名爆炸半径（grep 实测）
仅 3 个长类已波及 321 处/53 文件。本方案 41 类的重命名范围与豁免见 §4.4。

## 3. Step 0 —— 基线测量（新增）

改动前执行 `npm run size`，抄录并存档：CSS、base、total、chartsTotal、onDemand2、top2 组件名及数值（写入 CHANGELOG 的对照表初始列）。**无基线不开始。**

## 4. 执行计划

### P0 结构性体积优化（零破坏，预算主力）【原则 1/2/3/5】

**已定位的具体去重点（有行号证据）：**

| 位置 | 问题 | 动作 |
|---|---|---|
| [af-toast.js](file:///d:/projects/aiflow-ui/src/components/af-toast.js#L53-L77) `dismiss()` | if/else 两分支重复 6 行完全相同的清理（innerHTML 清空、_message/_exiting 复位、instance 判空、emit） | 合并为单路径：toastEl 存在时仅追加上面两个 setProperty，清理逻辑只写一次（原则 1） |
| [af-list.js](file:///d:/projects/aiflow-ui/src/components/af-list.js#L100-L105) 与 [L116-L119](file:///d:/projects/aiflow-ui/src/components/af-list.js#L110-L120) | `_render()` 空态分支与 `_renderSkeleton()` 重复"双 spacer 置零 + loadmore 清空" | 抽一个 3 行私有短函数 `_clearView()`（原则 3：高频短封装） |
| `recipes.css` | 存在声明块完全相同的多选择器可合并场景（esbuild minify 不做选择器合并，`.a,.b{}` 分组比两份重复声明 gzip 更小） | 审计指令：扫描相同声明块→选择器分组合并；逐块核对无特异性冲突后合并 |

**审计指令（不预设大收益，逐条核实后动手）：**
- 原则 2 原生化审计：库已高度原生化（dialog=showModal、picker=scroll-snap、action-sheet=popover），仅核对无残留手写惯性/rAF 循环可被原生替代；**无则不动**。
- 原则 5 冗余属性审计：仅删真正冗余（如 `type="text"` 默认值）；**`type="search"` 等有语义的保留**；所有 `aria-*` 一律保留（受 `wc-aria-required` + `aria:check` 约束，且 a11y 是硬约束）；void 元素 `/>` 顺手去掉（收益可忽略，不作为任务）。
- 原则 4：仅在上述触碰的函数内，顺手把超长局部变量改为常用缩写；**禁止全文件批量改名**。

**明确不做（禁止事项，§5 同）：**
- 不删 `this._onXxx = ...` 句柄赋值——它们是测试缝隙（test/af-list.test.js L238-251 直接调用）。
- 不删组件/库源码注释（minify 剥离，不占预算；删了伤维护性）。
- 不动 `--af-*` 组件级 CSS 变量（消费端覆盖 API）。

### P1（已取消为独立阶段）
v1 的"内部命名简写独立阶段"删除，理由见修订摘要 #3。相关动作并入 P0 审计指令。

### P2 白名单类名简写（breaking v2.0.0）【原则 6】

#### 4.1 简写规则（确定性）
1. **门槛**：白名单 class 总长 ≥13 字符 → 必改；<13 不动（`search-input`(12)、`navbar-fixed`(12)、`switch-thumb`(12) 等按此保留，除非被家族规则拉入）。
2. **家族一致性**：某家族任一成员改名，同根家族全部采用统一缩写词根，禁止 `skeleton` 与 `sk` 混用。
3. **词根缩写字典**（仅这 7 个词根缩写，其余词根一律保留）：`skeleton→sk`、`search-bar→sb`、`checkout-bar→cob`、`segmented→seg`、`collapse→clp`、`progress→pg`、`hairline→hl`。
4. **后缀缩写字典**：`content→ct`、`summary→sum`、`compact→cp`、`loading→ldg`、`trigger→tg`、`grid→gd`、`circle→cir`、`readonly→ro`、`success→ok`、`error→err`、`warning→warn`、`danger→dgr`、`block→blk`、`line→ln`、`page→pg`、`scroll→scr`、`text→tx`、`item→it`、`thumb→th`、`fixed→fx`。
5. **碰撞门**：新名在 recipe∪atomic 全集唯一；不与保留旧名冲突；不等于 HTML 标签名（`list-item` 因此不缩为 `li`）。
6. **例外**：`list-item`(9) 词根保留（原生标签 `li` 冲突 + 高频可读性），仅 `list-item-compact` 缩为 `list-item-cp`。

#### 4.2 完整映射表（41 项，本文档即唯一真相源）

> **⚠️ 执行结果修订（2026-08-19 执行时）**：实际执行 **33 项**。以下 8 项在执行阶段剔除：
> - `toast-success/warning/error`（3 项）：`af-toast.js` 运行时 `'toast-'+type` 动态拼接，文本替换不可达，改名会产生"静态类名新、动态类名旧"的分裂
> - `progress` 家族（5 项：`progress`/`progress-sm`/`progress-lg`/`progress-success`/`progress-danger`）：`<progress>` 原生标签与类名同名（token 边界正则防不住标签位）、`data-role="progress"` 是冻结 API、`progress-${color}` 动态拼接——三重冲突，整体不改
>
> 表格中 ~~删除线~~ 标记的 8 行为已剔除项。migration-guide UI v7 对照表与 CHANGELOG 均按 33 项口径记录。

| 旧 | 新 | | 旧 | 新 |
|---|---|---|---|---|
| skeleton | sk | | switch-loading | switch-ldg |
| skeleton-line | sk-ln | | switch-thumb | switch-th |
| skeleton-block | sk-blk | | notice-scroll | notice-scr |
| skeleton-block-h-sm | sk-blk-h-sm | | notice-text | notice-tx |
| skeleton-block-h-md | sk-blk-h-md | | ~~toast-success~~ | ~~toast-ok~~ |
| skeleton-circle | sk-cir | | ~~toast-warning~~ | ~~toast-warn~~ |
| skeleton-page | sk-pg | | ~~toast-error~~ | ~~toast-err~~ |
| skeleton-w-40 | sk-w-40 | | upload-trigger | upload-tg |
| skeleton-w-60 | sk-w-60 | | upload-grid | upload-gd |
| skeleton-w-80 | sk-w-80 | | list-item-compact | list-item-cp |
| search-bar-wrap | sb-wrap | | rate-readonly | rate-ro |
| search-bar-clear | sb-clear | | section-title | section-tt |
| search-bar-icon | sb-icon | | input-bar-fixed | input-bar-fx |
| checkout-bar | cob | | hairline-top | hl-t |
| checkout-bar-fixed | cob-fx | | hairline-bottom | hl-b |
| segmented | seg | | ~~progress~~ | ~~pg~~ |
| segmented-block | seg-blk | | ~~progress-lg~~ | ~~pg-lg~~ |
| segmented-item | seg-it | | ~~progress-sm~~ | ~~pg-sm~~ |
| collapse | clp | | ~~progress-danger~~ | ~~pg-dgr~~ |
| collapse-content | clp-ct | | ~~progress-success~~ | ~~pg-ok~~ |
| collapse-summary | clp-sum | | | |

**明确不改的白名单类（示例）**：`search-input`（表单级消费端 API，12 字符未达门槛）、`navbar-fixed`/`tabbar-fixed`（12，收益 3 字符不值破坏）、`btn-*`/`tag-*`/`step-*`/`spinner-*`/`checkbox-*`/`radio-*`/`rate-lg|sm|star`/`form-*`/`input-*`/`price-*`/`safe-*`/`stats-grid`/全部短原子类。

**冻结清单（绝对不改）**：token（`--*`）、组件标签（`af-*`，**codemod 防误伤重点**）、`part` 属性值、`data-role` 值（牵连 i18n 选择器映射表，如 af-search-bar.js L14 `'input.search-input'`）、`--af-*` 组件变量、事件名 `af-{组件}:{动作}`、公开 JS API（`$`/`$$`/`emit`/`_listen`/`defineProp`/组件属性）。

#### 4.3 codemod 规格（安全核心）
- 临时脚本 `scripts/rename-classes.tmp.mjs`（用后即删，不登记 npm scripts、不入 files 白名单）。
- **token 边界正则**：`(?<![a-z0-9-])旧名(?![a-z0-9-])`——连字符视为 token 内部字符，从而：`af-skeleton-page` 中的 `skeleton` 因前面是 `-` **不会被匹配**；`list-item` 不会误伤 `list-item-cp`。禁止用 `\b`（连字符属 \W，`\bskeleton\b` 会命中标签名，致命）。
- **长名优先**：映射表按旧名长度降序应用（`progress-danger→pg-dgr` 先于 `progress→pg`）。
- **执行范围**：`src/**/*.{js,css,d.ts}`（含 blocks/charts/五份 recipes CSS）、`test/**`、`demo/**`、`e2e/**`、`starter/src/**`、`site/**`、`skills/**`、`prompt/models/*.md`、`prompt/system-prompt.template.md`、`.cursor/rules/*.mdc`、`AGENTS.md`、`README.md`、`docs/migration-guide.md`。
  - **执行补漏**：`scripts/create-app.mjs`（脚手架生成的模板页含 `section-title`，v1 清单遗漏；ESLint 全闸门（AGENTS.md #9 范围含 scripts/）抓出后已一并替换为 `section-tt`）。`AGENTS.md`/`.cursor/rules/*.mdc` 经核只含组件标签引用、无类名残留，无需替换。
- **Markdown 安全**：md 文件中仅替换反引号包裹的 `` `类名` `` 形态，纯散文不替换。
- **豁免（历史档案，不迁移）**：`docs/design/**`、`docs/superpowers/**`、`CHANGELOG.md`（历史记录）、`eval/prompts.jsonl`（历史评测数据，CI 仅校验结构 `eval:dry`，类名过期不阻断；后续飞轮数据自然刷新）。
- **碰撞预检**：替换后 grep 新短名（`sk|sb|cob|seg|clp|pg|hl` 前缀）在 demo/playground/starter 自定义 CSS 中的撞名情况。

#### 4.4 执行顺序（严格串行，顺序错误即闸门红）
1. `package.json` 版本 1.5.0 → 2.0.0（版本戳检查前置条件）；
2. 跑 codemod（含五份 recipes CSS 同步）；
3. `npm run whitelist` 重建 B；
4. `npm run prompt` 重建 C（system-prompt.md）；
5. `npm run pkg:assets` 同步 `prompt/assets/` + `mcp/assets/`；
6. `npm run docs:gen` 刷新 site 组件文档 API 段；
7. `docs/migration-guide.md` 写入 41 项 v1→v2 对照表；CHANGELOG 记 breaking + 基线对照数据；
8. P3 全量验证。

## 5. 禁止事项（AGENTS.md 对照）

- 禁删 `aria-*` 与焦点陷阱/还原逻辑（AGENTS.md #2/#3，`aria:check` 闸门）。
- 禁用 `eslint-disable` 绕过；禁 skip 测试；禁调大预算（本次目标是腾余量，预算只降不升）。
- 禁删 `this._onXxx` 测试缝隙句柄（test/af-list.test.js L238 依赖）。
- 禁手改 `whitelist-v1.json`/`prompt/system-prompt.md`（生成物，走 §4.4 链路）。
- 禁在 Light DOM 组件引入内联 style / Shadow DOM 硬编码颜色（AGENTS.md 场景 C/D）。

## 6. P3 验证（镜像 ci.yml 全闸门，缺一不可）

```bash
npm run whitelist:check   # 三源同步（v2.0.0 版本戳）
npm run types:check
npm run prompt:check
npm run aria:check
npm run skill:check       # v1 遗漏
npm run size              # total ≤23.0 / CSS ≤6.0 / base ≤2.0 / charts ≤15.0，且较 Step 0 基线下降
npm test                  # contrast + vitest 全绿（v1 遗漏 contrast）
npm run test:e2e          # Playwright（v1 遗漏，renamed class 已随 codemod 迁移）
npx eslint src/ test/ scripts/ eval/ mcp/ eslint-plugin-af-mobile/ adapters/ starter/src/ --max-warnings 0
npm run build && npm run publish:check
npm run eval:dry          # v1 遗漏
```

## 7. 交付物与验收
1. 全部闸门绿 + **Step 0 基线 vs 终态对照表**（CHANGELOG 内，CSS/base/total/chartsTotal 四列）。
2. `docs/migration-guide.md` 附 33 项对照表（41 项计划 − 8 项执行期剔除，见 §4.2 修订）。
3. 热路径组件行为零回退（e2e：swiper/picker/pull-refresh/swipe-cell/dialog/popover 全过）。
4. 诚实预期管理：P0 目标 CSS 恢复 ≥0.2KB 余量、total 下降 0.2~0.5KB；P2 合计贡献 ~0.3-0.5KB；总计腾出 **0.5~1.0KB** 余量（不夸大，以实测为准）。

### 7.1 执行结果实录（2026-08-19，终态）

**闸门**：CI 全闸门 14 项全绿（whitelist/types/prompt/aria/skill/size/test/e2e/eslint/build/publish:check/eval:dry；vitest 1180/1180、e2e 37/37、eslint 0 error 0 warning）。

**收益实测 vs 预期（诚实记录）**：
| 指标 | 基线 1.5.0 | 终态 2.0.0 | 实测 | §7.4 预期 |
|------|-----------|-----------|------|-----------|
| L1+L2 CSS | 5.990KB | 5.969KB | **-21B** | P0 恢复 ≥0.2KB —— **未达成** |
| 全量 JS | 22.015KB | 22.004KB | **-11B** | 下降 0.2~0.5KB —— **未达成** |

- **CSS 合并负收益**：P0 的"相同声明块合并"经实测 gzip 后反而**变大**（重复声明已被 gzip 字典压缩，抽象选择器组引入新字面量抵消收益），已回退；仅保留 JS 结构性去重（af-toast 单路径 dismiss、af-list `_clearView()`）。
- **结论**：本方案的真实收益是**原则一致性**（33 个特长类名短写、HTML 传输与源码可读性改善）与**结构性去重**（2 处重复代码路径消除），gzip 体积收益为个位数字节，远低于预估。体积预算余量充足（total 22.004/23KB、CSS 5.969/6KB），无超支风险，**不为凑体积收益做进一步破坏性改动的决定正确**。
- **镜像同步**：四个子集镜像（recipes-core/display/form/feedback.css）已随 codemod 同步；`skeleton-shimmer` keyframes 名未改（非类名，两文件一致）；`chart-skeleton` 为 charts 独立命名空间，不在白名单，未改。

## 8. 风险与回退
- **最大风险：codemod 误伤** → token 边界正则 + 长名优先 + codemod 后先跑 `npx vitest run` 快速冒烟再进 §4.4 后续步骤；P2 全程单独 commit（codemod/P0 分开），可整体 revert。
- **子集镜像漂移** → 五文件同步由 codemod 一次性保证；后续 `check-whitelist-sync` 只扫 recipes.css，镜像无自动闸门，CHANGELOG 中显式声明本次已同步。
- **消费端破坏** → 2.0.0 major + migration-guide 对照表兜底；README/AGENTS 示例同步更新。
- **若 P0 审计发现可合并声明块远少于预期** → 接受较小收益，如实报告基线对比，不为凑数做破坏性改动。
