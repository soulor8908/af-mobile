# 数据飞轮 v2 设计 —— 源无关的反馈闭环

> 版本：v2（2026-08-15）
> 状态：已实施
> 取代：v1（`eval/flywheel.mjs` 仅消费自有 LLM eval 结果的设计）

---

## 0. v1 的致命缺陷

v1 把**数据采集**与**自有 LLM 生成管线**焊死：

```
AIFLOW_AI_API_URL（自有 LLM）→ generate → ai-fix → raw-*.json → flywheel.mjs
```

- 唯一数据入口是 `eval/results/raw-*.json`，只有配置了自有 LLM 端点才能产出数据；
- 用户用 TRAE Work / TRAE Code / Cursor / Claude Code 写的代码，违规信号一条都进不了飞轮；
- 而反馈信号本身（ESLint 违规）**与谁生成代码毫无关系**——分析层本就是模型无关的，是入口层人为锁死了。

**及格线只有一条：用户换个工具写代码，飞轮照样转，而且转得更准。** v1 不及格。

## 1. 设计原则

1. **调用方即 LLM（caller-is-the-LLM）**
   库侧所有逻辑——prompt 构建、lint、修正 prompt 构建、遥测、分析——全部是确定性 Node.js，零 LLM 调用。驱动飞轮的"智能"来自调用方 Agent 自己的模型（TRAE / Claude / Cursor / 人）。原 `AIFLOW_AI_API_URL` 自动模式降级为**可选的合成数据生产者**，不再是必要条件。
2. **本地优先（local-first）**
   遥测数据只写仓库本地 `.aiflow/telemetry.jsonl`（gitignore），无云端依赖、无上传、无账号。分析在本地跑，报告在本地生成。
3. **零配置接入（zero-config）**
   TRAE Work / TRAE Code / CLI 类工具**不需要设置任何 LLM 环境变量**。接入面只有两个，都天然存在：
   - **MCP Server**（`mcp/index.mjs`）——AI IDE / Agent 的原生协议；
   - **CLI**（`npm run lint:flywheel` / `node eval/flywheel.mjs`）——命令行与 CI 的原生协议。

## 2. 架构

```
┌─ 生产者（全部零 LLM 配置）──────────────────────────────────────┐
│                                                                │
│  TRAE Work / TRAE Code / Cursor / Claude Code（Agent 写代码）  │
│    ├─ MCP: get_prompt → 用自己的模型生成页面                    │
│    ├─ MCP: check_compliance / fix_code → 验证 + 拿修正建议      │
│    └─ 顺手把违规写进遥测（source=mcp, tool=识别到的工具）        │
│                                                                │
│  CLI / CI                                                       │
│    └─ npm run lint:flywheel <paths> —— lint 即喂数据            │
│       （source=cli|ci，违规落盘，干净文件默认不记）              │
│                                                                │
│  合成 eval（可选，需 AIFLOW_AI_API_URL）                        │
│    └─ eval/run.mjs → raw-*.json → 飞轮按 source=eval 摄取       │
└──────────────────────────┬─────────────────────────────────────┘
                           ↓  统一事件 schema（v1 JSONL）
┌─ 采集层 ─────────────────┴─────────────────────────────────────┐
│  eval/telemetry.mjs —— recordRun / readTelemetry / 权重 / 工具识别│
│  存储：.aiflow/telemetry.jsonl（本地，gitignore）                │
└──────────────────────────┬─────────────────────────────────────┘
                           ↓
┌─ 分析层（纯 Node，零 LLM）──┴──────────────────────────────────┐
│  eval/flywheel.mjs                                              │
│  ├─ 按 规则 × 来源 × 工具 × 时间 聚合（真实使用权重 > 合成）      │
│  ├─ 白名单候选挖掘：从 token-whitelist 违规消息提取高频 class     │
│  ├─ 档位缺口挖掘：从 no-arbitrary-value 违规提取高频任意值        │
│  ├─ RULE_HINTS 缺口：高频规则但无修正提示                         │
│  ├─ 可自动修复覆盖率：高频规则是否有 fixable 实现                 │
│  └─ 收敛度：MCP 各工具的 passed 比率（提示是否真的在起作用）       │
└──────────────────────────┬─────────────────────────────────────┘
                           ↓
┌─ 行动层 ─────────────────┴─────────────────────────────────────┐
│  PR 草稿（markdown）→ 人工 review → 改 prompt / 白名单 / 规则     │
│  Agent 自助：MCP flywheel_report 直接返回 Top 问题与建议          │
└─────────────────────────────────────────────────────────────────┘
```

## 3. 事件 Schema（v1）

`.aiflow/telemetry.jsonl`，每行一次 lint 运行：

```json
{
  "v": 1,
  "ts": "2026-08-15T12:00:00.000Z",
  "source": "mcp | cli | ci | eval",
  "tool": "trae-code | claude-code | cursor | unknown | self-llm",
  "file": "src/pages/foo.html",
  "passed": false,
  "violations": [
    { "rule": "aiflow/token-whitelist", "severity": "error", "line": 3,
      "message": "Class 'card-wrapper' not in whitelist. ..." }
  ]
}
```

- `tool` 识别：`AIFLOW_TOOL` 环境变量显式指定优先；否则探测 `CLAUDECODE` / `CURSOR_AGENT` 等常见标记；兜底 `unknown`。
- `passed: true` 的事件（干净运行）默认仅 MCP 记录——低频高值，用于收敛度分析；CLI/CI 只记违规文件，防膨胀。
- 遥测目录可用 `AIFLOW_TELEMETRY_DIR` 覆盖（测试隔离用）。

