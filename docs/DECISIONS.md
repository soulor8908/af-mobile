# 决策登记簿（DECISIONS）

> 结构性"砍 / 留 / 复活"决策的唯一登记处。每条三要素：**决策 / 理由 / 放弃了什么**。
> 新条目追加到末尾，不改历史条目（推翻旧决策 = 新开一条并回链旧编号）。
> 复活曾被砍的能力（黑名单项）必须先在此登记再动代码。

| 编号 | 日期 | 状态 | 决策 |
|---|---|---|---|
| D-001 | 2026-08-26 | 已决：B 维持推广为应用层（D-006 发布前验证完结：安全性达标、成本 ~10% 不稳健，工程价值主导） | k 层升级为应用层，分阶段闭环 |
| D-002 | 2026-08-26 | 随 D-001 | 双 `html\`\`` 同名不同义的处理 |
| D-003 | 2026-08-26 | 已决：保留 | router 守卫（beforeEach/afterEach） |
| D-004 | 2026-08-26 | 已决：保留 | i18n 完整模块 |
| D-005 | 2026-08-26 | 已决：砍 | k 层 bind 指令语法（组合范式替代） |
| D-006 | 2026-08-27 | 已决：甲（不重采）+ 择 B 维持推广；实验完结 | r2 判据回收：安全性达标、成本论据不稳健 |
| D-007 | 2026-08-28 | 已决：P0 已实施；P1a/P1b/P2 待排期 | 平台化生产基建：发布自动化 + 平台后台（主 Cloudflare） |
| D-008 | 2026-08-29 | 已决：业务产品 CF 全栈；starter 双 target 变体待实施 | 业务产品走 Cloudflare 全栈，脚手架 starter 维持 Supabase 默认 + 补 `--target cloudflare` |
| D-009 | 2026-08-29 | 已决：配件直做、deploy/doctor 可插拔 | 消费端交付链适配双后端 |
| D-010 | 2026-08-29 | 已决：阶段 1 全走 CF，按流量触发逐级迁移 | 部署平台三阶段演进（CF → 香港 → 国内） |
| D-011 | 2026-08-29 | 已决：教材补子库清单；demo 重构为子库组件 | chat/charts 子库进 grill 教材（真实生成场景踩中 088 号 trap 的活体案例） |
| D-012 | 2026-08-29 | 已决：A（嵌入式能干活的 AI） | af-chat 定位收敛：不做聊天主界面，砍 markdown/会话管理/图片/时间戳 |
| D-013 | 2026-08-29 | 已决：局部推翻 D-012（用户拍板） | chat 富内容升级：markdown 内置安全子集 + 消息操作 + 思考展示；chatUI 预算 3.3→4.6KB |
| D-014 | 2026-08-29 | 已决：推翻 D-012「会话管理不做」（用户拍板） | chat 多会话：单文件三合一（store+列表 HTML+绑定器）无组件方案；新预算线 chatSessions 0.9KB |

---

## D-001 k 层定位（已决：B 推广为应用层；2026-08-27 经 D-006 完结）

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

**决策结果（2026-08-26）**：B 推广为应用层——用户直接拍板，跳过判据①（r2 数据尚不存在）。r2 从"决策前置"转为**发布前验证**：闭环完成后按 experiments/r2 协议补跑，若 B/A 成本比 >85% 或幻觉率超标，回链本条重开决策。执行序列见 docs/superpowers/plans/2026-08-26-k-layer-governance.md Phase 3-B。

**完结（2026-08-27，经 D-006）**：发布前验证走完 v1→v2 两轮有效跨模型采集（v3 作废）——幻觉率 0/50 达标；成本比 >85% 触发的重开条款由 D-006 终局裁定为**维持 B**，论据换轨工程价值主导。本条关闭，后续若重开须新开条目回链 D-006。

## D-006 r2 判据回收，回链 D-001 重开（2026-08-27，已决）

