# k 层治理与修复计划（报警器 → 决策登记 → 冻结善后 → AGENTS 分层）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 堵住已发布 `@af-mobile/ui/k` 入口上的占位符静默失败（报警器），建立决策登记簿（DECISIONS.md，首条 = k 去留），按"冻结"善后 k 文档，AGENTS.md 分层瘦身到 ≤100 行。

**Architecture:** 五个阶段严格按共识顺序：Phase 0 烟雾报警器（决策无关、最小改动、只告警不改行为）→ Phase 1/2 DECISIONS.md（D-001 k 去留 + D-002 双 html 分歧 + D-003/D-004 黑名单补登记）→ Phase 3 k 冻结善后（文档 + 词表卡定版，**前置 checkpoint：用户确认 D-001=A**）→ Phase 4 AGENTS.md 分层（根 ≤100 行 + incidents.md 承载细节）→ Phase 5 延后项清单。运行时代码只动 `src/k/flow.js` 一个文件（+~15 行），其余全是文档与登记。

**Tech Stack:** 现有栈（vitest + jsdom、esbuild size-check、changesets）。无新依赖。

**背景事实（2026-08-26 核查）：**
- `src/k/flow.js:38` 属性位绑定用前缀正则 `/^\u0001(\d+)\u0001/`（无 `$` 锚定）：带引号混合值 `class="btn ${x}"` 占位符按字面量留在属性值；前缀形 `class="${x} btn"` 部分命中但静态部分静默丢失；属性名位插值 `<div ${name}="v">` 绑定整体被忽略——三类全是静默失败
- `@af-mobile/ui/k` 已随 v1.7.0 发布到 npm（CHANGELOG L19），且词表卡 `attr=${x}`（无引号）是合法语法，报警器**不得**对它误报
- k 体积预算 2.0KB gzip（size-check.mjs L107），当前 1.352KB
- r2 实验未运行（仅协议无 results）；k 在仓库内零消费方（仅 test/k.test.js 与 size-check.mjs）；官方 starter 走 createPage + :bind
- `scripts/create-app.mjs` **不复制**根 AGENTS.md（脚手架的 AGENTS.md 由 skill-add.mjs 独立生成），根 AGENTS.md 瘦身对消费端零影响
- 根 AGENTS.md 末尾 `<!-- af-mobile:skill-grill -->` marker 块由 skill-add.mjs 幂等管理，**必须原样保留**
- CI 注释引用旧锚点：`.github/workflows/ci.yml` L49（AGENTS.md #5）、L90（AGENTS.md #9）

---

## 文件清单

| 文件 | 操作 | 职责 |
|---|---|---|
| `src/k/flow.js` | 修改（+~15 行） | 占位符位置校验报警器（缓存 miss 时执行一次） |
| `test/k.test.js` | 修改（追加 1 个 describe） | 报警器 4 个用例 |
| `.changeset/k-placeholder-alarm.md` | 新建 | patch 级 changeset |
| `docs/DECISIONS.md` | 新建 | 决策登记簿（D-001 ~ D-004） |
| `src/k/README.md` | 新建 | k 层文档：双 html 对比 + 词表卡定版 + 禁区说明 |
| `README.md` | 修改 | k 子库小节（chat 之后）+ 设计文档区加 DECISIONS 链接 |
| `docs/incidents.md` | 新建 | 承接 AGENTS.md 迁出的细节层（11 条反模式 + 边界详表 + checklist + 飞轮） |
| `AGENTS.md` | 重写（340 行 → ≤100 行） | 根宪章：原则 + 门禁 + 指针，marker 块原样保留 |
| `.github/workflows/ci.yml` | 修改（仅注释） | 两处旧锚点引用改为 docs/incidents.md |

---

## Task 0: 环境准备与基线

- [ ] **Step 1: 安装依赖**

Run: `cd /workspace && npm ci`
Expected: 安装成功（沙箱无 node_modules，首次必跑）

- [ ] **Step 2: 基线测试全绿**

