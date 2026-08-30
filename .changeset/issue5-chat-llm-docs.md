---
'@af-mobile/ui': patch
---

chat 子库补「接真实 LLM」最小示例（Issue 5，P2）

此前 `requestFn(url, init)` 的返回格式与消息转换规则只能靠读 `session.js` 源码搞清楚。
文档站 af-chat 页新增「接真实 LLM（`requestFn` 契约）」段：

- 请求体结构（`messages` / `stream` / `tools`，含 assistant 的 `tool_calls` 与 `tool` 结果回传格式）
- 返回值必须是标准 `Response`（内部对 `res.body` 调 `getReader()` 解析 SSE）
- 示例 1：纯文本对话接 OpenAI 兼容 endpoint（注入 Authorization + model 的正确姿势）
- 示例 2：工具调用（`name` / `arguments` 跨帧分片的 SSE 实例 + 说明工具循环已内置，`requestFn` 无需分支）
