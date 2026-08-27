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