Run: `npx vitest run`
Expected: 全部用例 PASS（含 test/k.test.js 既有用例），记录用例总数作基线

---

## Phase 0: 烟雾报警器（决策无关，立即做）

### Task 1: 写失败测试

**Files:**
- Modify: `test/k.test.js`（文件末尾追加）

- [ ] **Step 1: 追加测试 describe 块**

在 `test/k.test.js` 文件末尾（`k 重导出响应式核心` describe 之后）追加：

```js
describe('k 模板占位符位置校验（报警器：坏位置响亮失败）', () => {
  it('属性值混合插值（带引号）：缓存 miss 时告警一次，占位符按字面量留在属性值', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const f = html`<div class="btn ${'x'}"></div>`;
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('class');
    // 行为不变（只告警不拦截）：占位符留在属性值里
    expect(f.querySelector('div').getAttribute('class')).toContain('\u0001');
    warn.mockRestore();
  });

  it('属性名位插值：告警一次，绑定被忽略', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    html`<div ${'data-x'}="v"></div>`;
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('合法绑定不告警：无引号完整值 / @ev / .prop / 子位混合文本', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = signal('a');
    html`<a href=${() => s()} @click=${() => {}} .title=${'t'}>a${1}b</a>`;
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('相同模板二次渲染走缓存，不重复告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    html`<i class="a${'b'}"></i>`;
    html`<i class="a${'b'}"></i>`;
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run test/k.test.js`
Expected: 前两个用例 FAIL（`expected 1, received 0`——当前无告警）；后两个 PASS（无告警时 not.toHaveBeenCalled 平凡通过）

### Task 2: 实现报警器

**Files:**
- Modify: `src/k/flow.js`

- [ ] **Step 1: 在 `html()` 函数之后、`bindAttrs` 之前插入两个定义**

```js
// 报警器用锚定校验：占位符必须完整占据属性值（与 bindAttrs 的前缀匹配刻意不同）
const FULL_PLACEHOLDER = /^\u0001\d+\u0001$/;
// 烟雾报警器（模板缓存 miss 时执行一次，天然去重）：
// 两类坏位置的插值在 bindAttrs 前缀正则下静默失败——
//   ① 属性名位（<div ${name}="v">）：绑定被整体忽略
//   ② 带引号混合值（class="btn ${x}" / class="${x} btn"）：占位符留字面量或静态部分丢失
// 只告警不拦截，不改变现行绑定行为
function warnBadPlaceholders(root) {
  for (const el of root.querySelectorAll('*')) {
    for (const a of el.attributes) {
      if (a.name.includes(SENT)) {
        console.warn(`[k] 属性名位不支持插值（${JSON.stringify(a.name)}）：绑定将被忽略`);
      } else if (a.value.includes(SENT) && !FULL_PLACEHOLDER.test(a.value)) {
        console.warn(`[k] 属性 ${a.name} 为混合插值：仅支持完整属性值绑定（attr=${'${x}'} 无引号形态），静态部分或整条绑定将丢失`);
      }
    }
  }
}
```

注意：warn 消息里 `${'${x}'}` 是转义写法，输出字面量 `${x}`。

- [ ] **Step 2: 在 `html()` 的缓存 miss 分支挂载校验**

`src/k/flow.js` 中 `html()` 函数（L18-32）改为（仅加一行 `warnBadPlaceholders(tpl.content);`）：

```js
export function html(strings, ...vals) {
  const key = strings.join(SENT);
  let tpl = cache.get(key);
  if (!tpl) {
    tpl = document.createElement('template');
    tpl.innerHTML = strings.reduce((s, str, i) => s + (i ? `\u0001${i - 1}\u0001` : '') + str, '');
    warnBadPlaceholders(tpl.content);
    cache.set(key, tpl);
  }
  const root = tpl.content.cloneNode(true);
  const disposers = [];
  bindAttrs(root, vals, disposers);
  bindKids(root, vals, disposers);
  root._clean = () => disposers.forEach(d => d());
  return root;
}
```

