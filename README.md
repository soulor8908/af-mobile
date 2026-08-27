# @af-mobile/ui

Mobile-first Web Components library with **L1/L2/L3/L4 四层分层设计体系**。

- **L1 Token**：92 个 CSS 变量（颜色/间距/字号/圆角/阴影/动效，含 8 档灰阶，关键组合 WCAG AA 对比度由 CI 断言）
- **L2 配方 + 原子**：228 个白名单封闭集 class（136 配方 + 92 原子，`btn`/`card`/`p-4`/...）
- **L3 真组件**：30 个原生 Custom Elements（`af-list`/`af-dialog`/`...`），ESM 命名导出 + Tree Shaking
- **L4 AI 约束层**：System Prompt 引导 + ESLint 21 条规则兜底 + CI 保护

## 在线 Demo

30 个核心/交互组件 + 5 个图表组件的可交互 demo，每个组件一页，含属性配置、事件演示与源码对照，覆盖核心组件、交互组件、图表组件与联动场景：

👉 **<https://soulor8908.github.io/af-mobile/demo/index.html>**

本地跑 demo：`npm run demo`（详见 [本地开发](#本地开发)）。

## 快速开始（AI 对话式脚手架）

> 面向小白：**一条命令生成可运行工程，然后用对话完成开发**，无需手工配置路由/打包器/ESLint。

```bash
npm create af-mobile@latest my-app
cd my-app && npm install && npm run dev
```

> `npm create af-mobile` 等价于 `npx create-af-mobile`（npm init 约定，vite/astro 同款）：按需下载并执行脚手架，无需先手动 `npm install`；第二步的 `npm install` 才是把库装进生成的工程。切勿写裸 `npx af-mobile`——npm 上存在同名第三方包，会装错。

生成工程自带 `af-mobile-grill` skill（对话式脚手架）与消费端 ESLint 约束。打开任一 AI 编码工具（TRAE / Claude Code / Cursor 等），说一句"我想做一个习惯打卡应用"，skill 会引导你：**拷问需求 → 需求拆分 → demo 确认 → 一次性生成页面**。

### CLI 用法

```bash
npm create af-mobile@latest <目录名>    # 生成新工程（脚手架 + skill 自举）
npx create-af-mobile skill add [目录]   # 已建项目补装 / 升级 skill（幂等，默认当前目录）
```

### af-mobile-grill skill 装到哪里

skill 是单文件 `SKILL.md`，随 `@af-mobile/ui` npm 包分发。`npm create af-mobile` / `npx create-af-mobile skill add` 把它写到**中立路径** `skills/af-mobile-grill/SKILL.md`，并在 `AGENTS.md` 追加指引段（marker 守卫，幂等）。

不写 `.trae/skills/` / `.claude/skills/` 等工具特定目录——任何读 `AGENTS.md` 的 AI 工具（TRAE / Claude Code / Cursor / Codex / Copilot / Windsurf 等）都能通过 `AGENTS.md` 找到 skill，避免假设用户用某工具而污染项目。

### 升级

```bash
npm update @af-mobile/ui && npx create-af-mobile skill add   # 库升级 + skill 同步
```

> 工程依赖 npm 包版本（非内嵌源码），升级只换库版本，业务代码不动。

## 安装（作为库依赖）

```bash
npm install @af-mobile/ui
```

> **消费端需有打包器 + 组件一律按需引入（铁律）**：`package.json` 的 `main`/`module` 指向 `src/index.js`（源码分发，裸 ESM + CSS import）。直接用 Vite/webpack/Rollup 等打包器处理 `import { AfList, AfDialog } from '@af-mobile/ui'` 并 `customElements.define`（或 `register('af-list', 'af-dialog')`），**只引入页面用到的组件**。**禁止 UMD 直引**（`dist/af-mobile.umd.js`）、**禁止 `registerAll()`**（全量注册 = 全局引入）、**禁止全局对象**——所有项目与 demo 一律按需引入。

## 快速上手

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="/node_modules/@af-mobile/ui/src/index.css">
</head>
<body>
  <main class="page">
    <header class="navbar navbar-fixed">
      <h1 class="title">商品列表</h1>
    </header>

    <af-list id="list"></af-list>

    <af-dialog id="dialog">
      <div slot="body">确认删除？</div>
      <div slot="footer">
        <button class="btn btn-ghost btn-block">取消</button>
        <button class="btn btn-danger btn-block">删除</button>
      </div>
    </af-dialog>
  </main>

  <script type="module">
    import { AfList, AfDialog, register } from '@af-mobile/ui';
    register('af-list');
    register('af-dialog');

    const list = document.getElementById('list');
    list.data = Array.from({ length: 100 }, (_, i) => ({
      title: `商品 ${i + 1}`,
      subtitle: `¥${(i + 1) * 9.9}`,
    }));
    list.addEventListener('af-list:itemclick', (e) => {
      console.log('click', e.detail.index);
    });

    // 分页加载示例：必须设 total-count，否则永不显示「没有更多了」
    list.totalCount = 256;          // 数据总条数（分页终止判断）
    list.addEventListener('af-list:loadmore', async (e) => {
      const page = e.detail.page;  // 从 1 开始，每次自动 +1
      const more = await fetch(`/api/goods?page=${page}`).then(r => r.json());
      list.data = [...list.data, ...more.items];
      // 请求完成后必须调用，传入 hasMore 控制是否继续触发下一次
      list.endLoadMore(list.data.length < list.totalCount);
    });
  </script>
</body>
</html>
```

## 组件 API 速查

| 组件 | 标签 | 关键属性 | 关键事件 | 方法 / slot |
|---|---|---|---|---|
| 长列表（虚拟滚动） | `<af-list>` | `data` `item-height` `total-count` `page-size` `refresh` | `af-list:loadmore` `af-list:itemclick` `af-list:refresh` | `endLoadMore()` `endRefresh()` |
| 轮播/滑动 | `<af-swiper>` | `autoplay` `loop` `active-index` | `af-swiper:change` | `goTo()` `next()` `prev()` |
| 标签页 | `<af-tabs>` | `tabs` `active-index` | `af-tabs:change` | `setActive()`；slot `panel-{i}` |
| 模态对话框 | `<af-dialog>` | `title` `close-on-esc` `close-on-backdrop` | `af-dialog:open` `af-dialog:close` | `open()` `close()` |
| 轻提示 | `<af-toast>` | `duration` | `af-toast:dismiss` | `show(message, options)` `dismiss()` |
| 底部操作面板 | `<af-action-sheet>` | `options` `title` `show-cancel` | `af-action-sheet:select` `af-action-sheet:close` | `showPopover()` `hidePopover()` |
| 滚轮选择器 | `<af-picker>` | `columns` `values` `title` | `af-picker:change` `af-picker:confirm` | `open()` `close()` `setColumn()` |
| 下拉菜单 | `<af-dropdown>` | `options` `value` `placeholder` | `af-dropdown:select` | `open()` `close()` |
| 懒加载图片 | `<af-img>` | `src` `alt` `placeholder-src` `fail-src` | `af-img:load` `af-img:error` | — |
| 回到顶部 | `<af-backtop>` | `threshold` `target` `position` | `af-backtop:click` | `scrollToTop()` |
| 开关 | `<af-switch>` | `checked` `loading` `disabled` `size` | `af-switch:change` | `toggle()` |
| 搜索栏 | `<af-search-bar>` | `value` `placeholder` `clearable` `debounce` | `af-search-bar:input` `af-search-bar:search` `af-search-bar:clear` | `focus()` |
| 骨架屏页面 | `<af-skeleton-page>` | `variant` | — | — |
| 文件上传 | `<af-upload>` | `accept` `multiple` `max-size` `max-count` `button-text` | `af-upload:change` `af-upload:error` | `clear()` |
| 顶部导航栏 | `<af-navbar>` | `title` `show-back` `back-text` | `af-navbar:back` | — |
| 底部标签栏 | `<af-tabbar>` | `tabs` `active-index` `fixed` | `af-tabbar:change` | `setActive()` |
| 步进器 | `<af-stepper>` | `value` `min` `max` `step` `disabled` | `af-stepper:change` | `setValue()` |
| 表单字段 | `<af-field>` | `label` `icon` `type` `input-type` `value` `placeholder` `help` `error` `disabled` `readonly` | `af-field:input` `af-field:change` | `setError()` `focus()`；slot `input`（透传自定义控件） |
| 数字键盘 | `<af-number-keyboard>` | `value` `maxlength` `random` `title` | `af-number-keyboard:input` `af-number-keyboard:delete` `af-number-keyboard:complete` `af-number-keyboard:close` | `open()` `close()` |
| 密码/验证码输入 | `<af-password-input>` | `value` `length` `mask` `focused` | `af-password-input:complete` | 配对 `af-number-keyboard` 驱动输入 |
| 下拉刷新 | `<af-pull-refresh>` | `refreshing` | `af-pull-refresh:refresh` | `endRefresh()` |
| 滑动单元格 | `<af-swipe-cell>` | `disabled` | `af-swipe-cell:action` | `open()` `close()`；slot `content` / `right` |
| 级联选择器 | `<af-cascade-picker>` | `tree` `values` `title` | `af-cascade-picker:change` `af-cascade-picker:confirm` | — |
| 徽章 | `<af-badge>` | `value` `max` `dot` `type` | — | — |
| 日历 | `<af-calendar>` | `value` `min` `max` `first-day-of-week` | `af-calendar:change` `af-calendar:select` | — |
| 评分 | `<af-rate>` | `value` `max` `allow-half` `readonly` `disabled` | `af-rate:change` | — |
| 公告栏 | `<af-notice-bar>` | `text` `mode` `scrollable` | `af-notice-bar:close` | — |
| 进度条 | `<af-progress>` | `value` `max` `show-text` `variant` | — | — |
| 步骤条 | `<af-steps>` | `steps` `active-index` `direction` | — | — |
| 倒计时 | `<af-countdown>` | `target` `format` `auto-start` | `af-countdown:change` `af-countdown:finish` | `start()` `pause()` `reset()` |

事件名遵循 `af-{组件}:{动作}` 格式，`event.detail` 携带结构化数据。
完整 API（属性默认值 / 方法签名 / 事件）以 `src/index.d.ts` 为准，文档站页面由 `npm run docs:gen` 从该文件自动生成，本表仅列高频项。

## 图表子库（@af-mobile/ui/charts）

> 独立入口，**不进主包**——不 `import './charts'` 就零字节加载，主库体积预算不受影响。SVG 原生渲染 + 2022+ 移动端基线，全量 ~15KB gzip 覆盖移动端 ~95% 高频图表场景。

```js
import { registerChart } from '@af-mobile/ui/charts';
registerChart('af-chart-line');   // 或 registerCharts() 全量 5 个
```

```html
<af-chart-line data='[{"label":"1月","value":120},{"label":"2月","value":150}]'
               variant="area" smooth legend></af-chart-line>

<af-chart-pie data='[{"label":"线上","value":62},{"label":"线下","value":38}]'
              variant="donut" center-text="{total}"></af-chart-pie>
```

| 组件 | 标签 | variant 覆盖 | 关键属性 | 关键事件 |
|---|---|---|---|---|
| 折线/面积/散点/迷你趋势 | `<af-chart-line>` | `line`/`area`/`scatter`/`spark` | `data` `labels` `series` `variant` `smooth` `show-axis` | `af-chart-line:select` |
| 柱状/条形/堆叠/分组 | `<af-chart-bar>` | `column`/`bar`/`stacked`/`grouped` | `data` `labels` `series` `variant` `max-count` | `af-chart-bar:select` |
| 饼/环形/半环/玫瑰 | `<af-chart-pie>` | `pie`/`donut`/`half`/`rose` | `data` `variant` `inner-radius` `center-text` | `af-chart-pie:select` |
| 雷达 | `<af-chart-radar>` | — | `data` `series` `shape` | `af-chart-radar:select` |
| 漏斗 | `<af-chart-funnel>` | — | `data` `show-rate` | `af-chart-funnel:select` |

- **数据契约**：单序列 `data='[{"label":"1月","value":120}]'`；多序列（line/bar）`labels` + `series='[{"name":"今年","values":[...]}]'`；雷达 `data='[{"label":"速度","value":80,"max":100}]'`
- **五态**：`loading`（骨架）/ `error`（重试，派发 `af-chart-{x}:retry`）/ `data` 空自动空态
- **主题**：取色读 `--c-brand/--c-success/--c-warn/--c-danger/--c-muted` token，深色模式免费跟随；数据项可带 `color` 覆盖
- **无障碍**：`role="img"` + 摘要 `aria-label` + 视觉隐藏数据表；动画响应 `prefers-reduced-motion`
- **体积预算**（CI 阻断）：内核 `chartsRuntime` ≤ 4.5KB / 全量 `chartsTotal` ≤ 15KB / 单图表组件 ≤ 2.8KB gzip

设计与分期详见 [docs/design/charts-sublibrary-detailed-design.md](docs/design/charts-sublibrary-detailed-design.md)。

## AI 对话子库（@af-mobile/ui/chat）

> 独立入口，**不进主包**——不 `import '@af-mobile/ui/chat'` 就零字节加载，主库体积预算不受影响。框架无关（无 DOM/CSS 依赖）的 OpenAI 兼容 SSE 会话核心：流式消息累积 + function calling 工具循环，可配任意 UI 层。

```js
import { createSession, defineTool } from '@af-mobile/ui/chat';

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
console.log(session.messages);      // 会话历史（含工具调用/结果块）
```

| 导出 | 说明 |
|---|---|
| `createSession(opts)` | 会话：消息历史 + SSE 流式 + 工具调用循环（默认 ≤6 轮）+ `send`/`append`/`abort`/`subscribe` |
| `createMessage(init?)` | 创建消息对象（`{ role, id, content: ContentBlock[] }`） |
| `parseSSE(res)` | 解析 `Response` 为 OpenAI 标准 SSE 事件异步生成器 |
| `defineTool(tool)` | 定义可注册工具（`name`/`description`/`parameters`/`execute`） |

- **协议**：OpenAI 标准 SSE——`data: {"choices":[{"delta":{"content":"你"}}]}`；`delta.tool_calls` 按 index 聚合（name/arguments 可跨帧）
- **传输**：默认 `fetch`，可传 `requestFn` 注入鉴权头 / 走代理 / 组装 URL；`systemPrompt` 支持函数（每轮动态取最新值）
- **体积预算**（CI 阻断）：内核 `chatRuntime` ≤ 2.5KB gzip（独立预算，不计入主库 total）

## k 渲染子库（@af-mobile/ui/k，演进中）

声明式应用层：`html\`\`` 返回真实 DOM + signal 细粒度更新（10 词极简 API + Show/For/Switch 控制流）。

```js
import { html, signal, render } from '@af-mobile/ui/k';
const n = signal(0);
render(html`<p @click=${() => n.set(v => v + 1)}>${() => n()}</p>`, '#app');
```

注意：k 的 `html\`\`` 与主包 `html\`\``（返回转义字符串）**同名不同义**，对比表与完整词表卡见 [src/k/README.md](./src/k/README.md)。定位与演进决策见 [docs/DECISIONS.md](./docs/DECISIONS.md)（D-001：推广为应用层）。

## SSR / Hydration 使用指南

@af-mobile/ui 是浏览器端 Custom Elements 库，`customElements` 在 Node 服务端不存在，直接 `import` 会抛错。本节给出 SSR 框架接入方式。

### 核心问题

| 问题 | 说明 |
|---|---|
| `customElements` 在服务端不存在 | Node 环境无 `customElements`，直接 `import` 会抛错 |
| `connectedCallback` 不触发 | 服务端无 DOM，组件不 upgrade |
| 属性 JSON 序列化 | `data`/`tabs` 等复杂属性需在 HTML 中预渲染 |

### 1. 客户端条件注册

仅在浏览器环境注册组件，避免服务端执行 `customElements.define`：

```js
// 仅在浏览器环境按需注册页面用到的组件（禁止 registerAll）
if (typeof window !== 'undefined') {
  const { AfList, AfDialog, register } = await import('@af-mobile/ui');
  customElements.define('af-list', AfList);
  register('af-dialog');
}
```

### 2. SSR 预渲染 Light DOM（首屏占位）

Light DOM 组件的结构（含 L2 class）可由服务端直接渲染到 HTML 作为**首屏占位**。客户端按需注册组件后 `connectedCallback` 触发，**会用组件内部模板重建 DOM 并接管交互**——这不是增量 hydration，SSR 子节点会被覆盖。因此 SSR 预渲染的价值是「避免白屏」，而非「复用服务端 DOM」。Shadow DOM 组件默认仅客户端挂载；实现了 `shadowHTML()` 的组件支持 **DSD（Declarative Shadow DOM）预渲染**——服务端调用 `el.dsdTemplate()` 输出 `<template shadowrootmode="open">`，无 JS 时结构/样式即刻可见，客户端 upgrade 接管交互（见 §3 矩阵）。

> ⚠️ **非增量 hydrate**：组件 `mounted()` 会用 `innerHTML` 重建内部结构（虚拟列表的 `.list` 外壳、tabbar 等）。SSR 输出的子节点仅作首屏占位，客户端 upgrade 后即被替换。若对首屏闪烁敏感，可在组件外加 `style="visibility:hidden"` 占位，upgrade 后再显隐。

```jsx
// Next.js 示例：服务端预渲染首屏占位结构
function ProductList({ items }) {
  return (
    <>
      {/* 服务端预渲染首屏占位（upgrade 后会被组件内部模板替换） */}
      <af-list data={JSON.stringify(items)} item-height={48}>
        <div class="list">
          {items.map((item, i) => (
            <div class="list-item" key={i}>
              <div class="body">{item.title}</div>
            </div>
          ))}
        </div>
      </af-list>
      {/* 客户端 lazy 加载组件库并按需注册（禁止 UMD 直引 / registerAll） */}
      <Script strategy="lazyOnload">
        {`import('@af-mobile/ui').then(({ AfList, register }) => {
          customElements.define('af-list', AfList);
          register('af-dialog');
        })`}
      </Script>
    </>
  );
}
```

Nuxt / Remix 同理：服务端输出 Light DOM + L2 class 作首屏占位，客户端 hydration 阶段动态 `import('@af-mobile/ui')` 并按需注册，组件 `connectedCallback` 重建内部结构并接管交互。

### 3. 组件 SSR 兼容性矩阵

| 组件 | DOM | SSR 预渲染占位 | 客户端 upgrade | 注意 |
|---|---|---|---|---|
| af-list | Light | ✓ 渲染 .list 结构 | ✓ 重建外壳+接管虚拟滚动 | 需 data 属性；非增量 hydrate |
| af-swiper | Shadow | ✓ DSD 预渲染结构 | ✓ 接管 touch | 需服务端调 dsdTemplate() |
| af-tabs | Light | ✓ 渲染 tabbar + panels | ✓ 重建外壳+接管切换 | 非增量 hydrate |
| af-dialog | Shadow | ✓ DSD 预渲染结构 | ✓ showModal | 需服务端调 dsdTemplate() |
| af-toast | Light | ✗ 不预渲染（单例按需） | ✓ 单例 | 仅客户端 |
| af-action-sheet | Light | ✗ 不预渲染（popover 按需） | ✓ popover | 仅客户端 |
| af-picker | Shadow | ✓ DSD 预渲染结构 | ✓ 接管 | 需服务端调 dsdTemplate() |
| af-dropdown | Light | ✗ 不预渲染（popover 按需） | ✓ popover | 仅客户端 |
| af-img | Light | ✓ 渲染 img + 占位 | ✓ 重建外壳+懒加载 | 需 src 属性；非增量 hydrate |
| af-backtop | Light | ✗ 不预渲染 | ✓ | 仅客户端 |
| af-switch | Light | ✓ 渲染 switch 结构 | ✓ 重建+接管 | 非增量 hydrate |
| af-search-bar | Light | ✓ 渲染搜索输入框 | ✓ 重建+接管 | 非增量 hydrate |
| af-skeleton-page | Light | ✓ 渲染骨架屏 | ✓ 重建+接管 | 适合 SSR loading 态 |
| af-navbar | Light | ✓ 渲染导航栏结构 | ✓ 重建+接管 | 非增量 hydrate |
| af-tabbar | Light | ✓ 渲染标签栏结构 | ✓ 重建+接管 | 非增量 hydrate |
| af-stepper | Light | ✓ 渲染步进器结构 | ✓ 重建+接管 | 非增量 hydrate |
| af-field | Light | ✓ 渲染表单字段结构 | ✓ 重建+接管 | 非增量 hydrate |
| af-upload | Light | ✓ 渲染上传触发器结构 | ✓ 重建+接管 | 非增量 hydrate |
| af-pull-refresh | Light | ✓ 渲染刷新指示结构 | ✓ 重建+接管 | 非增量 hydrate |
| af-swipe-cell | Light | ✓ 渲染滑动单元结构 | ✓ 重建+接管 | 非增量 hydrate |
| af-badge | Light | ✓ 渲染徽章结构 | ✓ 重建+接管 | 非增量 hydrate |
| af-rate | Light | ✓ 渲染评分结构 | ✓ 重建+接管 | 非增量 hydrate |
| af-notice-bar | Light | ✓ 渲染公告栏结构 | ✓ 重建+接管 | 非增量 hydrate |
| af-progress | Light | ✓ 渲染进度条结构 | ✓ 重建+接管 | 非增量 hydrate |
| af-steps | Light | ✓ 渲染步骤条结构 | ✓ 重建+接管 | 非增量 hydrate |
| af-countdown | Light | ✓ 渲染倒计时结构 | ✓ 重建+接管 | 非增量 hydrate |
| af-cascade-picker | Shadow | ✓ DSD 预渲染结构 | ✓ 复用 AfPicker 内核 | 需服务端调 dsdTemplate() |
| af-calendar | Shadow | ✗ Shadow 不预渲染 | ✓ 接管 | 仅客户端 |

> 规则：**Light DOM + 有初始可见结构** 的组件支持 SSR 预渲染作首屏占位；**Shadow DOM 中实现 `shadowHTML()` 的组件支持 DSD 预渲染**（上表 ✓ DSD）；未实现 `shadowHTML()` 的 Shadow 与按需弹层类组件仅客户端渲染。所有仅经 `innerHTML` 重建的组件 upgrade 时均为「重建接管」而非「增量 hydrate」。

## 框架集成（Vue 3 / React 原生直用）

`@af-mobile/ui` 是标准 Web Components，框架无关，可直接在 Vue/React 中作为原生自定义元素使用，无需适配器包。

### Vue 3

Vite 配置告知编译器哪些标签是自定义元素（避免当作原生元素解析），然后原生使用：

```ts
// vite.config.ts
export default {
  plugins: [vue()],
  template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('af-') } },
};
```

```vue
<script setup>
import { ref, onMounted } from 'vue';
import { register } from '@af-mobile/ui';
register('af-list');   // 按需注册（组件实现来自 @af-mobile/ui）

const items = ref([]);
const onLoadMore = (page) => { /* ... */ };
</script>

<template>
  <af-list :data="items" @itemclick="(e) => console.log(e.detail)" @loadmore="onLoadMore" />
</template>
```

- 自定义事件 `af-list:itemclick` → Vue 用 `@itemclick`，payload 在 `e.detail`
- 复杂属性（对象/数组）通过 property 传：`<af-list :data="items">` 即可

### React（19 完整支持自定义元素）

React 19（2024-12）已原生支持 Web Components：属性经 property 同步、无 `className→class` 手动映射问题，可直接使用。

```jsx
import { register } from '@af-mobile/ui';
register('af-list');   // 按需注册（组件实现来自 @af-mobile/ui）

function App() {
  return (
    <af-list
      data={items}
      onLoadmore={(e) => console.log(e.detail.page)}
      onItemclick={(e) => console.log(e.detail.index)}
    />
  );
}
```

- 自定义事件 `af-list:itemclick` → React 用 `onItemclick`（`on` + 动作名首字母大写），payload 在 `e.detail`
- props 通过 property 同步，支持对象/数组

> 曾有的 `@af-mobile/vue` / `@af-mobile/react` 适配器包已移除：它们从未发布、无外部消费者，且 React 19 / Vue 3 已原生支持 Web Components，薄包装失去价值。

## 注册方式（一律按需引入，铁律）

```js
// A. 按需注册（推荐，Tree Shaking 友好）
import { AfList, AfDialog } from '@af-mobile/ui';
customElements.define('af-list', AfList);
customElements.define('af-dialog', AfDialog);

// B. 单个注册辅助函数
import { register } from '@af-mobile/ui';
register('af-list');
register('af-dialog');
```

**禁止** `registerAll()`（全量注册 = 全局引入）、**禁止** UMD 直引（`dist/af-mobile.umd.js`）、**禁止** 全局对象（`window.AfMobile`）。所有项目与 demo 的组件必须按需引入。

## 路由与部署

路由器默认使用 **History 模式**（URL 形如 `/goods/123`，SEO 友好）。History 模式下用户刷新或直接访问子路径时，请求会先到达服务器——静态托管需要把所有路径 rewrite 回 `index.html`，否则刷新即 404。

不想配服务器？用 **hash 模式**（URL 形如 `/#/goods/123`），任意静态托管零配置直跑：

```js
import { route, start } from '@af-mobile/ui';
route('/', homeHandler);
start('#app', { hash: true });
```

| | History 模式（默认） | hash 模式 |
|---|---|---|
| URL 形态 | `/goods/123` | `/#/goods/123` |
| 服务端配置 | 需要 fallback（见下） | **零配置** |
| SEO | 好 | 差（`#` 后段不进索引） |
| 页内锚点 | 可用（`#top`） | 不可用（`#` 段被路由占用） |

### History 模式部署配置速查

```nginx
# nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

```json
// Vercel — vercel.json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

```
# Netlify — _redirects（放 public/ 根目录）
/*  /index.html  200
```

```js
// Express / Node
app.use(express.static('public'));
app.get('*', (req, res) => res.sendFile(path.resolve('public/index.html')));
```

```caddy
# Caddy
try_files {path} /index.html
```

```
# Cloudflare Pages / Netlify — public/_redirects 文件（放产物根目录）
/*  /index.html  200
```

Cloudflare Pages 注意：构建产物根目录**不要放 `404.html`**，否则会关闭 SPA 自动兜底，子路由刷新变真 404。

注意事项：

- **静态资源不能被吞**：以上配置均先尝试真实文件（`try_files $uri` / Express `express.static` 前置），确保 `/assets/*.js`、CSS 返回文件本体而非 HTML，否则页面白屏且控制台报「MIME type 不匹配」。
- **无需 fallback 的场景**：纯 MPA（页面间用原生 `<a>` 跳转）、hash 模式、登录后才用的内嵌 WebView 应用（用 hash 模式最省事）。

## 主题切换

提供 `initTheme` / `setTheme` / `toggleTheme` / `getTheme` 四个 API，通过 `data-theme` 属性控制 light/dark。

```js
import { initTheme, toggleTheme } from '@af-mobile/ui';
initTheme();              // 从 localStorage 恢复（入口尽早调用）
toggleTheme();            // 切换并持久化
```

### 消除暗色模式 FOUC（首屏闪烁）

`initTheme()` 在入口 JS 执行时才设 `data-theme`，系统暗色 + 用户存 light 时会先闪一下暗色再切回。**在 `<head>` 内联一段同步脚本，先于 paint 读取 localStorage 设 `data-theme`**：

```html
<head>
  <script>
    // 先于首次 paint 设定主题，避免 FOUC（无需等组件库加载）
    try {
      var t = localStorage.getItem('theme');
      if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    } catch (e) {}
  </script>
</head>
```

> 该脚本不依赖 @af-mobile/ui，可独立内联；组件库的 `initTheme()` 仍可调用（幂等，重复设同值无副作用）。

## L4 禁令（25 条，ESLint error 级）

写 AI 生成代码时务必遵守：

1. `tokens.css` 以外不可重定义 `--c-*/--s-*/--r-*/--t-*/--lh-*/--fw-*/--shadow-*/--z-*/--ease-*/--dur-*`
2. `style=""` 不可设置 `color/background*/padding*/margin*/font-size/border-radius/box-shadow`
3. 不可使用 173 白名单外的 class 名或自定义组件标签
4. `.btn`（非 ghost）不可叠加 `text-brand/text-danger/text-success`
5. `.input` 不可叠加 `t-sm/t-xs`（iOS 聚焦 < 16px 自动放大页面）
6. `.cell/.list-item` 不可叠加 `f/fc` 原子
7. 不可用 Tailwind 任意值语法：`p-[13px]/bg-[#abc]/p-7`
8. 不可互斥变体叠加：`btn-sm+btn-lg`、`tag-ok+tag-warn`、同属性原子重复
9. `.list-item/.list-item-cp` 自带 border-top 由 `.list` 容器管理，不要单独设
10. `.sheet` 显隐必须走原生 popover API `showPopover/hidePopover`
11. `.tab-item` 选中态单一真相源是 `aria-selected="true"`（视觉由属性选择器驱动，不可用 `active` class）
12. **Light DOM 组件**（`af-list`/`af-tabs`/`af-toast`/`af-action-sheet`/`af-dropdown`/`af-backtop`/`af-img`/`af-switch`/`af-search-bar`/`af-skeleton-page`/`af-navbar`/`af-tabbar`/`af-stepper`/`af-field`/`af-upload`/`af-pull-refresh`/`af-swipe-cell`/`af-badge`/`af-rate`/`af-notice-bar`/`af-progress`/`af-steps`/`af-countdown` 共 23 个）不可含 `<style>` 或 `this.style.xxx=`
13. **Shadow 组件** CSS 字符串不可硬编码颜色/间距/字号/圆角（`::backdrop` 遮罩 rgba(0,0,0,.5) 例外）
14. 事件名必须 `af-{组件}:{动作}` 格式；`emit` 必须 `composed:true`
15. `af-dialog/af-action-sheet` 必须有焦点陷阱（Tab 不逃出，关闭还原焦点）
16. `af-tabs` 必须 `aria-selected/aria-controls/aria-labelledby`
17. `.price` 不可叠加 `text-success/text-brand`（电商约定用 `--c-danger` 红色）
18. `.empty` 与 `.center` 不可在同一语义场景混用
19. `.hero` 不可用作内容区主体背景（仅用于页面顶部大留白标题区）
20. `.actions` 内 `.btn` 与 `.btn-block` 不可同时出现
21. `.tabbar-fixed/.cob/.input-bar` 必须含 `safe-area-inset-bottom`
22. `af-swiper/af-tabs/af-picker` 方向键切换必须焦点跟随（roving tabindex）
23. 不可手动创建 `.toast` 元素（必须通过 `af-toast.show()` 单例）
24. 骨架屏 `style=""` 不可设宽高（用 `.sk-ln` 配方或项目级扩展）
25. 不可在 JS 事件回调内调用 `setAttribute` 修改自身 attribute（单向数据流）

完整禁令详见 [docs/design/l4-detailed-design.md](docs/design/l4-detailed-design.md) §7.1。

## 项目级扩展

L4 设计支持三类扩展通道（不可混用）：

| 扩展类型 | 场景 | 文件 | 登记 |
|---|---|---|---|
| L2 配方/原子变体 | `.avatar-lg`（大头像）、`.btn-gradient` | `recipes.project.css` | `extraClass` |
| L1 token 值覆盖 | 项目品牌色 `--c-brand: #ff6b35` | `tokens.project.css` | ❌ |
| L3 组件新增 | `<af-qrcode>` | `components/project-af-*.js` | `extraComponents` |

```js
// .eslintrc.cjs 项目级配置示例
export default [
  ...af-mobileBaseConfig,
  {
    rules: {
      'af-mobile/token-whitelist': ['error', {
        extraClass: ['avatar-lg', 'search-with-icon', 'search-icon'],
        extraComponents: ['af-qrcode'],
        allowProjectTokens: true,
      }],
    },
  },
];
```

详细机制见 [docs/design/l4-detailed-design.md](docs/design/l4-detailed-design.md) §5。

## CI 保护链路

PR 触发 CI 检查链路（任一失败即阻断合并）：

| Step | 检查项 | 命令 |
|---|---|---|
| 1 | 白名单三源同步（CSS/JS ↔ whitelist.json ↔ Prompt 注入） | `npm run whitelist:check` |
| 1b | d.ts 与源码组件数同步（防类型声明漂移） | `npm run types:check` |
| 1c | Prompt 快照与运行时构建一致性（防 prompt 过期） | `npm run prompt:check` |
| 1d | ARIA 要求同步（JSON 声明 ↔ 规则检测分支） | `npm run aria:check` |
| 1e | Skill 文档代码块 API 漂移检查 | `npm run skill:check` |
| 1f | i18n key 注册与 zh-CN ↔ en-US 字典对齐 | `npm run i18n:check` |
| 2 | 体积预算（L1+L2 CSS ≤ 6.0KB / 全量 30 组件+基类 ≤ 23.0KB / 按需2组件 ≤ 6.5KB / 单组件 JS ≤ 2.8KB / 基类 ≤ 2.0KB / 核心运行时 ≤ 6.8KB） | `npm run size` |
| 3 | 单元测试（jsdom） | `npm test` |
| 3b | e2e 冒烟（Playwright：showModal/popover/scroll-snap/touch 等浏览器原生行为） | `npm run test:e2e` |
| 4 | ESLint 规则闸门（消费端 AI_RULES 21 条：14 error + 7 warn；分目录生效） | `npx eslint src/ test/ scripts/ eval/ mcp/ eslint-plugin-af-mobile/ adapters/ starter/src/ --max-warnings 0` |
| 5 | 发布前检查（build + Tree Shaking + sideEffects + types-sync + npm pack） | `npm run publish:check` |
| 6 | eval 集格式闸门（校验 prompts.jsonl 结构） | `npm run eval:dry` |

> **测试栈说明**：单元测试基于 jsdom，**不覆盖** `popover`/`showModal` 真实行为、`ResizeObserver`/`IntersectionObserver`、`scroll-snap`、真实 touch 事件、`prefers-reduced-motion` 等浏览器原生 API。这些由 **Playwright e2e**（`e2e/`，随 CI Step 3b 运行）覆盖：`showModal`/popover 弹层、scroll-snap 滚轮、下拉、滑动、触摸拖拽等。两者的分工是——jsdom 断言逻辑层（派发事件/属性同步），e2e 验证浏览器原生行为。关键交互线上线下均有闸门。

`.github/CODEOWNERS` 把关键文件分为 3 组 Owner：

- L1 Owner：`tokens.css`
- L3 Owner：`af-element.js`
- L4 Owner：`whitelist-v*.json` / `system-prompt.*` / `eslint-plugin-af-mobile/rules/**`

## 包生态（@af-mobile scope）

| 包 | 用途 | 安装/接入 |
|---|---|---|
| `@af-mobile/ui` | 主包：30 组件 + 路由/状态/主题/i18n + charts 图表子库（`/charts` 入口，5 图表组件）+ chat 对话子库（`/chat` 入口，SSE 会话核心）+ CLI | `npm i @af-mobile/ui` / `npm create af-mobile` |
| `create-af-mobile` | 脚手架薄壳（npm create 约定入口，转发主包 CLI） | `npm create af-mobile@latest my-app` |
| `@af-mobile/eslint-plugin` | 20 条 AI 约束规则（白名单/禁令/组件质量） | devDependency + flat config |
| `@af-mobile/mcp` | MCP Server：`get_prompt` / `check_compliance` / `fix_code` / `generate_page` / `flywheel_report` | `npx @af-mobile/mcp`（注册进 TRAE / Claude Code / Cursor） |
| `@af-mobile/prompt` | System Prompt 构建器（按需求裁剪白名单+组件 API+few-shot） | `import { buildPrompt } from '@af-mobile/prompt'` |
| `@af-mobile/adapters` | 后端 scheme 适配器：`supabase://table?...` → PostgREST（零 BaaS SDK） | `npm i @af-mobile/adapters`（peer 依赖主包） |

> MCP 五个工具的完整用法与数据飞轮机制见 [AGENTS.md §5](AGENTS.md)；CLI 与 skill 工作流见上文「快速开始」。

## 本地开发

```bash
# 安装依赖
npm install

# 跑测试
npm test

# 跑 CI 全流程（whitelist 同步 + 体积 + 测试）
npm run ci

# Lint 自检
npx eslint src/

# 体积检查
npm run size

# 发布前检查
npm run publish:check

# 重新生成 whitelist-v1.json
npm run whitelist

# 构建 System Prompt（注入白名单 + 项目扩展）
npm run prompt:build
```

## 设计文档

**架构与分层**

- [架构 RFC v3（总纲：AI 生成系统的完整方案）](docs/design/af-mobile-rfc-v3.md)
- [L1+L2 详细设计](docs/design/l1-l2-detailed-design.md)（Token / 配方原子 / 白名单）
- [L3 真组件详细设计](docs/design/l3-detailed-design.md)
- [L4 AI 约束层详细设计](docs/design/l4-detailed-design.md)（Prompt / ESLint / CI 三层约束）
- [DECISIONS.md](docs/DECISIONS.md) —— 砍/留/复活决策登记簿
- [Charts 图表子库详细设计](docs/design/charts-sublibrary-detailed-design.md)（SVG 原生图表 / 独立入口 / 体积预算）
- [Charts Demo 详细设计](docs/design/charts-demo-detailed-design.md)（5 组件 demo + 联动场景页 / `demo/index.html` 接入）

**运行时与迁移**

- [P0 生产刚需设计](docs/design/p0-production-essentials-design.md)（路由 / 状态 / 异步 / Prompt 4 要素）
- [v2.0 迁移指南](docs/migration-guide.md)（definePage → createPage / RouterError / scrollBehavior）

**AI 工程与生态**

- [数据飞轮 v2 设计](docs/design/flywheel-v2-design.md)（源无关反馈闭环：MCP 遥测 → 白名单/Prompt 迭代）
- [多包发布体系设计](docs/design/pkg-publish-mcp-prompt-design.md)（mcp / prompt 打包 + 资产快照闸门）

## License

MIT
