# af-mobile UI —— Chat 对话子库 UI 组件详细设计（@af-mobile/ui/chat）

> 状态：设计已确认（2026-08-19 头脑风暴，三项关键决策经用户逐项确认）
> 关联：`src/chat/`（已有会话核心）、`docs/design/charts-sublibrary-detailed-design.md`（子库先例）

## 目录

- 0. 概述与范围
- 1. 决策记录
- 2. 架构与目录结构
- 3. 消息 schema 扩展（card 块）
- 4. af-chat 组件详设
- 5. 卡片渲染器（封闭集 v1）
- 6. API 与事件协议
- 7. 交互细节
- 8. 无障碍设计
- 9. 体积预算与 size-check 集成
- 10. 三源同步 / 类型 / prompt 注入
- 11. 测试策略
- 12. 明确不做清单
- 13. 实施分期

## 0. 概述与范围

### 0.1 问题

af-mobile 生成的应用需要"通过 AI 聊天完成大部分常用功能"。`src/chat/` 已提供框架无关的会话核心（createSession / parseSSE / 工具循环 / abort），但**没有 UI 组件**——目前 demo 用裸 HTML + 内联样式演示，消费端无法直接使用。缺的是 UI 层：一个把类型化消息流渲染成交互界面的 Web Component。

### 0.2 目标

1. `af-chat` 组件：气泡流 + composer + 工具状态芯片 + 卡片槽，嵌入任意容器（页面 / sheet / tab 面板）
2. 封闭卡片集 v1：`confirm` / `list` / `actions` 三种，卡片内容由白名单 class 构建——**白名单就是 AI 的动作空间**
3. 双模式 API：绑定 session（一行接线）或受控 messages（纯渲染），UI 不耦合传输协议
4. 随 `@af-mobile/ui/chat` 独立入口发布，独立预算线，主库 23KB 预算零影响

### 0.3 非目标（详见 §12）

卡片轨迹展开、自定义卡片注册、语音/图片输入、时间戳分组、历史会话管理 UI。

## 1. 决策记录

以下三项经用户逐项确认，为本文档的前提约束：

| # | 决策 | 结论 | 关键理由 |
|---|---|---|---|
| D1 | 产品形态 | **全局 AI 入口**：af-chat 为可嵌入 sheet 的容器组件，与生成应用的页面结构共存，卡片通过事件驱动页面跳转 | 与"大部分常用功能"的定位匹配；复用 navbar/tabbar 现有入口位；不强迫所有生成应用同构 |
| D2 | 卡片协议 | **封闭卡片集**：AI 只能从库内置的卡片类型枚举中选择 | 输出空间小 → 可靠性高、prompt 简短、渲染确定性 100%；后续按需加类型 |
| D3 | 归属与预算 | **chat 子库**：UI 组件放 `src/chat/`，随独立入口发布，新设独立预算线 | 主库预算近满；聊天是 AI 原生应用的专属能力，按需引入符合子库先例（charts） |

配套的两层渲染决策（见 §2.2）：气泡在 Shadow DOM 内渲染（chat 专属视觉，CSS 全走 `var(--*)`），卡片经 slot 投影为 light DOM（白名单 class 生效、复用零体积、XSS 面消失）。

## 2. 架构与目录结构

### 2.1 目录（镜像 charts 子库布局）

```
src/chat/
├── index.js            # 已有，扩展导出：AfChat / registerChat
├── index.d.ts          # 已有，扩展类型
├── session.js          # 已有，不动
├── message.js          # 已有，JSDoc 扩展 card 块类型（无行为变更）
├── stream.js           # 已有，不动
├── tool.js             # 已有，不动
├── components/
│   └── af-chat.js      # 新增：Shadow DOM 外壳组件（~320 LOC / ≤1.6KB gzip）
└── lib/
    └── render.js       # 新增：气泡 + 卡片渲染器，纯函数（~260 LOC / ≤1.2KB gzip）
```

依赖方向：`components/af-chat.js` → `../../lib/af-element.js`（基类）+ `../../lib/with-i18n.js` + `../message.js`（类型）+ `../lib/render.js`。**不 import session.js**——绑定模式下 session 是注入的属性（鸭子类型），受控模式完全不需要。