**决策输入**（r2 v2 轮五家族全回收，详见 [experiments/r2/results/summary.md](../experiments/r2/results/summary.md) 判定章节）：

1. **幻觉率 0/50（0%）——达标**。k 词表跨 5 异构家族（Qwen/GLM/MiniMax/DeepSeek/Seed-Code）零幻觉、零回避；严格口径假阴性 2%（1/50，个体风格未复现）
2. **B/A 成本比 >85%——超标，触发 D-001 重开条件**。code 口径均值 88.4%（3/5 家族超标，94.3/89.3/90.9）；prompt+code 会话口径均值 90.3%（5/5 超标，最低 87.3%）；含返工边际成本估算 DeepSeek ≈103%、Seed-Code ≈128%（B 反超 A）
3. **一次通过率 A 96% vs B 88%**。v1 轮的 24pp B 优势系 A 卡 getElementById 示例缺陷造成的伪影（公平卡修复后 A 72%→96%）

**判定**：H1（词表危险）不成立 / H2（成本优势成立）不成立——中间态。B3「24% 会话成本下降」在公平卡（v2 反例版）下不可复现，收窄为 code ~12%。

**选项**：

| 选项 | 说明 | 放弃了什么 |
|---|---|---|
| B-维持推广为应用层 | 论据换轨为工程价值（声明式控制流 / 显隐语义正确性 / keyed 列表）；成本表述降级为「~12%，不稳健」 | 「第二曲线 = AI 降本 24%」的叙事 |
| A-冻结为可选渲染层 | 回到 D-001 判据缺省态；k 维持 v1.7.0 已发布的可选入口，不追加应用层闭环投入 | 应用层闭环投入；B3→r2 的实验积累只沉淀为文档 |
| C-v3 卡瘦身后再测一轮 | v2 反例把被试推向更冗长但更安全的 Show 全量增删；v3 教 `hidden=${fn}` 单行属性绑定（安全且短）可能兼得，成本约 1 轮采集 | 立即定论的确定性；若 v3 仍 >85% 则白花一轮 |

**决策结果（2026-08-27）**：选 C。用户拍板「按这个方案来」，附四个前置分析要求（反例膨胀机制 / 覆盖完整性 / 约束递减界定 / 方案可靠性），已分析完毕并落入 v3 设计。同轮决定：①判定口径改为 pooled 净节省 ≥15% 主判 + 单家族超 85% 标记离群（已登记 [experiments/r2/README.md](../experiments/r2/README.md) §九）②双轨计量（token 1:1 主判 + 价格加权 in×1/out×4 次判）③同 5 家族配对重跑、不换模型（换模型焊死混杂，弱模型非失败主因——v1→v2 同模型跨轮自然实验证明）。v3 卡预算 A3 598 / B3 499 tokens（v2 的 A 708 / B 660 → 反例瘦身 + 补 D-005 钦定的双向绑定组合范式 + 显隐三范式表）。第 6 家族探针暂不采（判定约束在成本不在通过率）。若 v3 pooled 净节省 <15%，回链 D-006 择 B 或 A。

**v3 轮作废与重开（2026-08-27，详见 [experiments/r2/results/summary.md](../experiments/r2/results/summary.md) v3 轮作废重登记）**：v3 五个「家族」数据全部产自同一 GLM-5.3 会话（Task 工具无模型参数，子代理随会话模型运行），Qwen/MiniMax/DeepSeek/Seed 标签无效，v3 跨模型结论全部作废；根因是 SKILL.md 调度式缺「会话模型=目标家族」硬门禁（结构性漏洞，已补 §0.5），协议退化自 v3 轮规划时即在单会话内设计采集，非仅丢上下文所致。数据降级为 **GLM-5.3 × v3 卡重复测量（n=5）**：5/5 B<A（符号检验 p≈0.03）、净节省 14.1% 但 95% CI [7.6%, 20.5%]、B 臂风格 CV 10.6% vs A 臂 3.4%（`.value=` 采用 0/0/0/4/3，同模型采样不稳定）、50 任务零缺陷（仅 GLM 有效）；**噪声地板 SD≈5.2pp → 「pooled ≥15%」线在每家族 n=1 的设计下本身不可判**。**决策选项**：甲·不重采——以 v2（唯一有效跨模型轮：安全闭环、净节省 ~10%±3.3pp）+ GLM 试点直接拍板择 B/A；乙·重采 v3 四家族（各自会话，且须每家族 ≥2 跑方有统计功效，成本高）；丙·最小验证——仅 DeepSeek 家族（历史失败模式最多）在自家会话跑 v3 卡双臂验证安全修复泛化。待用户拍板。

