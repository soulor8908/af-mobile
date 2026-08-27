# af-mobile UI — Eval 零 Token 流水线

从「LLM 生成需求页面」到「飞轮产出改进建议」的完整闭环，**默认 0 LLM token**，截图评审降级为可选兜底。

## 分层验证 & 成本

| 层 | token | 检测内容 |
|---|---|---|
| ESLint | 0 | class 合规 / 禁令 / aria |
| DOM 断言 | 0 | 存在 / 数量 / 可见 / 文本 / **计算样式** |
| LLM 截图 | 有 | 视觉观感（仅 `--visual-llm`） |

## 数据流

```
eval/prompts.jsonl          需求库（86 条，含 expects + 可选 asserts；starter 类为带后端契约的落地任务）
      │  run.mjs 生成（需 LLM key）
      ▼
eval/results/<id>-k0.html   生成页面
      │  scripts/ai-fix.mjs ESLint 修正
      ▼
judge.mjs --visual          渲染 + DOM 断言（含语义断言）
      │  语义失败回写 raw.json（af-mobile/semantic-visual）
      ▼
flywheel.mjs                聚合 errorsByRule → PR 改进草稿
```

## 命令

```bash
# 0. 组件覆盖矩阵（36 组件 × 考题，缺失 exit 1，可挂 CI）
node scripts/eval-coverage.mjs

# 1. 完整零 token 流水线
node eval/judge.mjs eval/results/raw.json --visual   # DOM 断言 + 语义失败回写
node eval/flywheel.mjs eval/results/raw.json          # 产出改进建议（默认阈值 20%）

# 2. 仅 lint 聚合
node eval/judge.mjs eval/results/raw.json

# 3. 截图 + LLM 视觉评审（烧 token，兜底用）
node eval/judge.mjs eval/results/raw.json --visual --visual-llm

# 4. 调整飞轮阈值
node eval/flywheel.mjs eval/results/raw.json --threshold 10
```

## 语义断言格式

`prompts.jsonl` 每条可带 `expects`（存在性）与 `asserts`（深度语义）。元素支持字符串或对象：

```jsonc
{
  "id": "001",
  "expects": [".card", ".title"],            // 字符串：仅检查存在
  "asserts": [                               // 对象：结构化断言
    { "sel": ".price", "text": "¥" },        // 文本包含
    { "sel": ".price", "text": "/¥\\d+/" },  // 文本正则
    { "sel": "af-dialog", "visible": true }, // 计算可见性
    { "sel": ".tag", "count": 2 },           // 精确数量
    { "sel": ".price-del", "style": [        // 计算样式语义
      { "prop": "text-decoration-line", "eq": "line-through" },
      { "prop": "color", "regex": "^rgb\\(0,0,0\\)$" }
    ]}
  ]
}
```

**校准原则**：语义断言必须逐条准确。不是所有 `.price` 都是金额（如积分明细），错误断言会变噪声，应撤销而非硬过。

## 飞轮输出

`flywheel.mjs` 聚合两类失败，产出统一 PR 草稿：

- ESLint 失败 → `token-whitelist`、`no-inline-style` 等 8 条规则
- **DOM 语义失败 → `af-mobile/semantic-visual`**（lint 过了但没满足需求语义）

阈值默认 20%（`>=`），可用 `--threshold` 调整。

## Agent 模式（生评分离，0 API key 依赖）

生成器与评审器解耦：judge/flywheel 只消费 `raw.json` + HTML，生成可由任何 agent（WorkBuddy / Trae 等）执行，无需 `AFMOBILE_AI_API_URL`。

```bash
# 1. 输出任务清单（JSON），agent 按 outputPath 生成页面
node eval/agent-run.mjs --emit --limit 5 --variant agent-x

# 2. agent 生成后自检 + 自修（纯程序，0 token，exit 1 = 有 error）
node eval/agent-run.mjs --lint eval/results/001-k0-agent-x.html

# 3. 权威重跑 lint + 组装 raw.json，接回原管道
node eval/agent-run.mjs --collect --variant agent-x
node eval/judge.mjs eval/results/raw-agent-x.json --visual
node eval/flywheel.mjs eval/results/raw-agent-x.json
```

约定：文件命名 `<id>-k<k>-<variant>.html`（与 run.mjs 一致）；variant 建议 `agent-<模型>` 存档（如 `agent-kimi`），pass 率跨生成器不可直接比。exitCode 沿用 ai-fix 约定：0=通过，1=lint 失败，3=异常。

## 飞轮例行化（约定）

触发时机：**组件源码 / scenarios / prompt 资产变更后**，以及**每周例跑**一次。闭环顺序：

```bash
npm run fewshots:gen                     # 1. 教材同步（scenarios → prompt 资产）
npm run prompt:build && npm run prompt:check   # 2. System Prompt 快照更新 + 门禁
node scripts/eval-coverage.mjs           # 3. 组件覆盖矩阵（36/36 才继续，缺失先补考题）
node eval/agent-run.mjs --emit --limit 10 --variant weekly   # 4. 领任务（agent 生成，生评分离）
# agent 逐条生成 → --lint 自修后：
node eval/agent-run.mjs --collect --variant weekly
node eval/judge.mjs eval/results/raw-weekly.json --visual     # 5. lint + DOM/语义断言
node eval/flywheel.mjs eval/results/raw-weekly.json           # 6. 失败聚合 → 改进 PR 草稿
```

第 6 步聚合出的 top 失败 rule：ESLint 类回写 `system-prompt.template.md`「错误恢复」表，DOM 语义类校准考题断言（撤销错误断言而非硬过）。度量口径：pass 率跨生成器不可直接比，variant 固定为 `agent-<模型>` 存档对比。

## 前置

- Playwright chromium：`npx playwright install chromium && npx playwright install-deps chromium`
- 构建 dist：`npm run build`
- `--visual-llm` 需 `AFMOBILE_AI_API_URL` / `AFMOBILE_AI_API_KEY`