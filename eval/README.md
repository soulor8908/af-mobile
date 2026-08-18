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
eval/prompts.jsonl          需求库（65 条，含 expects + 可选 asserts；starter 类为带后端契约的落地任务）
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

## 前置

- Playwright chromium：`npx playwright install chromium && npx playwright install-deps chromium`
- 构建 dist：`npm run build`
- `--visual-llm` 需 `AFMOBILE_AI_API_URL` / `AFMOBILE_AI_API_KEY`