**决策终局（2026-08-27，用户拍板「按这个方案来」）**：**甲（不重采）+ 择 B（维持推广为应用层）**，r2 实验完结。

- **理由**：①「pooled ≥15%」线已被证明统计不可判（单跑噪声地板 SD≈5.2pp），重采须每家族 ≥2 跑、成本高且只能收窄区间、无法翻转方向；②有效证据已足——v2 跨五家族安全性彻底闭环（幻觉 0/50、回避 0/50、严格假阴性 2%），成本真实但不稳健（净节省 ~10%±3.3pp，GLM 单模型试点 14.1% CI [7.6%, 20.5%]），方向 6/6 轮次一致为 B<A；③k 的采纳论据本就以工程价值主导（声明式控制流 / 显隐语义正确性 / keyed 列表 / 零返工），成本是次要红利。
- **成本表述定稿（对外口径）**：「AI 会话成本约降 10%（不稳健；GLM 重复测量试点 ~14%）」——禁用 B3 旧叙事「24%」。
- **放弃了什么**：v3 卡跨模型验证（安全性修复泛化仅 GLM 验证，DeepSeek/Seed 的 v2 失败模式在 v3 卡下是否消除存疑）；「≥15%」精度的成本结论；v3 卡「按需使用」修订随实验完结不再进卡（降方差发现已沉淀在 summary.md，若未来重开实验可取用）。
- **D-005 重开条件核查**：三轮有效数据中 AI 零幻觉 = 无人手写 bind 指令，重开条件未触发，D-005 维持砍。
- **后续**：本簿不再有待决项；k 相关开发回归 D-001 执行序列（docs/superpowers/plans/2026-08-26-k-layer-governance.md Phase 3-B）。

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

## D-005 k 层 bind 指令语法砍掉（已决）

- **决策**：k 层不实现独立双向绑定指令语法（`<input {bind(name)} />`），用组合范式：`.value=${() => s()} @input=${e => s.set(e.target.value)}`（src/k/README.md 已定版教学）。
- **理由**：flow.js 解析器零改动（属性名位刚被占位符报警器定为禁区）；组合范式两行可表达全部双向绑定；无高频需求证据（外部设计词表之外无消费方）。
- **放弃了什么**：单语法糖。重开条件：r2 补跑（D-001 发布前验证）发现 AI 高频手写 bind 指令。

## D-007 平台化生产基建：发布自动化 + 平台后台（2026-08-28，已决）

产品定位从「纯前端 npm 库」扩展为「平台型产品」。详细设计：[docs/design/platform-backend-design.md](./design/platform-backend-design.md)。

- **决策**：
  1. 发布自动化：新增 `.github/workflows/release.yml`（changesets 单 job 两段式：Version Packages PR → 合并即 `changeset publish --provenance` + registry smoke）；mcp/prompt/tokens 补 `prepublishOnly`；7 个可发包补 `repository` 字段（npm provenance 硬性要求）
  2. 平台后台定位：**只服务开发工具链（MCP/CLI/CI 的 opt-in 遥测），不托管消费者业务后台**（消费者继续走 adapters/supabase.js 自选接入）；技术栈主 Cloudflare（Workers + D1），存储驱动接口留 Supabase 扩展点，monorepo `server/` workspace 承载（P1b）