**禁止改动**：`bindAttrs` L38 的前缀正则（改锚定会变更已发布行为——前缀形 `class="${x} btn"` 当前会绑定动态部分，报警器只负责让它响亮）。

- [ ] **Step 3: 跑测试确认通过**

Run: `npx vitest run test/k.test.js`
Expected: 全部 PASS（含既有用例——既有模板无坏位置，不触发告警）

### Task 3: Phase 0 门禁 + changeset + 提交

- [ ] **Step 1: ESLint（src 无 no-console 规则，src/lib/bind.js:70 有 console.warn 先例）**

Run: `npx eslint src/k/flow.js test/k.test.js --max-warnings 0`
Expected: 0 error 0 warning

- [ ] **Step 2: 体积（k 预算 2.0KB，当前 1.352KB，预期增量 ~0.1KB）**

Run: `npm run size`
Expected: `k 渲染层 ✓`，未超 2.0KB

- [ ] **Step 3: prompt 同步（改了 src/ 必跑）**

Run: `npm run prompt:check`
Expected: PASS

- [ ] **Step 4: 新建 `.changeset/k-placeholder-alarm.md`**

```
---
"@af-mobile/ui": patch
---

`@af-mobile/ui/k` 模板占位符位置校验：属性名位插值（`<div ${name}="v">`）与带引号混合值插值（`class="btn ${x}"`）此前静默丢失绑定，现于模板首次解析时 console.warn 一次（模板缓存级去重）。仅告警，不改变绑定行为。
```

- [ ] **Step 5: 提交**

```bash
git add src/k/flow.js test/k.test.js .changeset/k-placeholder-alarm.md
git commit -m "fix(k): warn on misplaced template placeholders (attr-name / quoted mixed-value)"
```

---

## Phase 1: DECISIONS.md（首条 = k 去留 + 双 html 分歧）

### Task 4: 创建决策登记簿（D-001 / D-002）

**Files:**
- Create: `docs/DECISIONS.md`

- [ ] **Step 1: 写入完整文件内容**

```markdown
# 决策登记簿（DECISIONS）

> 结构性"砍 / 留 / 复活"决策的唯一登记处。每条三要素：**决策 / 理由 / 放弃了什么**。
> 新条目追加到末尾，不改历史条目（推翻旧决策 = 新开一条并回链旧编号）。
> 复活曾被砍的能力（黑名单项）必须先在此登记再动代码。

| 编号 | 日期 | 状态 | 决策 |
|---|---|---|---|
| D-001 | 2026-08-26 | 待决策 | k 层定位：A 冻结 / B 推广为应用层 / C 移除 |
| D-002 | 2026-08-26 | 随 D-001 | 双 `html\`\`` 同名不同义的处理 |

---

## D-001 k 层定位（待决策）

`@af-mobile/ui/k`（v1.6.0 引入，v1.7.0 已实际发布到 npm）当前是 10 词可选渲染层（html\`\` + Show/For/Switch + render/clean + state 原语），不是应用层。

**决策输入（2026-08-26 仓库核查事实）：**
1. r2 跨模型实验未运行（experiments/r2 仅有协议文件，无 results/）——"-24% 会话成本"只有 B3 单模型支撑
2. k 在仓库内零消费方（仅 test/k.test.js 与 size-check.mjs 引用；官方 starter 走 createPage + :bind 路线）
3. v1.7.0 已发布含 `./k` 入口——移除或改名是 semver-major 级 breaking

**选项与成本：**

| 选项 | 适用判断 | 主要成本 |
|---|---|---|
| A. 冻结为可选渲染层（判据补齐前的默认执行态） | WC 组件库是主产品，k 是 B3 实验副产品 | 双 html 分歧靠文档消解（D-002）；不强制改名 |
| B. 推广为应用层 | B3 -24% 被认为是第二曲线且 r2 跨模型复现成立 | 需补闭环（res/route 重导出、bind 指令位、k 层 lint、词表卡发布）+ r2 补跑，与 WC 库争夺维护带宽 |
| C. 移除 / 移出主包 | k 是实验残留 | semver-major breaking；废弃 B3 积累 |

**判据：** ① r2 补跑数据（全模型 B/A 成本比 ≤85% 且词表幻觉率达标，见 experiments/r2/README.md 判定表）② npm 下载构成（若以组件库消费为主，B 服务于不存在的用户群）。

**在判据补齐前按 A 执行**（文档善后，不动运行时）。

## D-002 双 `html\`\`` 同名不同义（随 D-001 联动）

