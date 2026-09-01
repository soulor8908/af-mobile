---
'@af-mobile/ui': minor
---

框架优化 backlog 落地（docs/framework-optimizations.md，来自 ai-todo-app 消费端评审）：

- **OPT-1 布局包装器**：新增 `withLayout({ title, tabbar }, handler)`，navbar/tabbar 只写一遍，tabbar active 由当前路径自动推导（含点击导航与方向键导航），消灭页面手填 activeIndex 的一类静默 bug
- **OPT-2 表单对话框**：新增 `openFormDialog({ title, schema, onSubmit })`，defineTool parameters 同构的 JSON Schema 直接渲染 af-dialog 表单（required/number 校验、enum 下拉、textarea/password），1 行调用替代 ~60 行手写
- **OPT-3 事件绑定**：`:bind` 管道补 `@click="actions.x"` 声明式事件绑定（处理器取自 createPage actions，经 batch 包装），消除"渲染后忘挂事件"类 bug
- **OPT-4 LAZY 裁剪**：新增 `@af-mobile/ui/vite` 的 `afMobileTrimLazy()` 插件，构建期按实际 `register()` 字面量调用裁剪懒注册表（实测消费端 35 chunk → 4 chunk；动态注册自动全量保底）
- **OPT-5 穿透防呆**：eslint-plugin 新增 `no-af-pierce`（error，第 25 条规则），禁止消费端选择器穿透 af-* 内部节点（Shadow 死代码 / Light 契约外依赖），修复指引走 ::part() 与 CSS 变量
- **OPT-6 .seg a11y**：`.seg` 官方示例补 `role="tablist"/"tab"` 用法说明（aria-selected 需显式 role 才生效）
- **OPT-7 测试桩对齐**：starter 模板接入 vitest + `setupFiles: ['./test/setup.js']`（1 行 `import '@af-mobile/ui/test'`），与脚手架 create-app.mjs 既有链路对齐
- **OPT-8 日期工具**：新增 `todayISO()` / `formatDate()`，统一本地时区口径（'YYYY-MM-DD' 按本地解析，规避 new Date(str) 的 UTC 逾期判断 bug）