### 2.2 两层渲染模型

```
<af-chat>                                  ← host（Shadow DOM 外壳）
  light DOM 子节点（由组件 JS 管理）：
  <div slot="card-{msgId}" data-card-id>   ← 卡片：白名单 class + 现有组件构建
  …
  Shadow DOM 内部：
  ├─ 滚动容器（智能跟随 + "↓ 最新"胶囊）
  │   ├─ 用户/AI 气泡（含 <slot name="card-{msgId}"> 投影位）
  │   └─ 工具状态芯片
  ├─ 快捷回复 chips 区（actions 卡片渲染处）
  └─ composer（textarea + 发送/停止）
</af-chat>
```

规则：

- **气泡**在 shadow 内渲染。对齐、配色是 chat 专属视觉，不进主库白名单；CSS 全部 `var(--*)`（`wc-shadow-use-token`）
- **卡片**是 host 的 light DOM 直接子节点（slot 分派只看 host 直接子节点），`slot="card-{messageId}"` 投影进对应气泡。文档级 CSS（recipes.css）天然作用 → 复用现有白名单 class 与组件，**零新增白名单为目标**；确有缺口时用 `::slotted()` 选择器在 chat shadow CSS 内补样式（af-dialog 已有先例：`footer > ::slotted(*)`），同样不进白名单
- **actions 卡片**例外：不进气泡，渲染在 composer 上方的 chips 区（shadow 内），仅最新一条 assistant 消息生效

### 2.3 入口导出（镜像 charts/index.js）

```js
// src/chat/index.js
export { createSession } from './session.js';          // 已有
export { createMessage } from './message.js';          // 已有
export { parseSSE } from './stream.js';                // 已有
export { defineTool } from './tool.js';                // 已有
export { AfChat } from './components/af-chat.js';      // 新增
export const CHAT_TAGS = { 'af-chat': AfChat };
export function registerChat() { /* 幂等，customElements.get 守卫 */ }
```

## 3. 消息 schema 扩展（card 块）

`message.js` 的 `ContentBlock` 新增第四种类型（纯 JSDoc 扩展，无行为变更，现有 4 个 chat 测试不受影响）：

```js
/**
 * @typedef {Object} ContentBlock
 * @property {'text'|'tool_call'|'tool_result'|'card'} type
 * @property {string} [text]
 * @property {CardPayload} [card]
 */

/**
 * @typedef {Object} CardPayload
 * @property {'confirm'|'list'|'actions'} kind
 * @property {string} [title]
 * @property {Array<{label: string, value: string}>} [rows]        // confirm
 * @property {string} [confirmText]                                 // confirm
 * @property {string} [cancelText]                                  // confirm
 * @property {boolean} [danger]                                     // confirm：破坏性操作样式
 * @property {Array<{title: string, desc?: string, meta?: string}>} [items]  // list
 * @property {Array<{label: string, value: string}>} [options]      // actions
 */
```

卡片块结构由 AI 侧（工具结果 → system prompt 指导模型产出）或消费端代码构造；af-chat 只渲染，不校验业务语义（未知 `kind` 渲染为兜底文本卡，不崩组件）。

## 4. af-chat 组件详设

### 4.1 属性（defineProp）

| 属性 | 类型 | 说明 |
|---|---|---|
| `messages` | Array | 受控模式：Message[]，setter 触发全量渲染（消费端低频调用） |
| `session` | Object | 绑定模式：注入 createSession() 实例，setter 内 subscribe 增量渲染 |
| `placeholder` | String | composer 占位文案（i18n 键 `chat.placeholder`） |
| `busy` | Boolean | 只读反射：绑定模式下随 session.state === 'streaming'（属性存在即真语义，false 时 removeAttribute） |

双模式互斥：设置 `session` 后 `messages` setter 忽略外部赋值（以 session 为真相源）。

### 4.2 渲染管线

- **绑定模式（推荐）**：session.subscribe 通知 → 增量渲染——新消息 append 气泡节点；流式更新只改最后一条 assistant 气泡的 textContent（不重渲列表）；工具芯片按 tool_call/tool_result 块状态切换
- **受控模式**：messages setter 全量重渲（消息量级 <100 可接受）
- 消息 `id` 作 key；卡片 light DOM 节点随消息生命周期增删，卸载时由基类 `_listen` 机制 + `unmounted()` 清理观察器