主包 `html\`\``（src/lib/html.js）返回转义字符串配 innerHTML；k 的 `html\`\``（src/k/flow.js）返回真实 DOM。同名不同义共存于一个包：从错误路径 import **不报错**——主包返回字符串，`el.append(str)` 合法，渲染出字面量 HTML 文本。

- D-001=A：文档消解（src/k/README.md 首段对比表 + 根 README 警示）；改名留待下一个 major 一并评估
- D-001=B：统一语义或改名（如 `dom\`\``）随推广一并做
- D-001=C：自然消解
```

- [ ] **Step 2: 提交**

```bash
git add docs/DECISIONS.md
git commit -m "docs: add DECISIONS registry with D-001 (k layer positioning) and D-002 (dual html``)"
```

---

## Phase 2: 黑名单复活补登记（决策无关）

### Task 5: 追加 D-003 / D-004

**Files:**
- Modify: `docs/DECISIONS.md`

- [ ] **Step 1: 索引表追加两行**

```markdown
| D-003 | 2026-08-26 | 已决：保留 | router 守卫（beforeEach/afterEach） |
| D-004 | 2026-08-26 | 已决：保留 | i18n 完整模块 |
```

- [ ] **Step 2: 文件末尾追加两节**

```markdown
## D-003 router 守卫保留（已决）

- **决策**：beforeEach/afterEach 守卫保留在主包 router.js。
- **理由**：P0 生产要素设计（docs/design/p0-production-essentials-design.md）将 guard 列入 Router 范围；starter 登录页依赖 beforeEach 重定向（docs/blog/starter-tech-choices.md）。
- **放弃了什么**：无——本仓库设计从未砍过守卫。此条为既成事实的集中登记（外部评审曾质疑为"黑名单复活"，核查后证据链完整，缺的只是集中登记，非决策缺失）。

## D-004 i18n 完整模块保留（已决）

- **决策**：保留 lib/i18n.js（~6.7KB）+ with-i18n + 组件映射表。
- **理由**：组件库面向真实用户需要国际化；有完整设计 spec（docs/superpowers/specs/2026-08-10-i18n-design.md）+ plan + 单测 + e2e。
- **放弃了什么**：ICU MessageFormat、复数、懒加载语言包、嵌套 key（spec 的 YAGNI 非目标清单明确砍掉）。
```

- [ ] **Step 3: 提交**

```bash
git add docs/DECISIONS.md
git commit -m "docs: register D-003/D-004 (router guards, i18n) as documented decisions"
```

---

## Phase 3: k 冻结善后（checkpoint 前置）

### Task 6: 决策 checkpoint（人工门，不写代码）

- [ ] **Step 1: 向用户出示 D-001 三选项与判据，确认是否按 A（冻结）执行**

- 若确认 A → 继续 Task 7-9
- 若选 B → 本 Phase 中止：B 的前置是 r2 补跑（Phase 5 延后项），闭环实现另行规划
- 若选 C → 本 Phase 中止：需 semver-major 版本计划（deprecation 周期 + `./k` 入口移除公告），另行规划

### Task 7: 创建 src/k/README.md（词表卡定版 + 双 html 警示）

**Files:**
- Create: `src/k/README.md`（随包发布——package.json 无 files 白名单，src 全量入库）

- [ ] **Step 1: 写入完整文件内容**

````markdown
# @af-mobile/ui/k —— 可选声明式渲染层

> 定位：主库 innerHTML 字符串渲染之外的**可选**渲染层（独立入口，不进主包 index.js）。
> 状态：**冻结维护**（见仓库 docs/DECISIONS.md D-001）——修 bug 会做，不再扩词表。

## 与主包 `html\`\`` 的区别（勿混用）