- **理由**：npm publish 曾靠本地手动且因 E401 失败（@af-mobile/prompt v2.1.0）；多包无自动化在包数量增长后不可持续。后台边界「工具链遥测」避免库方为用户业务数据担责。
- **放弃了什么**：两驱动同写（Supabase 驱动延后至真实需求触发）；另起新仓库（失去 sanitizeMessage 复用与 CI 串联）；默认收集遥测（维持 opt-in，隐私红线不放宽）。

## D-008 业务产品 Cloudflare 全栈 + starter 双后端 target（2026-08-29，已决）

冲突背景：`production-platform-design.md` §3.3 要求 starter 删掉 Supabase 改 CF 全栈，`consumer-delivery-design.md` P0 要求保留 Supabase 只加 PWA 配件 —— 同一个 `starter/` 方向相反，必须先决断。设计出处：[docs/design/production-platform-design.md](./design/production-platform-design.md)（业务仓）、[docs/design/consumer-delivery-design.md](./design/consumer-delivery-design.md)（消费端）。

- **决策**：
  1. **业务产品**（`aiflow-app`，混仓承载见 D-007）确定走 Cloudflare 全栈：Workers + D1 + 同源 `/api`，不用 Supabase（密钥保管 / 敏感 tool / 记账限流三件事放后端）
  2. **脚手架 `starter/`** 维持 Supabase 为默认后端，另补 `--target cloudflare` 变体（`wrangler.toml` + D1 migrations + 同源 `/api` 客户端），两条路并存
- **理由**：业务产品是自家唯一确定性场景，单一后端不留抽象成本；starter 面向外部消费端，强改默认会破坏已生成项目与 `adapters` 资产的价值（`adapters/supabase.js` 已发布且有真实消费者）。双 target 让 CF 全栈在业务仓先行验证，成熟后再考虑提升为默认。
- **放弃了什么**：starter 单一后端的维护简单性（两个变体 = 两份模板与两份文档）；业务产品复用 `adapters/supabase.js` 的可能（该产品内自建 `$api` 客户端；adapters 保留在库仓供消费端，其处置仍为待登记项，见 production-platform-design.md §9.2）。
- **回链**：A1（业务产品仓归属）随之关闭 —— 取**混仓**，与 D-007 一致。`production-platform-design.md` §3.1 的独立建仓论述保留为备选论据记录，**以本条为准**，不再重开讨论。

## D-009 消费端交付链适配双后端（2026-08-29，已决）

设计出处：[docs/design/consumer-delivery-design.md](./design/consumer-delivery-design.md)。

- **决策**：
  1. **Web 化配件**（manifest / 图标 / 分享 meta / favicon）与后端无关，**直接做**，不等 target 变体落地
  2. `af-mobile deploy` / `af-mobile doctor` 做成**可插拔**：后端无关的通用检查项（构建产物、线上可达、配件完整）+ Supabase 与 Cloudflare 各一套专属检查项，按项目 target 分发
  3. 部署平台**不预先锁死** —— 按同日 **D-010** 的三阶段路径演进（CF → 香港 → 国内），按流量触发迁移
- **理由**：配件是纯生成物，与后端解耦即可立即交付；deploy/doctor 的后端耦合部分做成可插拔，避免 starter 双 target 后工具链出现分叉。
- **放弃了什么**：一次性定死部署平台带来的设计简洁性；以及「先写代码再测可达性」的速度。
- **后续**：部署平台选型已由同日的 **D-010** 锁定为三阶段演进路径，本条不再承担平台选型职责。

## D-010 部署平台三阶段演进：CF → 香港 → 国内（2026-08-29，已决）

