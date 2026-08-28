# [数据飞轮 v2] 多源违规分析 & 改进建议

> 事件数：67（lint 15）；来源权重：mcp×3 / cli×2 / ci×2 / eval×1
> 生成时间：2026-08-28T01:34:49.073Z

## 场景需求分布（get_prompt 需求命中，多标签）

| 场景包 | 命中次数 | 来源分布 |
|---|---|---|
| social | 20 | {"cli":20} |
| ecommerce | 15 | {"cli":15} |
| o2o | 3 | {"cli":3} |

> 用途：Top 品类优先落地场景包（build-prompt.mjs SCENARIO_PACKS 按 implemented 顺序注入），不拍脑袋。

## 规则榜（按加权分降序）

| 规则 | 次数 | 加权 | 来源分布 | 工具分布 |
|---|---|---|---|---|
| af-mobile/no-inline-style | 7 | 14 | {"ci":7} | {"ci":7} |
| af-mobile/atomic-duplicate | 4 | 8 | {"ci":4} | {"ci":4} |
| af-mobile/no-emoji-icon | 3 | 6 | {"cli":3} | {"ci":3} |

## 自动修复覆盖（Top 规则）

- af-mobile/no-inline-style（7 次）：❌ 不可 autofix → 投资 Prompt 反例
- af-mobile/atomic-duplicate（4 次）：✅ 可 autofix → 确认 ai-fix --fix 生效
- af-mobile/no-emoji-icon（3 次）：❌ 不可 autofix → 投资 Prompt 反例

## 建议的修改清单（阈值 20%）

### af-mobile/no-inline-style — 7/15（加权 14）

**诊断**：AI 仍习惯性写内联 style

- [ ] 在 Prompt 高频反例区强化"禁止内联 style"示例
- [ ] 检查是否缺少对应原子类的映射（如某个常用 padding 值无对应 p-* 档位）
- [ ] 考虑在 ai-fix.mjs 的 RULE_HINTS 补充更具体的映射建议

### af-mobile/atomic-duplicate — 4/15（加权 8）

**诊断**：该规则触发率偏高

- [ ] 在 Prompt 中强化该规则的说明与示例
- [ ] 评估该规则是否过于严格（考虑放宽或加例外）
- [ ] 检查 ai-fix.mjs 的 RULE_HINTS 是否有该规则的具体修正建议

---
> 本草稿由 eval/flywheel.mjs 自动生成，请人工 review 后实施。