| | 主包 `html\`\``（`@af-mobile/ui`） | k 的 `html\`\``（`@af-mobile/ui/k`） |
|---|---|---|
| 返回 | 转义**字符串**，配 innerHTML | 真实 **DOM**（DocumentFragment） |
| 插值 | 自动转义（XSS 安全） | 不进 HTML 解析（无 XSS 面），值原样插入 |
| 响应式 | 无（一次性渲染） | signal getter 细粒度更新 |

从错误路径 import **不会报错**：主包 html 返回字符串，`el.append(str)` 合法但渲染出字面量文本。认准 `@af-mobile/ui/k`。

## 词表卡（全部能力 = 以下 API，无其他）

导入：`import { html, signal, computed, effect, batch, Show, For, Switch, render, clean } from '@af-mobile/ui/k'`

`html\`\`` 返回真实 DOM。四种绑定：

1. 子位 `${x}`：文本/节点/数组；传函数（signal/getter）则响应式更新，返回数组渲染多节点
2. 事件 `@ev=${fn}`：addEventListener
3. DOM 属性 `.prop=${x}`：直赋 property（input.value / list.data 等）
4. HTML 属性 `attr=${x}`：setAttribute；null/false 移除，true 置空

```js
import { html, signal, render } from '@af-mobile/ui/k';
const n = signal(0);
const un = render(html`<p @click=${() => n.set(v => v + 1)}>${() => n()}</p>`, '#app');
un(); // 卸载并清理全部副作用
```

- `signal(v)`：读 `s()`，写 `s.set(v)`（可传 fn(旧值)）；set 后 DOM 同步更新
- `computed(fn)`：派生，只读；`effect(fn)`：副作用，创建即执行一次，依赖变化重跑；`batch(fn)`：合并多次 set 只触发一次更新
- `Show({ when: fn, kids: () => html\`\` })`：when() 真值时渲染 kids
- `For({ each: fn, key, kids: (item) => html\`\` })`：keyed 列表
- `Switch({ when: fn, cases: { a: () => html\`\` }, def: () => html\`\` })`：分支，def 兜底
- `render(app, el)`：app 为 html\`\` 或 () => html\`\`，渲染进 el（可为选择器），返回 unmount
- `clean(fn)`：注册清理

Show/For/Switch 返回节点，可直接放 `${}` 子位。

**For 的 key 边界**：key 为字段名字符串，省略则以项本身为键——对象项省略 key 时**以引用为键，引用变则整行重建**；需要稳定复用请显式传 `key: 'id'`。

## 占位符禁区（触发 console.warn）

- 属性名位插值：`<div ${name}="v">` —— 绑定被整体忽略
- 带引号混合值：`class="btn ${x}"` / `class="${x} btn"` —— 占位符留字面量或静态部分丢失

合法形态只有：`attr=${x}`（无引号完整值）、`@ev=${fn}`、`.prop=${x}`、子位 `${x}`。

## 常见框架幻觉（这些写法不存在）

`on:click` / `class:` / `use:`（Solid）、`.value`（Vue ref）、`createSignal` / `createEffect`（Solid）。k 的 signal 读 `s()` 写 `s.set(v)`。
````

- [ ] **Step 2: 提交**

```bash
git add src/k/README.md
git commit -m "docs(k): add README with frozen vocabulary card and dual-html`` warning"
```

### Task 8: 根 README 加 k 小节

**Files:**
- Modify: `README.md`（`## AI 对话子库` 之后、`## SSR / Hydration 使用指南` 之前插入；`## 设计文档` 区追加 DECISIONS 链接）

- [ ] **Step 1: 插入 k 小节**

```markdown
## k 渲染子库（@af-mobile/ui/k，冻结维护）

可选声明式渲染层：`html\`\`` 返回真实 DOM + signal 细粒度更新（10 词极简 API）。