### 4.3 composer

- textarea 自适应高度（rows=1 起步，max 4 行）；**font-size: 16px**（iOS 防缩放铁律）
- Enter 发送 / Shift+Enter 换行；空文案禁发
- 流式中发送按钮切换为"停止"（点击 → session.abort() + `af-chat:abort` 事件）

### 4.4 智能滚动

- 新内容到达且用户位于底部 → 自动跟随
- 用户上滑离开底部 → 停止跟随，出现"↓ 最新"胶囊（`prefers-reduced-motion` 下无过渡）
- 点击胶囊 → 平滑回底并恢复跟随

### 4.5 工具状态芯片

assistant 消息内的 tool_call / tool_result 块渲染为单行芯片：`调用 get_weather…`（进行中）→ `✓ get_weather`（完成）。v1 不可展开（P2 项）。

## 5. 卡片渲染器（封闭集 v1）

三种卡片均为 light DOM + 白名单 class 渲染，插槽投影进气泡（§2.2）：

| kind | 渲染目标 | 交互 | 事件 |
|---|---|---|---|
| `confirm` | `.card` 容器 + rows（label/value 行）+ `.btn` 确认/取消按钮排；danger 时确认按钮警示样式 | 破坏性操作执行前的 diff 确认 | `af-chat:confirm { cardId, accepted }` |
| `list` | `.card` + `.list-item` 行（title/desc/meta） | 只读展示查询结果 | 无 |
| `actions` | composer 上方 chips（shadow 内） | 快捷回复：点击后发 `af-chat:action`，绑定模式下组件内部随即 `session.send(value)`（不重复发 send 事件）；受控模式由消费端决定后续 | `af-chat:action { cardId, value }` |

实现期核对 `whitelist-v1.json` 优先复用现有 class；缺口用 `::slotted()` 兜底（§2.2），**白名单零新增为目标**。所有卡片文本插值经 `esc()`（AGENTS #1）。

## 6. API 与事件协议

```js
import { registerChat, createSession, defineTool } from '@af-mobile/ui/chat';
registerChat();

const chat = document.querySelector('af-chat');
chat.session = createSession({ endpoint, tools, systemPrompt });  // 绑定模式
// 或受控：chat.messages = msgs; chat.addEventListener('af-chat:send', …)
```

事件全部 `af-{组件}:{动作}` 格式，`bubbles: true, composed: true`（AGENTS 事件规范）：

| 事件 | detail | 触发 |
|---|---|---|
| `af-chat:send` | `{ text }` | composer 发送（绑定模式组件内部同时调 session.send） |
| `af-chat:action` | `{ cardId, value }` | actions chip / 卡片按钮 |
| `af-chat:confirm` | `{ cardId, accepted }` | confirm 卡按钮 |
| `af-chat:abort` | `{}` | 停止按钮 |
| `af-chat:error` | `{ message }` | 绑定模式 session 错误转发 |

方法：`focus()`（聚焦 composer）、`scrollToBottom()`。

## 7. 交互细节

- **流式**：逐字渲染 + 呼吸光标（CSS animation），消息完成光标消失
- **中止**：保留已流式部分 + 行尾"已停止"标记
- **错误**：渲染为重试卡片（一句人话 + 重试按钮），非 toast；点击重试 → 重发上一条用户消息（绑定模式内部处理，受控模式发 `af-chat:action` value='retry'）
- **性格克制**：组件不产出任何客套文案；空态文案走 i18n（`chat.empty`）

## 8. 无障碍设计

- 消息容器 `role="log"` + `aria-live="polite"` + `aria-label`；**流式文本节点标 `aria-hidden`，完成后移除**——避免逐 token 播报，完成时一次性播报
- composer textarea 关联 aria-label（取 placeholder 值）；消息容器 `tabindex="0"` 可聚焦滚动
- actions chips / 卡片按钮为原生 button（天然可聚焦、可回车）
- `@media (prefers-reduced-motion: reduce)`：关闭光标闪烁、胶囊过渡（AGENTS #2）
- 焦点：`focus()` API 对接外层 sheet 焦点陷阱；组件自身不做陷阱（af-dialog 层职责）