背景：已核实所有「让 Cloudflare 在中国大陆变快」的官方路径都长在门槛后面 —— Cloudflare China Network（京东云运营）与 Global Acceleration 均需 **Enterprise plan + 每个域名 ICP 备案**，个人/小团队不可得。同时香港与国内方案的实测数据已摸清（详见 `consumer-delivery-design.md` §7）。

- **决策**：部署平台按**流量与实测数据**逐级迁移，不为未验证的流量提前付费。

| 阶段 | 平台 | 触发条件（判据） | 成本 |
|---|---|---|---|
| **1（当前 → 首发）** | **全走 Cloudflare**（Pages/Workers + D1） | 默认态，产品未发布 | 0 元 |
| **2（发布后视情况）** | 转**香港 self-hosted**（VPS + nginx，免备案） | 国内用户占比显著 且 出现真实的访问失败/超时反馈 | ≈20 元/月起（三网优化 2H2G 15M） |
| **3（流量足够大）** | 转**国内 COS/OSS + CDN**（需 ICP 备案） | 带宽成本成为主要支出，或香港方案带宽撑不住并发 | 0–几十元/月（免费额度内 0 元）+ 备案成本 |

- **理由**：产品未验证前为不存在的流量付备案成本是纯浪费；CF 零成本零运维，适合验证期。香港与国内都是**可增量切换**的 —— 只要阶段 1 守住防锁定约束（见下），迁移成本就只是换一个 deploy provider，不是重写应用。
- **放弃了什么**：首发阶段的国内用户体验（可能慢、可能不稳）；以及「一次就选对平台」的幻想。接受分三次付迁移成本，换取不在错误阶段过度投入。
- **强制前置 —— 防锁定约束**（阶段 1 编码时必须遵守，否则本决策失效）：
  1. 业务代码**不得直接依赖 CF 专有能力**（Workers KV、Durable Objects、D1 方言 SQL、平台特有 API）；需要存储/队列时走 adapter 抽象
  2. 数据访问统一走 `fetchPage` + `adapters/`，后端可替换
  3. 部署统一走 `af-mobile deploy` 的 **provider 抽象**（`cloudflare` / `self-hosted` / `cn`），业务代码不含平台调用
  4. 配置与密钥不写死平台，走 env；域名不硬编码
- **待办**：阶段 2 触发时新开条目登记（记录实测数据与迁移范围），回链本条。

## D-011 chat/charts 子库进 grill 教材（2026-08-29，已决）

背景：AI 待办 demo 生成任务中，AI 按教材（grill SKILL.md「L3 组件选型 28 个」+ 主入口 `src/index.js`）选型，**完全漏掉 chat/charts 两个子库**，手写了气泡流与 CSS 图表——正是 eval 088 题（"charts 必须子库引入 + registerChart"）设计要抓的 trap 在真实场景复现。另实踩 `registerChart(tag)` 单参数 API（与主库变参 `register` 不一致，多传静默失败）。

- **决策**：
  1. grill SKILL.md「规范速查」补「子库组件」段：chat（registerChat/createSession/defineTool）与 charts（registerChart 单标签逐个调用）的引入与注册方式；涉及聊天/图表需求**必须用子库**，禁止手写气泡流/CSS 图表
  2. demo（ai-todo-demo.html）重构为 af-chat + af-chart-* + defineTool 工具链版（已完成，lint 全绿 + 浏览器实测通过）
- **理由**：子库是库方资产（af-chat 含工具调用协议/SSE 流式，charts 含五态图表内核），AI 手写替代 = 重复造轮子且丢失协议能力；教材不列 = AI 必然漏用（已实证）。
- **放弃了什么**：教材「单清单」的简洁性（主库 28 个 + 子库分列，AI 需多读一段）；未把 registerChart 改成变参 API（改库 API 超出本次范围，且单参 + `registerCharts()` 全量已可用——若后续高频踩坑再开条目改 API）。

## D-012 af-chat 定位：嵌入式「能干活的 AI」（2026-08-29，已决 A）

