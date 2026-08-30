---
'@af-mobile/ui': minor
---

注册 API 统一为变参 + DEV 漏注册告警（Issue 3，P1）

**统一语义**：`registerChart(...tags)` 与 `registerChat(...tags)` 改为变参，与主库 `register(...tags)` 一致；
`registerChart('a','b')` 一次注册多个，`registerChat()` 无参仍默认注册 `af-chat`。单参旧调用向后兼容，既有代码无需改动。

**不再静默失败**：开发态（`import.meta.env.DEV`）下，路由每次渲染后扫描 outlet，对
「页面已使用但未注册」的 `af-*` 标签打印：

```
[@af-mobile/ui] <af-switch> 已使用但未注册：不会渲染且无报错，请在入口 register('af-switch')
```

门控在调用点，生产构建 `import.meta.env.DEV` 恒为 `false`，告警代码被整体 tree-shake —— 产物零成本
（实测 `console.warn` 与 `"af-"` 检查均从产物中消失）。
