# @af-mobile/prompt

## 2.1.1

### Patch Changes

- 8520281: 新增独立 `@af-mobile/tokens` 包：`tokens.json`（W3C DTCG 1.1）与 `tokens.css`（L1 全量，含 reset/base/主题切换）均由 `src/tokens.css` 单一真相源在发布前现生成（`scripts/build-tokens-pkg.mjs`），无提交态快照。
  
  `@af-mobile/mcp` / `@af-mobile/prompt` 的 `assets/` 改为构建期生成产物：`build-mcp.mjs` / `build-prompt-pkg.mjs` 内部调用 `syncAssetsTo()` 在发布时重建，`assets/` 移出版本控制（gitignore），不再提交重复快照。