背景：af-chat 对比成熟聊天产品（ChatGPT/豆包/Kimi）列出 10 项能力缺口后复核，发现参照系不成立——3.2KB 的组件不该对标几十 MB 的聊天应用主界面。归位到两条互斥定位：

| 定位 | 含义 | 关键能力 | 体积代价 |
|---|---|---|---|
| **A 嵌入式能干活的 AI**（本决策） | AI 嵌在应用里替用户操作应用（例：待办 demo 中对 AI 说「加一个明天交周报的高优待办」） | 工具调用闭环 + 结构化卡片反馈 + 输入/等待/键盘等宿主体验 | 小（+~0.5KB） |
| B 聊天应用主界面 | 以对话为主体，长文、历史会话、多轮创作 | markdown 渲染 + 会话管理 + 图片 + 时间戳 | 体积翻倍，须拆独立子库 |

- **决策**：选 A。af-chat 只服务「AI 替用户干活」，不追求成为聊天主界面。
- **理由**：
  1. 库的资产在**工具调用协议**（`createSession` + `defineTool` + SSE 工具循环）与**封闭卡片集**，不在文本渲染；做 B 等于拿短处拼别人的长处
  2. A 场景下 AI 输出以「短确认 + 工具芯片 + 结构化卡片」为主，markdown 需求密度低
  3. 体积预算 chatUI 3.227/3.3KB 仅剩 73 字节——B 路线在预算内不可能完成
- **放弃了什么**（写在前面，避免后续以「对比成熟产品缺功能」为由复活）：
  - **markdown 渲染**：不做。A 场景让 AI 输出**结构化卡片**而非自由文本（延续本库「封闭集 > 自由表达」哲学）。若未来确需富文本，走可插拔 `renderer` 注入，且**必须由使用方自行承担 XSS sanitize 责任**（现 `textContent` 为天然 XSS 免疫，加渲染即打破）
  - **会话管理（列表/切换/重命名）**：不做。A 场景对话从属于宿主应用状态
  - **图片/语音输入**：不做（非干活主路径）
  - **时间戳/日期分组**：不做
  - **regenerate（重新生成）**：**不做，且视为反功能**——干活场景下重跑会**重复执行有副作用的工具**（如 `add_todo` 重复添加），风险高于收益
- **连带发现（干活场景特有，优先级高于原清单多数条目）**：
  1. **撤销（undo）**：AI 干完活用户要能撤回这一步——干活场景核心能力，比 regenerate 重要
  2. **副作用分级**：删除/写入类工具执行前须 `confirm` 卡片确认（AI 待办 demo 中 `delete_todo` 未经确认直接执行 = 真实缺陷）
  3. **工具失败态**：`runTool` 把 execute 异常塞进 result，UI 无失败态区分（`✓` 芯片不区分成功/失败）
- **同批修复**：重试重复入库缺陷（已实证，`.cache/verify-retry-bug.mjs`：失败后重试产生 2 条相同 user 消息）——`session.retry()` 新增，见 CHANGELOG。

## D-013 chat 富内容升级，局部推翻 D-012（2026-08-29，已决）

**决策输入**：用户对照成熟产品提出补齐诉求（10 项缺口清单），圈定 5 项（markdown 渲染 / 代码块复制 / 消息操作 / 思考展示 / 输入区排队+草稿）并要求先做体积评估。探针实测（esbuild minify + gzip，与 size-check 同口径）：五项叠加 chatUI 3.447→4.514KB（+1067B，md 极致压缩版 476B），chatRuntime 1.953→2.157KB（+209B，预算内）。

