# af-chat

> chat 子库 · AI 对话容器（气泡流 + composer + 工具芯片 + 卡片）

## 在线调试

<iframe src="../demo/playground/index.html?c=af-chat" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 绑定模式（推荐，一行接线）

```html
<af-chat id="chat" placeholder="问我任何问题…"></af-chat>
```

```js
import { registerChat, createSession, defineTool } from '@af-mobile/ui/chat';

registerChat();
const chat = document.getElementById('chat');
const session = createSession({
  endpoint: '/api/chat',
  tools: [defineTool({
    name: 'get_weather',
    description: '查询城市天气',
    execute: async (args) => ({ city: args.city, weather: '晴', temp: 25 }),
  })],
});
chat.session = session; // busy / 流式光标 / 错误重试随 session 状态机自动驱动
chat.addEventListener('af-chat:confirm', (e) => {
  if (e.detail.accepted) { /* 执行确认卡上的破坏性操作 */ }
});
```

### 受控模式（纯渲染，自管消息流）

```js
import { registerChat } from '@af-mobile/ui/chat';

registerChat();
const chat = document.querySelector('af-chat');
chat.messages = [
  { role: 'user', id: 'u1', content: [{ type: 'text', text: '最近待办？' }] },
  { role: 'assistant', id: 'a1', content: [
    { type: 'card', id: 'c1', card: { kind: 'list', title: '最近的待办', items: [{ title: 'review PR #42', meta: '今天 18:00 前' }] } },
  ] },
];
chat.addEventListener('af-chat:send', (e) => {
  /* 自行请求后端，追加 messages 触发增量渲染 */
});
```

## 接真实 LLM（`requestFn` 契约）

默认 `requestFn` 就是 `fetch(endpoint, init)`，`init` 由 session 组装：

```json
{
  "messages": [
    { "role": "system", "content": "…" },
    { "role": "user", "content": "…" },
    { "role": "assistant", "content": "…", "tool_calls": [{ "id": "call_1", "type": "function", "function": { "name": "get_weather", "arguments": "{\"city\":\"上海\"}" } }] },
    { "role": "tool", "tool_call_id": "call_1", "content": "{\"city\":\"上海\",\"weather\":\"晴\"}" }
  ],
  "stream": true,
  "tools": [{ "type": "function", "function": { "name": "get_weather", "description": "查询城市天气", "parameters": { "type": "object", "properties": { "city": { "type": "string" } } } } }]
}
```

**返回值必须是标准 `Response`**（内部对 `res.body` 调 `getReader()` 逐帧解析），响应体为 OpenAI 格式 SSE：
`data: {"choices":[{"delta":{"content":"…"}}]}` 逐帧，以 `data: [DONE]` 结束。非 2xx 时 session 抛
`chat request failed: <status>` 并进入 `error` 态（UI 出错误条 + 重试按钮）。

推理模型可额外回 `delta.reasoning_content`（DeepSeek-R1 / o1 类），session 累积为独立 think 块由 UI 折叠展示，不回传给 API。

### 示例 1：纯文本对话，接 OpenAI 兼容 endpoint

```js
import { createSession } from '@af-mobile/ui/chat';

const session = createSession({
  endpoint: 'https://api.openai.com/v1/chat/completions',
  // 只在 init.body 上补 model：messages / stream / tools 由 session 组装，不要自己拼请求体
  requestFn: (url, init) => fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${import.meta.env.VITE_OPENAI_KEY}` },
    body: JSON.stringify({ ...JSON.parse(init.body), model: 'gpt-4o-mini' }),
  }),
});
```

> API Key 不要下发到前端：生产请把 `endpoint` 指向自己的后端代理，由代理转发时补 Key。

### 示例 2：工具调用（循环已内置，requestFn 无需分支）

模型返回 `delta.tool_calls` 后，session **自动执行同名工具的 `execute`**，把结果作为 `role: 'tool'` 消息追加并发起下一轮请求
（最多 `maxToolRounds` 轮，默认 6）。`requestFn` 只需保证 `tools` 字段透传、SSE 原样回传。

```js
import { createSession, defineTool } from '@af-mobile/ui/chat';

const session = createSession({
  endpoint: '/api/chat',
  tools: [defineTool({
    name: 'get_weather',
    description: '查询城市天气',
    parameters: { type: 'object', properties: { city: { type: 'string' } } },
    execute: async (args) => ({ city: args.city, weather: '晴', temp: 25 }),
  })],
  requestFn: (url, init) => fetch(url, {
    ...init,
    body: JSON.stringify({ ...JSON.parse(init.body), model: 'gpt-4o-mini' }),
  }),
});
```

模型侧一次工具调用回传的帧（`name` / `arguments` 会跨帧分片，session 按 `index` 聚合）：

```
data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","type":"function","function":{"name":"get_weather","arguments":""}}]}}]}

data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\"city\":"}}]}}]}

data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\"上海\"}"}}]}}]}

data: [DONE]
```

工具执行完自动进入第二轮，模型给出最终回答：

```
data: {"choices":[{"delta":{"content":"上海今天晴，25°C。"}}]}

data: [DONE]
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| messages | `Message[]` | [] | 受控模式：消息数组（设置 session 后忽略赋值，session 为真相源） |
| session | `Session \| null` | null | 绑定模式：注入 createSession() 实例（推荐） |
| placeholder | `string` | null | composer 占位文案（缺省走 i18n `ct.ph`） |
| busy *(readonly)* | `boolean` |  | 流式中（绑定模式随 session.state === 'streaming' 反射） |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-chat:send` | 发送消息（Enter / 发送按钮），detail: `{ text }` |
| `af-chat:action` | actions 卡片快捷回复点击，detail: `{ cardId, value }` |
| `af-chat:confirm` | confirm 卡确认/取消，detail: `{ cardId, accepted }` |
| `af-chat:abort` | 流式中点击「停止」 |
| `af-chat:error` | session.send 抛错，detail: `{ message }` |

### 方法

| 签名 | 说明 |
| --- | --- |
| `focus(): void` | 聚焦输入框 |
| `scrollToBottom(): void` | 滚动到底部并恢复自动跟随 |
<!-- gen:end:api -->

## 卡片 schema（ContentBlock `type: 'card'`，封闭集三种）

| kind | 字段 | 说明 |
| --- | --- | --- |
| `confirm` | title / rows（label+value）/ confirmText / cancelText / danger | 确认卡：危险操作红色态，确认/取消触发 `af-chat:confirm` |
| `list` | title / items（title + desc? + meta?） | 列表卡：只读信息展示 |
| `actions` | options（label + value） | 快捷回复：渲染为 composer 上方 chips，点击触发 `af-chat:action` |

> 未知 kind 兜底为纯文本块，不报错。卡片由白名单 class 在 light DOM 构建（slot 投影进气泡），气泡在 Shadow DOM 内。

## 无障碍

- 消息容器 `role="log"` + `aria-live="polite"`：流式文本标 `aria-hidden`（避免逐 token 播报），完成后一次性播报全文
- composer textarea 以 placeholder 作 aria-label；容器 `tabindex="0"` 可聚焦滚动
- 卡片与 chips 按钮均为原生 button，天然支持键盘操作
- `prefers-reduced-motion: reduce` 时关闭流式光标闪烁
- `focus()` 供外层 sheet（af-action-sheet）焦点陷阱对接
