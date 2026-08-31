---
'@af-mobile/ui': patch
---

fix: lint-flywheel 跨项目 lint 误报 + Prompt 边界规则补强（消费端审计反推）

**1. lint-flywheel 按项目上下文分组 lint**：外部项目的 JS/MJS 向上查找最近的
`eslint.config.js`，套用该项目自身 flat config（extraClass 登记生效）；找不到 config
回落基准 config（保留对任意裸文件的通用 lint 能力）；HTML 仍走片段抽取。修复「在库开发态
lint 消费端文件时，消费端已登记的 extraClass 被仓库 config 误报」——实测对消费端项目
5 error → 0 error，发布态/开发态行为统一。

**2. Prompt 边界规则**（消费端 AI 待办项目实测暴露的两个生成质量问题）：

- 禁令 25→26：新增禁令 26「禁止 API Key/密钥等敏感凭据硬编码进源码」
- 数据契约节补边界说明：同一数据只用一条更新通道（`:bind` 响应式绑定优先，
  手动 `textContent` 仅限一次性静态位），避免混用产生漏更新/竞态
- 列表数据节补提醒：innerHTML 重渲染后旧元素监听失效，必须重绑或对持久容器用事件委托

**3. 教材与脚手架收尾**（外部 review 6 项评估，详见 docs/DECISIONS.md D-020）：

- `demo/apps/ai-todo/app.js`（官方教科书入口）去掉顶层 `await register(...)` TLA 写法，
  对齐 02cfca2 register-state 修复后的官方推荐（入口禁 TLA，router 渲染前自动等待）
- 脚手架 docs 页新增「密钥与凭据」警告：禁止硬编码、运行时输入、仅存本地（呼应禁令 26）
