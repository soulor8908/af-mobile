---
"@af-mobile/ui": patch
---

`@af-mobile/ui/k` 模板占位符位置校验：属性名位插值（`<div ${name}="v">`）与带引号混合值插值（`class="btn ${x}"`）此前静默丢失绑定，现于模板首次解析时 console.warn 一次（模板缓存级去重）。仅告警，不改变绑定行为。
