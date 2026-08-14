# @af-mobile/chat

框架无关的会话核心 + 框架适配层，基于 `@af-mobile/ui` 生态的移动端聊天 SDK。

- **core/**：框架无关业务逻辑（会话 / 消息 / SSE 流式解析 / 工具调用）
- **adapters/react/**：`useChat` Hook
- **adapters/vue/**：Vue 适配层

> **API 不稳定**：`0.x` 阶段 minor 升级可能不兼容，升级前查看 CHANGELOG。

## 安装

```bash
npm install @af-mobile/chat
# 使用 React 适配层时，React >= 18 为 peerDependency（可选）
```

## 快速上手（原生 JS）

```js
import { createSession, defineTool } from '@af-mobile/chat';

const session = createSession({
  endpoint: '/api/chat',            // OpenAI 兼容 /chat/completions
  systemPrompt: '你是一名记账助手',
  tools: [
    defineTool({
      name: 'get_balance',
      description: '查询账户余额',
      parameters: { type: 'object', properties: { id: { type: 'string' } } },
      async execute(args) { return db.getBalance(args.id); },
    }),
  ],
  onMessage: (msg) => console.log(msg), // 每产生一条消息回调（流式分片聚合后）
});

await session.send('你好');
console.log(session.messages);       // 会话历史（含工具调用/结果块）
```

## React 适配层

```jsx
import { useChat } from '@af-mobile/chat/react';

function Chat() {
  const { messages, isStreaming, send } = useChat({ endpoint: '/api/chat' });
  return (
    <div>
      {messages.map((m) => <p key={m.id}>{m.content.map((b) => b.text ?? '').join('')}</p>)}
      <button disabled={isStreaming} onClick={() => send('你好')}>发送</button>
    </div>
  );
}
```

## 核心 API

| 导出 | 说明 |
|---|---|
| `createSession(opts)` | 创建会话：管理消息历史、SSE 流式请求、工具调用循环（默认最多 6 轮）、`send`/`append`/`abort`/`subscribe` |
| `createMessage(init?)` | 创建消息对象（`{ role, id, content: ContentBlock[] }`） |
| `parseSSE(res)` | 解析 `Response` 为 OpenAI 标准 SSE 事件异步生成器 |
| `defineTool(tool)` | 定义可注册工具（`name`/`description`/`parameters`/`execute`） |

### SessionOptions

| 字段 | 说明 |
|---|---|
| `endpoint` | 服务端地址（OpenAI 兼容 SSE） |
| `systemPrompt` | 系统提示词，字符串或函数（每次 send 动态生成） |
| `tools` | 工具列表（自动注入 `tools` 字段 + 处理 `tool_calls`） |
| `requestFn` | 自定义请求函数（默认 `fetch`，可注入鉴权头） |
| `maxToolRounds` | 工具调用最大轮数，默认 6 |
| `onMessage` | 消息产生回调（工具结果消息也会触发） |
| `initialMessages` | 初始消息历史 |

## 协议

`@af-mobile/chat` 采用 **OpenAI 标准 SSE** 协议：

```
data: {"choices":[{"delta":{"content":"你"}}]}
```

`delta.content` 流式文本分片；`delta.tool_calls` 工具调用分片（按 index 聚合）。

## 开发

```bash
npm run test      # vitest 单测（core/*.test.js）
```