**决策**（用户拍板，方案 A 全量并入内核）：
1. **markdown**：内置安全子集渲染器（`src/chat/lib/md.js`，escape-first：全文先转义再标注，无 XSS 面）——推翻 D-012 的「不做」与「可插拔 renderer + 使用方担责」路线；内置转义比外挂 renderer 的安全属性更强（库担责而非使用方担责）
2. **消息操作**：`session.regenerate()/resend()` API + 气泡操作行（复制全文 / 重新生成）——推翻 D-012 的 regenerate 反功能判定；**缓解措施继承 D-012 连带发现 #2**：副作用工具必须 confirm 卡片前置，重复执行风险由工具层闸门兜底
3. **思考展示**：`delta.reasoning_content` → `think` 内容块（内核解析 32B）+ 原生 `<details>` 折叠
4. **输入区**：绑定模式忙碌排队（`af-chat:queued` 事件）+ `af-chat:draft` 草稿事件
5. **预算**：chatUI 3.3→4.6KB（含既有欠账 147B），chatRuntime 2.5KB 不变；chat 子库总量约束 5.5→7.1KB（见 docs/design/af-chat-rich-features-design.md）；主库 23KB 红线零影响（chat 独立预算）

**放弃了什么**：
- 「chatUI ≤ 3.3KB 极致纪律」——换取对标成熟产品的基础体验下限
- D-012 的 renderer 可插拔扩展点——内置封闭子集（h1-h3/ul/ol/围栏码/粗斜体/行内码/链接），不做通用 markdown，不支持图片/表格/嵌套引用
- regenerate 仍只做「末轮重跑」，不做任意消息 fork 树（会话管理依旧不做，D-012 该项维持）
- 时间戳/日期分组/图片/多会话维持不做（D-012 该部分不受影响）

**残余风险**：regenerate 重跑工具循环会重复执行副作用工具——已在设计文档「边界」章节立规：无 confirm 闸门的副作用工具不得接入 regenerate 场景；undo（D-012 连带发现 #1）优先级提升为下一批候选。

## D-014 chat 多会话（无组件方案），推翻 D-012「会话管理不做」（2026-08-29，已决）

**决策输入**：用户提出查看历史/新增/删除会话诉求后两轮体积收敛——组件方案实测 +1593B 被否；对大头（自定义元素固定成本：Shadow CSS 模板串/cssTag/withI18n/生命周期管道，占组件体积 ~60%）重设计为**单文件三合一纯函数**，实测 +806B。

**决策**（用户拍板）：`src/chat/sessions.js` 单文件导出三函数——`createSessions()`（多会话仓库：创建/删除/切换 + localStorage 防抖 300ms 落盘 + 恢复走 `initialMessages`）/ `sessionsHTML(store)`（列表 HTML，全 L2 白名单 class，cardNode 同款先例）/ `bindSessions(el, store, target?)`（渲染 + 事件委托 + 自动重渲染 + 传入 af-chat 则自动换绑 session）。af-chat 与 chatRuntime 零改动；tree-shaking 下不用会话管理的消费端 0 付费（新预算线 chatSessions ≤ 0.9KB，仅测量该文件）。

**浏览器特性替代库代码**：原生 Popover API 承担弹层（`popover=auto` + `popovertarget`，light-dismiss/top-layer 0 字节）；`aria-current` 承担 active 态（0 CSS，宿主可选 1 行样式）；`crypto.randomUUID` 生成 id；`setTimeout` 防抖。

**放弃了什么**：
- 组件化封装（Shadow 隔离 / 事件派发 / 框架无关实例）——换 -49% 体积；宿主自管容器与弹层关闭时机
- 重命名 / 自动标题 / 会话搜索 / 日期分组 / 虚拟化（不在用户三能力内，D-012 其余砍项维持）
- 立即落盘改防抖落盘（300ms）——流式期间逐 token stringify 整个历史的性能坑顺带修掉；结构性操作（create/remove/select）走同步 flush 不受影响

**边界**：宿主需自写 1 行 active 样式（`[aria-current]` 着色）；popover 内点击不自动关闭，需关闭在 `store.subscribe` 回调里自行处理。实测与 API 详见 docs/design/af-chat-rich-features-design.md §10。
