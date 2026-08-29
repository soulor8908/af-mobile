# @af-mobile/eslint-plugin

## 2.2.0

### Minor Changes

- 5ffccca: 新增 k 层 3 条 ESLint 规则（D-001=B 应用层推广的配套约束，插件 21→24 条）。规则只对从 `@af-mobile/ui/k`（或仓库内 `k/index.js`）导入的 `html`/`For` 绑定生效，主包同名 API 语义不同不受约束：
  
  - `k-no-bare-and`（error）：k `html\`\`` 子位裸 `&&` 在假值时渲染字面量 `"false"` 文本（JSX 幻觉写法）——改三元或 `Show`；
  - `k-no-object-interpolation`（error）：对象字面量插值渲染 `"[object Object]"`（含主包 `{ raw }` 语法幻觉）——数组插值合法不报；
  - `k-for-require-key`（warn）：`For` 建议显式 `key`（对象项省略 key 以引用为键，数据源变化整行重建）。
  
  同步：RULE_HINTS 修正提示（fix-loop 闸门）、recommended 配置、全仓规则计数引用（README/CI/AGENTS）。