## 9. 体积预算与 size-check 集成

`scripts/size-check.mjs` 新增预算线（现有 chatRuntime 块之后，测量方式镜像）：

| 预算线 | 预算（KB gzip） | 说明 |
|---|---|---|
| chatRuntime（已有） | 2.5 | 实测 1.860KB（含 ct.* 字典），不动 |
| **chatUI（新增）** | **3.3** | af-chat.js + lib/render.js + 入口导出增量 |

合计 chat 子库 ≤ 5.5KB 独立预算；主库 total 23.0KB 不动。超预算走 AGENTS §2 处理流程（优化实现，不调大预算）。

> **实施修订（v2.0.0）**：chatUI 单线 3.0 → 3.3KB。计划期 3.0KB 参照 af-number-keyboard 1.924KB（单组件）预估，但 af-chat 为复合容器（气泡流 + composer + chips + 错误重试 + 回底 + 卡片渲染管线），参照物错位。实施中已穷尽正当压缩（CSS 分组合并 / shadow class 1-2 字符缩写 / i18n 键精简 / 模板紧凑化，3.338 → 3.212KB），纯压缩无法达标且砍功能违反 §4/§5/§7 范围。**总量约束 5.5KB 不变**（实测 1.860 + 3.212 = 5.072KB ✓），单线重分配不突破总盘。

## 10. 三源同步 / 类型 / prompt 注入

- **白名单**：目标零新增（§5）；若实现期确需新增 class，走三源登记 + `npm run whitelist:check`
- **类型**：`src/chat/index.d.ts` 扩展 AfChat 类、CHAT_TAGS、registerChat、CardPayload 类型（`npm run types:check`）
- **prompt**：system-prompt.md 注入 af-chat 词汇表（组件清单 + 三种卡片 schema 摘要），对齐 charts 子库在 prompt 中的处理方式；生成端 AI 从此与运行时说同一套语言（飞轮闭环），跑 `npm run prompt:check`
- **demo**：`demo/af-chat.html` 新增；playground 现有 chat 场景（裸 HTML）升级为组件演示
- **文档**：`docs/af-chat.md`（对齐 af-number-keyboard.md 体例）

## 11. 测试策略

`test/chat-ui.test.js`（vitest + jsdom，新增；现有 4 个 chat 逻辑测试不动）：

1. 渲染：用户/AI 气泡、三种卡片、工具芯片两态、未知 kind 兜底
2. 事件：send/action/confirm/abort/error 的 detail 与 composed/bubbles
3. 双模式：受控 setter 全量渲染；绑定模式 mock session 的 subscribe 增量更新
4. 流式：增量 textContent 更新不重渲列表（节点引用相等断言）
5. 状态：中止保留部分文本、错误重试卡片
6. a11y：role="log"、流式 aria-hidden 时序、composer 16px 字号断言、prefers-reduced-motion CSS 存在性
7. XSS：卡片文本含 `<img onerror>` 不执行

自检：AGENTS §2 全量（ESLint 子库按 COMPONENT_RULES：wc-shadow-use-token / wc-aria-required / wc-cleanup）。

## 12. 明确不做清单

- 卡片工具轨迹展开（P2：芯片点击展开完整 tool_call/result）
- 自定义卡片类型注册（消费端逃生舱）
- 语音输入、图片输入、文件上传
- 消息时间戳分组、已读回执
- 历史会话管理 UI（数据层 initialMessages 已支持，纯 UI 不做）
- 多模型/多端点切换 UI

## 13. 实施分期

| 阶段 | 内容 | 完成标准 |
|---|---|---|
| Phase 1 外壳可用 | af-chat 组件 + 文本气泡流 + composer + 双模式 + 5 事件 + chatUI 预算线 + 核心测试 | AGENTS §2 全绿；mock session 可完整对话（流式/中止） |
| Phase 2 卡片完整 | 3 卡片渲染器 + 工具芯片 + 智能滚动胶囊 + 重试卡 + demo/playground/docs/prompt 注入 + 全量测试 | AGENTS §2 全绿（含 prompt:check）；playground 场景替换为组件版 |

每阶段结束跑一次全量自检；Phase 2 完成后移除 demo 中的裸 HTML 聊天演示。
