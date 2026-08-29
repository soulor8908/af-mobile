# af-chat 富内容升级设计（markdown / 消息操作 / 思考 / 输入区）

> 状态：已评审（体积探针实测 + 用户拍板）。决策登记：[DECISIONS.md D-013](../DECISIONS.md)（局部推翻 D-012）。
> 上游文档：[af-chat-detailed-design.md](./af-chat-detailed-design.md)（本文覆盖其 §9 的「合计 ≤ 5.5KB」总量约束）。

## 1. 背景与范围

D-012 将 af-chat 定位收敛为嵌入式「能干活的 AI」并砍掉 markdown/regenerate。用户复盘后要求按成熟产品基线补齐 5 项能力（原 10 项缺口清单中的 1/2/3/6/8）：

| # | 能力 | 现状缺口 |
|---|---|---|
| 1 | Markdown 渲染 | assistant 气泡纯文本 textContent，`\n·` 伪列表 |
| 2 | 代码块 + 复制 | 无 pre/code、无复制按钮 |
| 3 | 消息操作 | 仅错误条重试；无复制全文/重新生成/编辑重发 |
| 6 | 思考展示 | `delta.reasoning_content` 被静默丢弃；首 token 前无 loading |
| 8 | 输入区体验 | busy 时 Enter 静默吞掉；切页丢草稿（auto-grow 已落地） |

不在本批（维持 D-012）：图片/多模态、会话管理（列表/切换）、时间戳/日期分组、上下文截断、流式重试/超时、长列表虚拟化。

## 2. 体积实测（探针口径：esbuild minify + gzip，与 scripts/size-check.mjs 一致）

探针原型位于 `tmp-probe/`（已删，数据存档于此）：

| 口径 | 基线 | 叠加后 | 预算 |
|---|---|---|---|
| chatRuntime（session+message+stream+tool+i18n） | 1.953KB | 2.157KB（+209B） | 2.5KB ✓ |
| chatUI（af-chat + render + md） | 3.447KB | 4.514KB（+1067B） | 4.6KB ✓（新） |
| 合计 | 5.400KB | 6.671KB | 7.1KB ✓（新） |

拆账（gzip）：md 渲染+代码复制 604B；思考折叠+操作行+排队+草稿 463B；regenerate/resend API 177B；reasoning_content 解析 32B；字典 5 键×2 语言 ~60B。
md 渲染器极致压缩后本体 476B（raw 771B），手法：escape 一次 → 围栏抽占位符 → 全 replace 链（零循环）→ 原生 `h1-h3`/`details`/免引号属性/`content:attr(aria-label)`。

## 3. 内容块模型扩展（message.js）

`ContentBlock` 新增 `think` 类型（仅 typedef，`createMessage` 结构不变）：

```
{ type: 'think', text: string }   // reasoning_content 逐字累积，UI 折叠展示，不回传 API
```

`toAPIMessages()` 天然忽略 think 块（只拼 text/tool_call/tool_result）——思考内容不发回模型，无协议风险。

## 4. Session API（session.js）

在既有 `send/abort/retry/clear/append/subscribe` 基础上新增：

| API | 行为 | 守卫 |
|---|---|---|
| `regenerate(): Promise<void>` | 丢弃末条 user 之后的 assistant/tool 残片（同 retry 的 splice 逻辑），重新 stream | `state !== 'idle'` 或无 user 消息时 resolve 空操作 |
| `resend(id, text): Promise<void>` | splice 掉指定 user 消息及其后全部，push 新 user 消息，重新 stream（编辑重发；UI 本批不提供编辑入口，供宿主自建） | `state !== 'idle'` 或 id 非法时 resolve 空操作 |
| reasoning 解析 | `delta.reasoning_content` 按 think 块累积（与 text 块同款相邻合并） | — |

regenerate 与 retry 共享「残片清理」实现语义：`tool_calls` 无对应 tool 结果会导致 API 400，必须整段丢弃。

## 5. UI 行为（af-chat.js + render.js + i18n.js）

### 5.1 markdown 渲染（src/chat/lib/md.js，新文件）

安全子集（封闭集哲学延续）：

