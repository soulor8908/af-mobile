---
"@af-mobile/ui": minor
---

chat 子库富内容升级（D-013，局部推翻 D-012）：af-chat 对标成熟对话产品补齐 5 项基础能力。

- **markdown 安全子集渲染**：新增 `src/chat/lib/md.js`（escape-first，全文先转义再标注）——h1-h3 / ul/ol / 围栏代码 / 粗斜体 / 行内码 / http(s) 链接；代码块自带复制按钮（`content:attr(aria-label)` 零文本节点）。`javascript:` 链接与 img/script 生成路径被拒绝
- **消息操作**：`session.regenerate()`（末轮重跑，残片清理语义同 retry）/ `session.resend(id, text)`（编辑重发）；气泡操作行支持复制全文（markdown 原文）与重新生成。副作用工具须 confirm 卡片前置（重复执行风险闸门）
- **思考展示**：`delta.reasoning_content`（DeepSeek-R1 / o1 类）聚合为 `think` 内容块，UI 原生 `<details>` 折叠（流式无正文=「思考中…」）；think 不回传 API
- **输入区**：绑定模式忙碌排队（流式中 Enter/发送入队，回空闲自动消化，`af-chat:queued` 事件）；`af-chat:draft` 草稿事件
- **预算**：chatUI 3.3→4.6KB（实测 4.514KB），chatRuntime 2.5KB 不变（实测 2.157KB）；主库 23KB 红线零影响

设计文档：docs/design/af-chat-rich-features-design.md