```js
import { html, signal, render } from '@af-mobile/ui/k';
const n = signal(0);
render(html`<p @click=${() => n.set(v => v + 1)}>${() => n()}</p>`, '#app');
```

注意：k 的 `html\`\`` 与主包 `html\`\``（返回转义字符串）**同名不同义**，对比表与完整词表卡见 [src/k/README.md](./src/k/README.md)。定位与去留决策见 [docs/DECISIONS.md](./docs/DECISIONS.md)（D-001）。
```

- [ ] **Step 2: `## 设计文档` 小节列表末尾追加一行**

```markdown
- [DECISIONS.md](./DECISIONS.md) —— 砍/留/复活决策登记簿
```

- [ ] **Step 3: 提交**

```bash
git add README.md
git commit -m "docs: add k sublibrary section and DECISIONS link to README"
```

### Task 9: 回填 D-001 决策状态

**Files:**
- Modify: `docs/DECISIONS.md`

- [ ] **Step 1: 索引表 D-001 行改为**

```markdown
| D-001 | 2026-08-26 | 已决：A 冻结（判据补齐可重开） | k 层冻结为可选渲染层，文档善后，不扩词表 |
```

- [ ] **Step 2: D-001 正文"待决策"标题改为"已决：A 冻结"，末尾追加**

```markdown
**决策结果（2026-08-26）**：A 冻结。依据：判据①（r2 数据）尚不存在 + 判据②（仓库内零消费方、starter 未采用）现状指向"服务于不存在的用户群"。重开条件：r2 补跑达标（B/A ≤85% 且幻觉率合格）或出现真实 k 消费需求。
```

- [ ] **Step 3: 提交**

```bash
git add docs/DECISIONS.md
git commit -m "docs: record D-001 decision (freeze k layer)"
```

---

## Phase 4: AGENTS.md 分层瘦身

### Task 10: 创建 docs/incidents.md（承接迁出内容）

**Files:**
- Create: `docs/incidents.md`

- [ ] **Step 1: 新建文件，头部 + 迁入内容按下表**（源内容从现 AGENTS.md **原文照搬**，仅编号层级顺延）

| 现 AGENTS.md 章节 | incidents.md 去向 |
|---|---|
| §1 禁止再犯反模式清单（#1-#11 全文） | 「一、返工反模式（11 条）」原文照搬 |
| §3.1 两套规则集对照表 + §3.2 配置位置 + §3.3 场景 A-D | 「二、库 vs 消费端详细边界」原文照搬 |
| §4 修改 checklist（四类文件） | 「三、修改 checklist」原文照搬 |
| §5.2 命令行等价物 + §5.3 边界与隐私 | 「四、数据飞轮接入细节」原文照搬 |

头部内容：

```markdown
# 返工案例与详细规则（incidents）

> 本文件是根 [AGENTS.md](../AGENTS.md) 的细节层：11 条返工反模式、库/消费端详细边界、
> 修改 checklist、数据飞轮接入细节。根宪章只保留原则 + 门禁 + 指针，本文件按需读取。
> 新增反模式条目时编号顺延（当前 #1-#11），并同步更新根 AGENTS.md 的指针。
```

- [ ] **Step 2: 提交**

```bash
git add docs/incidents.md
git commit -m "docs: extract incidents/detailed rules from AGENTS.md"
```

### Task 11: 重写根 AGENTS.md（≤100 行）

**Files:**
- Rewrite: `AGENTS.md`

- [ ] **Step 1: 用以下完整内容替换整个文件**（marker 块原样保留在末尾）

