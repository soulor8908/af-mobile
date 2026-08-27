---
"@af-mobile/ui": minor
---

`@af-mobile/ui/k` 入口升级为应用层（DECISIONS.md D-001=B）：新增 `createResource`（res）与路由全套原语（`route`/`go`/`back`/`forward`/`beforeEach`/`afterEach`/`notFound`/`current`/`start`/`RouterError`）重导出——用 k 写应用不再需要回主包取数与路由 API。

- 词表卡定版于 `src/k/README.md`（含双 `html\`\`` 同名不同义警示、双向绑定组合范式、占位符禁区）；
- k 独立体积预算不变（≤2KB gzip，共享运行时模块 external 计量）；
- k 层占位符报警器（patch，同版本合入）：属性名位 / 带引号混合值插值静默失败改为 console.warn。
