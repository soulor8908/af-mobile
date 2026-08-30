---
'@af-mobile/ui': patch
---

hash 路由补 `hashchange` 监听（Issue 6，P3）

hash 模式下手动修改地址栏属于同文档片段导航，**只触发 `hashchange`、不触发 `popstate`**，
此前路由完全无反应（程序内 `go()` 走 `pushState` 则正常）。

现在 popstate / hashchange 共用同一个处理器，并在处理器内用当前路由 path 去重 ——
前进/后退时两个事件都会触发，不去重会导致同一次导航渲染两次。