```markdown
# AGENTS.md — AI 协作宪章（根）

> 全仓 AI 代理强制守则：**原则 + 门禁 + 指针**。细节层（返工案例/详细边界/checklist）在
> docs/incidents.md，按需读取，不默认注入。本文件优先级高于 System Prompt 与历史对话，
> 与细节层冲突时以本文件为准。

## 0. 核心原则

1. **先读后写**：修改任何文件前先 Read；不理解现有代码不动手。
2. **最小改动**：只改被要求的代码；不顺手重构、不补文档、不加未要求的注释/类型。
3. **自检前置**：交付前跑完 §1 全部门禁，全绿才交付；不等人工 review 兜底。
4. **规则边界**：库开发（src/）与消费端适用不同规则集（§2）；搞混 = 产出错误代码。
5. **坦白须定位**：自报偏差必须给出对应规则文件路径+行号或文档出处；拿不出引用 = 未根因定位，坦白不算数。

## 1. 提交门禁（全部通过才能交付）

```bash
# ESLint（全目录，0 warning 0 error）
npx eslint src/ test/ scripts/ e2e/ prompt/ eval/ mcp/ eslint-plugin-af-mobile/ adapters/ starter/src/ --max-warnings 0
# 单元测试全绿
npx vitest run
# 体积 + 白名单三源 + 类型 + ARIA（一体化）
npm run size && npm run whitelist:check && npm run types:check && npm run aria:check
# Prompt 快照（修改了 src/ 或 prompt/ 时必跑）
npm run prompt:check
```

失败处理：ESLint 逐条修（禁 disable，测试夹具例外）；测试修代码或快照（禁 skip）；体积超预算优化实现（禁调预算，除非用户同意）；白名单/类型/ARIA 不同步就补齐（禁删检查）。
仅当改了 `scripts/build.mjs`、package.json 的 exports/main/module、或新增导出路径时，才需额外 `npm run build && npm run publish:check`。

## 2. 库 vs 消费端：快速判断

```
代码在哪个目录？
├─ src/components/af-*.js
│  ├─ Light DOM 组件？→ 禁 this.style / <style>，用 data-role + recipes.css
│  └─ Shadow DOM 组件？→ CSS 必须 var(--*)，动画必须加 prefers-reduced-motion
├─ src/*.css → tokens.css 变量禁他处重定义；recipes.css 新增 class 必须同步三源白名单
├─ test/ scripts/ 等目录 → 受完整 AI 规则约束（token 白名单 / 禁内联 style / 禁 Tailwind 语法）
└─ 仓库外消费端 → 只能用白名单 class + af-* 标签；先跑脚手架（§3）
```

详细对照表、配置位置、常见搞混场景 A-D：docs/incidents.md「二」。组件源码 checklist（含 XSS 转义 / 焦点陷阱 / 键盘导航 / _listen 登记等硬性要求）：docs/incidents.md「三」。

## 3. 消费端项目必须用脚手架（铁律）

- 库开发态：`node scripts/create-app.mjs <dir>`；已发布包：`npm create af-mobile <dir>`
- AI 只能覆盖 `src/pages/*.js`、`src/main.js`、`src/styles.css`、`src/store.js` 等业务文件；**禁止手写** package.json / index.html / vite.config.js / eslint.config.js / .gitignore
- 判断：目录已存在且含 AGENTS.md/skills/ → 直接进业务覆盖；空目录 → 必须先跑脚手架

## 4. AI 工具接入（数据飞轮，零 LLM 配置）

推荐流：MCP `get_prompt` 拿裁剪 prompt → 生成 → `check_compliance` 验证 → 按建议改到 passed:true。
CLI 等价：`node scripts/lint-flywheel.mjs <path>` / `npx @af-mobile/prompt "需求"`（MCP 不可达时降级）。
遥测不出本机、不含代码内容；边界与隐私详见 docs/incidents.md「四」。

## 5. 结构性决策登记

砍 / 留 / 复活类决策一律登记 `docs/DECISIONS.md`（决策 / 理由 / 放弃了什么）；复活黑名单项必须先补登记再动代码。

<!-- af-mobile:skill-grill -->
## af-mobile 对话式脚手架（af-mobile-grill skill）

当用户想用 af-mobile（@af-mobile/ui）开发移动端 H5 应用，或提供 hi-fi/demo 页面要转成项目时，
先完整阅读并遵循 `skills/af-mobile-grill/SKILL.md` 的流程：拷问需求 → 需求拆分表 → demo 确认
→ 一次性生成工程。未经用户确认需求拆分表和 demo，不要直接生成工程代码。
<!-- /af-mobile:skill-grill -->
```

- [ ] **Step 2: 验证行数**

Run: `wc -l /workspace/AGENTS.md`
Expected: ≤100 行

- [ ] **Step 3: 提交**

```bash
git add AGENTS.md
git commit -m "docs: split AGENTS.md into root charter (<=100 lines) + incidents detail layer"
```

### Task 12: 修正旧锚点引用

**Files:**
- Modify: `.github/workflows/ci.yml`（L49、L90 注释）

- [ ] **Step 1: 两处注释改动**

L49：`# Step 1d: ARIA 要求同步（JSON 声明 ↔ 规则 JS 检测分支，AGENTS.md #5）` → `# Step 1d: ARIA 要求同步（JSON 声明 ↔ 规则 JS 检测分支，docs/incidents.md #5）`

L90：`# 范围覆盖全部含 JS 的目录（含 e2e spec / prompt CLI / eslint-plugin-af-mobile 工作区与 .mjs，AGENTS.md #9）` → `# 范围覆盖全部含 JS 的目录（含 e2e spec / prompt CLI / eslint-plugin-af-mobile 工作区与 .mjs，docs/incidents.md #9）`

- [ ] **Step 2: 全仓核查残留的旧锚点引用**

Run: `npx eslint scripts/ --max-warnings 0 && npx vitest run test/check-aria-sync.test.js test/create-app.test.js test/create-shell.test.js test/skill-add.test.js`
Expected: PASS（create-app/skill-add 不读根 AGENTS.md 内容，仅 marker 幂等判断，瘦身零影响）

- [ ] **Step 3: 提交**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: update stale AGENTS.md anchor references to docs/incidents.md"
```

---

## Phase 5: 延后项（本计划不做，登记在案）

| 项 | 前置条件 | 载体 |
|---|---|---|
| r2 跨模型实验补跑 | 按 experiments/r2/README.md 协议执行 | D-001 判据① |
| k 层 3 条 lint 规则（裸 && 渲染 / For 缺 key / 模板内对象字面量插值） | D-001 改判 B | 新计划 |
| bind 指令位实现（或 lint 拦截） | D-001 改判 B | 新计划 |
| res/route 从 k 入口重导出 | D-001 改判 B | 新计划 |
| 全仓 llms.txt（组件库级） | 独立评估 | 新计划 |
| 导师—学徒协议（任务卡 schema / SOP / 熔断） | B4 实验设计时 | B4 计划 |
| AGENTS.md 改名评估（k html → dom``） | 下一个 semver-major | D-002 |

### Task 13: 最终全量门禁

- [ ] **Step 1: 跑 §1 全部门禁**

Run: `npx eslint src/ test/ scripts/ e2e/ prompt/ eval/ mcp/ eslint-plugin-af-mobile/ adapters/ starter/src/ --max-warnings 0 && npx vitest run && npm run size && npm run whitelist:check && npm run types:check && npm run aria:check && npm run prompt:check`
Expected: 全部 PASS

---

## Self-Review 记录

- **覆盖核查**：共识五步（报警器/DECISIONS/黑名单登记/k 善后/AGENTS 分层）→ Phase 0-4 全覆盖；延后项入 Phase 5 表。无遗漏。
- **占位符扫描**：无 TBD/TODO；所有代码步骤含完整代码；Task 6 是人工决策门，显式列出三分支出口。
- **一致性**：`warnBadPlaceholders`/`FULL_PLACEHOLDER`/`SENT` 命名在 Task 1/2 一致；D-001 编号在 Task 4/9 一致；incidents.md 章节号（一/二/三/四）在 Task 10/11 引用一致。
- **风险点**：Task 1 用例 2 依赖 parse5 保留属性名中的 U+0001（HTML spec "anything else" 路径，jsdom 应保留）；若实际跑发现告警未触发，先打印 `tpl.content` 确认解析行为再调整断言——这是对解析器行为的测试，不是对报警器逻辑的放宽。
```