- 块级：`h1-h3`（原生标签）、`ul/ol`（`m` 标志跨行分组；混合标记连续行合并为单列表，ol 优先——拆分语义 +85B 不做）、围栏代码（``` 围栏，先抽取为 `\x00N\x00` 占位符防内部语法误伤）、普通行走 `.m` 的 `pre-wrap` 换行（**不生成 `<p>`**）
- 行内：`` `码` ``、`**粗**`、`*斜*`、`[文](https?://…)`（非 http(s) 的 href 一律不生成，`javascript:` 天然拒绝）
- 流式中未闭合围栏原样透出，闭合后自动成形（与主流产品一致）
- **escape-first**：全文先 `escapeHtml` 再标注，渲染管线无任何未转义插值点

### 5.2 气泡结构（bubbleHTML/updateBubble 变更）

assistant 气泡新增三区（`<span class="x">` → `<div class="x">`）：

```
.tw 工具芯片区（不变）
.kt <details><summary> 思考折叠（原生展开收起，零 JS；summary 文案：流式无正文=「思考中…」，否则「已思考」）
.x  md 渲染区（innerHTML = md(text)；_h 缓存防同串重排）
.ma 操作行（复制全文 / 重新生成；streaming 或空文本时隐藏）
```

- 完成态 sr-only 播报、aria-hidden 流式时序、光标 `.cu` 机制不变
- 代码块复制按钮 `data-copy` 事件委托到 `.lg`（copy `pre.textContent`）；按钮文案走 `content:attr(aria-label)`（`ct.cc`），零文本节点

### 5.3 输入区

| 行为 | 实现 |
|---|---|
| 忙碌排队（绑定模式） | busy 时 `send/Enter/chip` → 存 `_queued`，清空输入并回落单行，发 `af-chat:queued {text}`（宿主可 toast）；`_busy()` 检测回 idle 自动消化 |
| 受控模式 busy | 维持旧行为：Enter 忽略、按钮=abort 事件，不入队 |
| 草稿 | input 事件发 `af-chat:draft {text}`，持久化由宿主负责（库不存） |
| auto-grow | 已在基线落地（scrollHeight 贴合 + CSS max-height 封顶） |

### 5.4 事件与 i18n

- 事件新增：`af-chat:draft`、`af-chat:queued`（复用 `af-{component}:{action}` 命名 + bubbles+composed）
- 字典新增 5 键 ×2 语言：`ct.cc`（复制代码）/`ct.cp`（复制）/`ct.rg`（重新生成）/`ct.tk`（思考中…）/`ct.tkd`（已思考）

## 6. 安全分析

| 面 | 对策 |
|---|---|
| md 输出 | escape-first：正文/代码/属性值全部经 `escapeHtml` 后才进入 replace 标注链；无 `img/script/iframe` 生成路径 |
| 链接 href | 正则仅接受 `https?://`，且 `[^)\s]+` 排除引号/空白（免引号属性无法被注入逃逸）；固定 `target=_blank rel=noopener` |
| 流式 | 与旧版同款：流式期 aria-hidden 不进 live region；完成后 sr-only 播报 textContent（纯文本） |
| 卡片/芯片 | 既有 esc 路径不变 |

对比 D-012 担忧的「外挂 renderer 使用方担责」：内置 escape-first 由**库**担责，安全属性更强；这是推翻该条的技术依据之一。

## 7. 体积与预算（size-check.mjs 变更）

| 预算线 | 旧 | 新 | 说明 |
|---|---|---|---|
| chatRuntime | 2.5KB | 2.5KB（不变） | 实测 2.157KB |
| chatUI | 3.3KB | **4.6KB** | 实测 4.514KB；含 md.js + 既有欠账 147B（auto-grow/三点占位/clear/retry 已落地未调预算） |
| 子库合计 | 5.5KB（设计文档 §9，未入 CI） | 7.1KB | 主库 23KB 红线零影响 |

## 8. 测试清单

- **新增 test/chat-md.test.js**（~21 用例，自探针冒烟转正）：标题/列表/围栏/行内/链接免引号/XSS 转义/占位符无残留/围栏内语法不误伤/缩进列表/`#`无空格不误判/空输入/未闭合围栏透出/混合标记合并
- **test/chat-session.test.js 增**：regenerate 末轮重跑（残片清理+不重复 push user）、regenerate 流式中空操作、resend 编辑重发（旧消息及后继整段移除）、resend 流式中空操作、reasoning_content 聚合为 think 块、think 块不进 API 请求体
- **test/chat-ui.test.js 增/改**：`.x` div 断言更新；updateBubble 传 `t`；think 折叠渲染与 label 切换；操作行 streaming 隐藏/完成显示 + 复制全文/重新生成触发；代码块复制按钮委托；忙碌排队（queued 事件 + 回 idle 自动发送 + abort 保留队列语义）；draft 事件；受控模式 busy 不入队
- **门禁**：AGENTS §1 全套（eslint / vitest / size / whitelist / types / aria / prompt）

## 9. 边界与残余风险

- **regenerate 副作用**：重跑会再次执行工具循环。立规（继承 D-012 连带发现 #2）：删除/写入类工具必须 confirm 卡片前置，否则不得用于 regenerate 场景；undo 能力列为下一批候选（D-012 连带发现 #1 优先级提升）
- **md 全量重解析**：每个 delta 对全文跑 replace 链（O(n²) 字符级）——长回答场景可接受（与旧版全量 textContent 比对同量级）；虚拟化/分片渲染留给长列表议题
- **操作行/折叠/复制按钮的命令式文案**不随 localechange 热更新（每次 updateBubble 重设，下次对话回合生效）；静态 i18n 映射（placeholder/回底/空态）不受影响
- **混合标记列表**：`- a` 与 `1. b` 连续行合并为单列表（CommonMark 会拆分）——省 85B 的已知取舍，AI 输出场景罕见
