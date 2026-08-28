# [数据飞轮 v2] 多源违规分析 & 改进建议

> 事件数：193（lint 69）；来源权重：mcp×3 / cli×2 / ci×2 / eval×1
> 生成时间：2026-08-28T05:23:22.848Z

## 场景需求分布（get_prompt 需求命中，多标签）

| 场景包 | 命中次数 | 来源分布 |
|---|---|---|
| ecommerce | 47 | {"cli":47} |
| social | 31 | {"cli":31} |
| o2o | 8 | {"cli":8} |
| marketing | 4 | {"cli":4} |
| content | 2 | {"cli":2} |

> 用途：Top 品类优先落地场景包（build-prompt.mjs SCENARIO_PACKS 按 implemented 顺序注入），不拍脑袋。

## 规则榜（按加权分降序）

| 规则 | 次数 | 加权 | 来源分布 | 工具分布 |
|---|---|---|---|---|
| af-mobile/semantic-visual | 21 | 21 | {"eval":21} | {"self-llm":21} |
| af-mobile/no-inline-style | 7 | 14 | {"ci":7} | {"ci":7} |
| af-mobile/atomic-duplicate | 4 | 8 | {"ci":4} | {"ci":4} |
| af-mobile/no-emoji-icon | 3 | 6 | {"cli":3} | {"ci":3} |
| af-mobile/token-whitelist | 2 | 2 | {"eval":2} | {"self-llm":2} |

## 白名单候选（token-whitelist 挖掘）

- class `.h-full`：2 次 → 进白名单 / 升级 L2 配方 / 改 data-* 三选一

## RULE_HINTS 缺口（高频但无修正提示）

- [ ] 为 `af-mobile/semantic-visual` 补充 ai-fix.mjs RULE_HINTS

## 自动修复覆盖（Top 规则）

- af-mobile/semantic-visual（21 次）：❌ 不可 autofix → 投资 Prompt 反例
- af-mobile/no-inline-style（7 次）：❌ 不可 autofix → 投资 Prompt 反例
- af-mobile/atomic-duplicate（4 次）：✅ 可 autofix → 确认 ai-fix --fix 生效
- af-mobile/no-emoji-icon（3 次）：❌ 不可 autofix → 投资 Prompt 反例
- af-mobile/token-whitelist（2 次）：❌ 不可 autofix → 投资 Prompt 反例

## 建议的修改清单（阈值 10%）

### af-mobile/semantic-visual — 21/69（加权 21）

**诊断**：该规则触发率偏高

- [ ] 在 Prompt 中强化该规则的说明与示例
- [ ] 评估该规则是否过于严格（考虑放宽或加例外）
- [ ] 检查 ai-fix.mjs 的 RULE_HINTS 是否有该规则的具体修正建议

### af-mobile/no-inline-style — 7/69（加权 14）

**诊断**：AI 仍习惯性写内联 style

- [ ] 在 Prompt 高频反例区强化"禁止内联 style"示例
- [ ] 检查是否缺少对应原子类的映射（如某个常用 padding 值无对应 p-* 档位）
- [ ] 考虑在 ai-fix.mjs 的 RULE_HINTS 补充更具体的映射建议

---
> 本草稿由 eval/flywheel.mjs 自动生成，请人工 review 后实施。