**来源权重**：`mcp: 3`（真实 Agent 使用）> `cli: 2` / `ci: 2`（真实人工/流水线）> `eval: 1`（合成）。真实分布优先于合成分布。

## 4. 各工具类接入方式（验收矩阵）

| 工具类 | 接入面 | 需要设置 LLM？ | 数据如何进飞轮 |
|---|---|---|---|
| TRAE Work（远程 Agent） | 读 AGENTS.md §5 → 调 MCP 工具 | **否** | `get_prompt` 拿项目 prompt → 自有模型生成 → `check_compliance` 验证（违规自动落盘） |
| TRAE Code（IDE 插件） | 同上（MCP / 终端跑 CLI） | **否** | 同上；或 `npm run lint:flywheel` |
| Claude Code / 其他 CLI Agent | AGENTS.md / CLAUDE.md 指引 + CLI | **否** | `check_compliance` / `lint:flywheel` |
| 纯 CLI / 人工 | `npm run lint:flywheel <paths>` | **否** | lint 即喂数据（source=cli） |
| CI | ci.yml 飞轮采集步骤 | **否** | 每次 push 收割全仓违规 + 输出报告（source=ci） |
| 自有 LLM 合成 eval（可选） | `AIFLOW_AI_API_URL=... npm run eval` | 是（可选） | raw-*.json 按 source=eval 摄取，权重最低 |

**关键反转**：`fix_code` / `ai-fix` 的"手动模式"从降级路径升级为**一等公民**——修正 prompt 返回给调用 Agent，由 Agent 自己的模型执行修正，再 `check_compliance` 验证。3 轮闭环由 Agent 驱动，库侧零 LLM。

## 5. 分析层输出

`node eval/flywheel.mjs [--threshold 20] [--since 30d] [--out report.md] [raw-*.json...]`：

1. **规则榜**：按加权分数排序，含 `bySource` / `byTool` 分解与趋势（近 1/3 周期对比）；
2. **白名单候选**：挖掘 `Class 'x' not in whitelist` 消息，按频次排名，给出"进白名单 / 升级为 L2 配方 / 用 data-* 绕开"三选一建议；
3. **档位缺口**：挖掘 `no-arbitrary-value` 消息中的任意值（如 `p-[13px]`），评估新增原子档位；
4. **RULE_HINTS 缺口**：高频触发但 `ai-fix.mjs` 无对应修正提示的规则 → 补提示；
5. **可修复覆盖率**：高频规则是否 `fixable` → 是则投入 autofix，否则投入 prompt 反例；
6. **收敛度**：`source=mcp` 按 tool 分组的 passed 比率——hints 有效则比率上升；
7. **PR 草稿**：保持 v1 `generatePrDraft` 输出风格，人工 review 后实施。

## 6. 实施清单

| 文件 | 角色 |
|---|---|
| `eval/telemetry.mjs` | 统一事件库：recordRun / readTelemetry / 权重 / 工具识别 |
| `scripts/lint-flywheel.mjs` | 通用 lint 采集 CLI（任意路径，HTML/JS/MJS，CI 兼容退出码） |
| `eval/flywheel.mjs` | 分析 v2：多源摄取 + 挖掘 + 缺口 + PR 草稿 |
| `mcp/index.mjs` | 5 工具：get_prompt / check_compliance / fix_code / generate_page / flywheel_report，全部零 LLM 可用 |
| `scripts/ai-fix.mjs` | 导出 `RULE_HINTS` 供缺口分析 |
| `eslint.config.js` | AI 规则覆盖 `scripts/eval/mcp` 的 `.mjs`（补 AGENTS #9 缺口） |
| `.github/workflows/ci.yml` | 飞轮步骤：采集（含 demo/）→ 分析 → 报告 artifact 上传（不阻断） |
| `.github/workflows/flywheel.yml` | 定时周报：每周采集+分析，报告以 issue 评论持久化（主动到达人眼前） |
| `AGENTS.md` §5 | Agent 接入指引（MCP 工具优先，零 LLM） |
| `.gitignore` | `.aiflow/` |

## 7. 隐私与边界

- 遥测只含：时间戳、来源、工具名、文件路径、规则名、行号、**脱敏后**的 ESLint 消息。
- **消息脱敏（v2.1）**：`eval/telemetry.mjs` 的 `sanitizeMessage` 在落盘前剥离嵌入代码片段的消息内容——`no-inline-style` 的 style 属性值、`wc-shadow-use-token` 的 CSS 声明替换为 `[style]` / `[css]` 占位；超长消息截断 200 字符兜底。class/组件/属性名等标识符保留（挖掘器依赖）。**新增 ESLint 规则若消息嵌入代码片段，必须同步登记 `RULE_MESSAGE_REDACT`**。
- 数据不出本机；本地 `.aiflow/` gitignore，CI 遥测随 runner 销毁。CI 的产出是分析报告 artifact（保留 30 天），跨周趋势由 `flywheel.yml` 周报 issue 的评论流承载。
- **零 LLM ≠ 零接入**：无需任何 LLM 环境变量，但 MCP 工具需将 `node mcp/index.mjs` 注册进 MCP 客户端；纯 CLI 用法零注册。

## 8. Roadmap（未实施，按需启动）

- ~~CI 飞轮报告 artifact 上传 / 定时周报~~（v2.1 已实施：ci.yml artifact + flywheel.yml 周报 issue）；
- 遥测文件轮转与 `--prune`（当前本地 JSONL 体量增长可接受）;
- `prompt/` 反例区自动补丁（当前输出建议，人工落笔，防 prompt 漂移失控）。
