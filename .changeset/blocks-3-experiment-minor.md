---
"@af-mobile/ui": minor
---

新增 `@af-mobile/ui/blocks` 子路径与 `registerBlocks()` 入口：子库 L3.5 Block 扩至 5 个（新增 `af-product-grid` / `af-order-list` / `af-auth-form`，加上既有 `af-product-card` / `af-setting-group`）。

- 列表型 Block 共享 `list-block.js` 基座：五态（idle/loading/error/empty/success）+ 键盘导航 + 点击委托；
- wc-block-* 四条规则（states / props-count / no-internal-ref / variant-enum）启用到 `src/blocks/af-*.js`；
- 默认 System Prompt 仍不含 Block（冻结原状）；Block 表经 `buildPrompt({ blocks: true })` 按需注入，仅 `node eval/ab.mjs` A/B 对照实验处理组使用。