# 决策登记簿（DECISIONS）

> 结构性"砍 / 留 / 复活"决策的唯一登记处。每条三要素：**决策 / 理由 / 放弃了什么**。
> 新条目追加到末尾，不改历史条目（推翻旧决策 = 新开一条并回链旧编号）。
> 复活曾被砍的能力（黑名单项）必须先在此登记再动代码。

| 编号 | 日期 | 状态 | 决策 |
|---|---|---|---|
| D-001 | 2026-08-26 | 待决策 | k 层定位：A 冻结 / B 推广为应用层 / C 移除 |
| D-002 | 2026-08-26 | 随 D-001 | 双 `html\`\`` 同名不同义的处理 |
| D-003 | 2026-08-26 | 已决：保留 | router 守卫（beforeEach/afterEach） |
| D-004 | 2026-08-26 | 已决：保留 | i18n 完整模块 |

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

## D-003 router 守卫保留（已决）

- **决策**：beforeEach/afterEach 守卫保留在主包 router.js。
- **理由**：P0 生产要素设计（docs/design/p0-production-essentials-design.md）将 guard 列入 Router 范围；starter 登录页依赖 beforeEach 重定向（docs/blog/starter-tech-choices.md）。
- **放弃了什么**：无——本仓库设计从未砍过守卫。此条为既成事实的集中登记（外部评审曾质疑为"黑名单复活"，核查后证据链完整，缺的只是集中登记，非决策缺失）。

## D-004 i18n 完整模块保留（已决）

- **决策**：保留 lib/i18n.js（~6.7KB）+ with-i18n + 组件映射表。
- **理由**：组件库面向真实用户需要国际化；有完整设计 spec（docs/superpowers/specs/2026-08-10-i18n-design.md）+ plan + 单测 + e2e。
- **放弃了什么**：ICU MessageFormat、复数、懒加载语言包、嵌套 key（spec 的 YAGNI 非目标清单明确砍掉）。
