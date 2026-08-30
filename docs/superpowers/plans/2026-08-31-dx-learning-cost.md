# D-019 学习成本专项实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除外部用户（AI/人）接入 af-mobile 的学习摩擦：脚手架子路径部署修复 + chat 契约 JSDoc + mock LLM + 上手指南 + 最小完整应用 demo + 教程页。

**Architecture:** 五项独立交付物（spec：`docs/superpowers/specs/2026-08-31-dx-learning-cost-design.md`）。⑤ 是独立 bug fix 先行发版；①② 是 P0 低成本摩擦消除；③④ 是文档/示例工程。demo 应用全部走 L2 白名单 class + 相对路径引库，吃满现有门禁。

**Tech Stack:** 原生 Web Components（@af-mobile/ui）、Node 零依赖 http（mock server）、VitePress（文档）、Vitest（测试）。

---

## 执行环境注意（每个任务都适用）

1. **工作区已有大量无关暂存/未暂存改动**（D-017/D-018 实施）。所有 commit 必须用 pathspec 提交，只包含本任务文件：
   ```bash
   git add <本任务文件> ; git commit -m "<msg>" -- <本任务文件>
   ```
   绝不 `git add .` / `git add -A`。
2. 提交门禁（AGENTS.md §1）在每个任务的「验证」步骤按需跑，Task 11 跑全量。
3. 仓库根 `d:\projects\aiflow-ui`，PowerShell 环境。

---

### Task 1: 脚手架子路径部署适配修复（spec §⑤）

**Files:**
- Modify: `test/create-app.test.js`（首次 it 内追加断言）
- Modify: `scripts/create-app.mjs:79-81`（index.html 模板链接）、`:100-114`（manifest 模板 start_url）、`:116-121`（vite.config 模板加 base）、og:image 行（grep `icon-512.png` 定位 meta 行）
- Modify: `starter/vite.config.js`、`starter/public/manifest.webmanifest:5`、`starter/index.html:9-14`
- Modify: `starter/DEPLOY.md`（补子路径部署段）
- Create: `.changeset/scaffold-relative-base.md`

- [ ] **Step 1: 写失败测试**——在 `test/create-app.test.js` 第一个 it 内，`const html = ...` 断言块之后追加：

```js
    // 子路径部署适配：vite base + manifest start_url + 配件引用全部相对路径
    expect(vite).toContain("base: './'");
    const manifest = JSON.parse(readFileSync(join(dir, 'public/manifest.webmanifest'), 'utf8'));
    expect(manifest.start_url).toBe('./');
    expect(html).toContain('href="./manifest.webmanifest"');
    expect(html).toContain('href="./favicon.ico"');
    expect(html).toContain('href="./icon-192.png"');
    expect(html).toContain('content="./icon-512.png"');
    expect(html).not.toMatch(/(href|content)="\/(manifest|favicon|icon)/);
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run test/create-app.test.js`
Expected: FAIL（`base: './'` 不存在）

- [ ] **Step 3: 改 `scripts/create-app.mjs` 四处模板**

vite.config 模板（`'vite.config.js': ...` 字符串内 `export default defineConfig({` 后）加一行：

```js
  base: './',
```

manifest 模板：`"start_url": "/",` → `"start_url": "./",`

index.html 模板（原 79-81 行）：

```html
  <link rel="manifest" href="./manifest.webmanifest">
  <link rel="icon" href="./favicon.ico" sizes="any">
  <link rel="apple-touch-icon" href="./icon-192.png">
```

og:image meta：`content="/icon-512.png"` → `content="./icon-512.png"`（vite 不改 meta content，必须模板内手改）。

- [ ] **Step 4: 改 `starter/` 同三处**

`starter/vite.config.js` 完整新内容：

```js
// af-mobile Starter —— Vite 仅作打包器，零框架零插件（设计 §4.1）
import { defineConfig } from 'vite';

export default defineConfig({
  // 相对 base：hash 路由下文档 URL 不变，子路径部署（GitHub Pages /repo/、妙搭 /app/xxx/）JS/CSS/配件不 404
  base: './',
  // 本仓开发用 file: 链接依赖（adapters 的 peer 依赖经 realpath 解析会失败），保持符号链接路径解析
  resolve: { preserveSymlinks: true },
  build: { target: 'es2022' },
});
```

`starter/public/manifest.webmanifest`：`"start_url": "/",` → `"start_url": "./",`

`starter/index.html` 9-14 行：

```html
  <link rel="manifest" href="./manifest.webmanifest">
  <link rel="icon" href="./favicon.ico" sizes="any">
  <link rel="apple-touch-icon" href="./icon-192.png">
```

og:image：`content="/icon-512.png"` → `content="./icon-512.png"`。

- [ ] **Step 5: 跑测试确认通过**

Run: `npx vitest run test/create-app.test.js`
Expected: PASS

- [ ] **Step 6: DEPLOY.md 补段**（`starter/DEPLOY.md` 末尾追加）

```markdown
## 子路径部署

脚手架默认相对路径（vite `base: './'`、manifest `start_url: "./"`、index.html 配件 `./` 引用），
GitHub Pages `/repo/`、Vercel 子目录等子路径部署开箱即用，无需配置。
前提是 hash 路由（本脚手架默认）；若自行切换 history 路由需重新评估 base 策略。
```

- [ ] **Step 7: changeset**——新建 `.changeset/scaffold-relative-base.md`：

```md
---
'@af-mobile/ui': patch
---

脚手架子路径部署适配：vite base './' + manifest start_url './' + index.html 配件相对引用（外部实战反馈：子路径部署 PWA 配件全 404）
```

- [ ] **Step 8: 验证 + 提交**

Run: `npx vitest run test/create-app.test.js ; npm run scaffold:check`
Expected: 全 PASS（scaffold:check 若比对 starter 与模板一致性，两处已同步改应通过）

```bash
git add test/create-app.test.js scripts/create-app.mjs starter/vite.config.js starter/public/manifest.webmanifest starter/index.html starter/DEPLOY.md .changeset/scaffold-relative-base.md
git commit -m "fix(scaffold): 子路径部署适配——vite base './' + manifest start_url + 配件相对引用" -- test/create-app.test.js scripts/create-app.mjs starter/vite.config.js starter/public/manifest.webmanifest starter/index.html starter/DEPLOY.md .changeset/scaffold-relative-base.md
```

---

### Task 2: chat 子库 .d.ts 契约 JSDoc（spec §②）

**Files:**
- Modify: `src/chat/index.d.ts`
- Create: `.changeset/chat-types-contract-docs.md`

- [ ] **Step 1: 改 `src/chat/index.d.ts`**——三处注释（保留原类型不变，只加注释）：

`SessionOptions.requestFn` 行上方（L63 前）替换该行为带注释版本：

```ts
  /**
   * 自定义请求函数。契约：
   * - 入参 (url, init)：init 由 createSession 组装（POST + JSON body：messages（OpenAI 格式）/ stream:true / tools）
   * - 返回值必须是标准 Response（内部对 res.body 调 getReader() 逐帧解析 SSE）——
   *   注入 Authorization、换 baseURL、走代理都在这里做，工具循环已内置，无需分支处理 tool_calls
   * - 非 2xx 时 session.state 置 'error'，UI 渲染错误条 + retry()
   */
  requestFn?: (url: string, init: RequestInit) => Promise<Response>;
```

`export declare function createSession` 上方加：

```ts
/**
 * 创建会话实例。管线：send() push user 消息 → requestFn 请求 → 解析 OpenAI 格式 SSE
 * （delta.content / delta.tool_calls 按 index 聚合 / delta.reasoning_content → think 块）→
 * 内部块格式（ContentBlock）渲染 → 流末工具调用自动执行并以 tool 消息回传 → 下一轮（≤ maxToolRounds）。
 * 订阅 subscribe() 在每次内容变化时通知（流式逐 token 高频）。
 */
```

`export declare function parseSSE` 上方加：

```ts
/**
 * 解析标准 SSE Response 为帧流（{ event, data }）。data === '[DONE]' 的帧由调用方自行判停；
 * 纯传输层：不解析 OpenAI 结构，可独立用于任何 SSE 端点。
 */
```

`export type ContentBlock` 上方加：

```ts
/** 内部块格式。与 OpenAI 格式的映射：text ↔ delta.content 拼接；tool_call ↔ delta.tool_calls（args 发送时 JSON.stringify 回 function.arguments）；tool_result ↔ role:'tool' 消息（result JSON.stringify 进 content）；think ↔ delta.reasoning_content（不回传 API）；card 为库扩展（AI 在 text 中以 JSON 协议产出） */
```

- [ ] **Step 2: 验证类型**

Run: `npm run types:check`
Expected: PASS

- [ ] **Step 3: changeset**——新建 `.changeset/chat-types-contract-docs.md`：

```md
---
'@af-mobile/ui': patch
---

chat 子库 index.d.ts 补契约 JSDoc：requestFn（标准 Response + OpenAI SSE）、createSession 管线、parseSSE、ContentBlock 与 OpenAI 格式映射——悬停即可见，不必读 session.js 源码
```

- [ ] **Step 4: 提交**

```bash
git add src/chat/index.d.ts .changeset/chat-types-contract-docs.md
git commit -m "docs(chat): index.d.ts 补 requestFn/SSE 契约 JSDoc" -- src/chat/index.d.ts .changeset/chat-types-contract-docs.md
```

---

### Task 3: mock LLM server（spec §①）

**Files:**
- Create: `demo/apps/ai-todo/mock-llm.mjs`

- [ ] **Step 1: 写完整实现**（零依赖，SSE 格式严格对齐 `src/chat/session.js` 解析逻辑：`data: {json}\n\n` 帧 + `[DONE]` 判停；tool_calls 按 index 聚合、name/arguments 跨帧分片）：

```js
// mock-llm.mjs —— OpenAI 兼容本地 mock LLM：零依赖，SSE 流式 + 工具调用（跨帧分片）
// 用法：node mock-llm.mjs [--port 8787]
// demo 应用的 endpoint 指向 http://localhost:8787/v1/chat/completions；
// 接真实 LLM 时只需把 endpoint 换成 OpenAI 兼容地址 + requestFn 注入 Authorization（见 site 教程）。
import { createServer } from 'node:http';

const argv = process.argv.slice(2);
const port = Number(argv[argv.indexOf('--port') + 1]) || 8787;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// 把用户最后一句话映射成工具调用（本地规则模拟模型决策；真实 LLM 由模型自主决策）
function pickTool(tools, text) {
  const names = new Set(tools.map((t) => t.function.name));
  const add = text.match(/(?:添加|新建|加个?)[：:]?\s*(.+)/);
  if (add && names.has('add_todo')) {
    return { name: 'add_todo', args: { title: add[1].trim() } };
  }
  const done = text.match(/(?:完成|标为完成|搞定)[「「"']?(.+?)[」」"']?$/);
  if (done && names.has('complete_todo')) {
    return { name: 'complete_todo', args: { title: done[1].trim() } };
  }
  if (/(列出|有哪些|全部)/.test(text) && names.has('list_todos')) {
    return { name: 'list_todos', args: {} };
  }
  return null;
}

createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    let body = {};
    try { body = JSON.parse(raw || '{}'); } catch { /* 非法 JSON 按 {} 处理 */ }
    const last = body.messages?.at(-1);
    if (body.stream === false) {
      res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
      return res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: `收到：「${last?.content ?? ''}」` } }] }));
    }
    res.writeHead(200, { 'Content-Type': 'text/event-stream', ...CORS });
    const sse = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

    // 工具结果轮：回最终确认文本（真实 LLM 会基于 tool 结果组织语言）
    if (last?.role === 'tool') {
      let r = {};
      try { r = JSON.parse(last.content); } catch { /* 忽略 */ }
      sse({ choices: [{ delta: { content: `已完成「${r.title ?? '操作'}」${r.count != null ? `，当前共 ${r.count} 条待办` : ''}。还有其他要安排的吗？` } }] });
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const call = pickTool(body.tools ?? [], last?.content ?? '');
    if (call) {
      // name 整帧 + arguments 两帧分片：复现真实 SSE 的跨帧聚合解析路径（session.js pending Map）
      sse({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_mock_1', type: 'function', function: { name: call.name, arguments: '' } }] } }] });
      const a = JSON.stringify(call.args);
      sse({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: a.slice(0, 6) } }] } }] });
      sse({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: a.slice(6) } }] } }] });
    } else {
      sse({ choices: [{ delta: { content: `收到：「${last?.content ?? ''}」。我是本地 mock——把 endpoint 换成真实 OpenAI 兼容地址即可接入真模型。` } }] });
    }
    res.write('data: [DONE]\n\n');
    res.end();
  });
}).listen(port, () => {
  console.log(`mock LLM 就绪：http://localhost:${port}/v1/chat/completions`);
});
```

- [ ] **Step 2: 冒烟验证**

```bash
node demo/apps/ai-todo/mock-llm.mjs --port 8791
```
另开终端：
```bash
curl -X POST http://localhost:8791/v1/chat/completions -H "Content-Type: application/json" -d "{\"stream\":true,\"messages\":[{\"role\":\"user\",\"content\":\"添加：买牛奶\"}],\"tools\":[{\"type\":\"function\",\"function\":{\"name\":\"add_todo\",\"description\":\"新建待办\",\"parameters\":{\"type\":\"object\",\"properties\":{\"title\":{\"type\":\"string\"}}}}}]}"
```
Expected: 3 帧 tool_calls（name=add_todo，arguments 跨帧拼出 `{"title":"买牛奶"}`）+ `[DONE]`。验完停掉进程。

- [ ] **Step 3: 提交**

```bash
git add demo/apps/ai-todo/mock-llm.mjs
git commit -m "feat(demo): OpenAI 兼容 mock LLM（零依赖 SSE + 工具调用分片）" -- demo/apps/ai-todo/mock-llm.mjs
```

---

### Task 4: 上手指南 app-recipe（spec §③）

**Files:**
- Create: `site/guide/app-recipe.md`
- Modify: `site/.vitepress/config.mts:29-35`（guide 侧边栏）

- [ ] **Step 1: 写 `site/guide/app-recipe.md`**（完整内容）：

````markdown
# 应用配方

从零到一个可部署应用的**规则入口页**。理念见[架构理念](/guide/architecture)，本页只列「写代码时高频要查的规则」+ 链接，避免规则散落。

## 五步建应用

1. `npx @af-mobile/ui create my-app` 生成工程（Vite + vitest + ESLint + PWA 配件 + grill skill 齐备）
2. `src/main.js`：`register(...tags)` 按需注册页面用到的组件（**禁 registerAll**，丢 Tree Shaking）
3. `route(path, page)` 声明路由 + `start('#app', { hash: true })`
4. `src/pages/*.js` 用 `createPage` 写页面（HTML 模板 + 白名单 class + 组件事件）
5. `npm run dev` 起服务；`af-mobile deploy` 部署（子路径部署已默认适配）

## 注册规则

- 主库：`register('af-list', 'af-search-bar', ...)` 变参，懒加载需 await
- charts 子库：`import { registerChart } from '@af-mobile/ui/charts'`，**单标签逐个** `await registerChart('af-chart-bar')`
- chat 子库：`import { registerChat } from '@af-mobile/ui/chat'`，`registerChat()` 无参默认注册 `af-chat`
- 三者语义一致（变参），但**子库必须从子入口引**，主入口没有——这是最高频的坑（涉及聊天/图表需求必须用子库，禁止手写气泡流/CSS 图表）
- DEV 模式漏注册会在控制台告警（生产构建零成本）

## 路由规则

- hash 路由：`route('/detail/:id', page)` + `go(path)` + `start('#app', { hash: true })`
- 守卫：`beforeEach/afterEach`（登录重定向、tabbar 高亮联动见 [快速开始](/guide/quick-start)）
- hash 路由下文档 URL 不变 → 资源可全用相对路径，子路径部署零配置

## 样式规则（红线）

- 只用 **L2 白名单 class**（recipe + atomic，见 `eslint-plugin-af-mobile/utils/whitelist-v1.json`）；白名单外 class 会被 ESLint 拦截
- token 变量（`--c-*` / `--s-*` / `--r-*`）禁重定义；禁内联 style；禁 Tailwind 语法
- 自定义样式写 `src/styles.css`（main.js 已引入，漏引 = 死文件）

## 子库

| 子库 | 引入 | 能力 |
|---|---|---|
| chat | `@af-mobile/ui/chat` | af-chat 组件 + createSession/defineTool 工具循环 + sessions 多会话 |
| charts | `@af-mobile/ui/charts` | af-chart-line/bar/pie/radar/funnel 五态图表内核 |

## 测试

- 环境桩：`test/setup.js` 里 `import '@af-mobile/ui/test'`（matchMedia/popover/IntersectionObserver 等一键注入）
- 用例间清理：localStorage/DOM 复位写在项目自己的 setup（预设不带 beforeEach 钩子）

## 部署

- 脚手架默认相对路径（vite `base: './'` + manifest `start_url: "./"`），GitHub Pages / Vercel 子目录 / 妙搭等子路径部署开箱即用
- 完整链路见 starter `DEPLOY.md`；最小完整应用源码见仓库 `demo/apps/ai-todo/`（教程：[从零到跑通](/guide/tutorial-todo-app)）
````

- [ ] **Step 2: config.mts 注册侧边栏**——guide items 数组（`{ text: '快速开始', ... }` 至 `{ text: 'AI 协作', ... }`）追加两项（教程项此时先不加，Task 10 页面存在后再加）：

```ts
            { text: '应用配方', link: '/guide/app-recipe' },
```

- [ ] **Step 3: 验证 + 提交**

Run: `npm run docs:build`
Expected: PASS（无死链）

```bash
git add site/guide/app-recipe.md site/.vitepress/config.mts
git commit -m "docs(site): 应用配方单页——注册/路由/样式/子库/测试/部署规则入口汇总" -- site/guide/app-recipe.md site/.vitepress/config.mts
```

---

### Task 5: demo 应用骨架（index.html + app.js + store.js）（spec §④-B）

**Files:**
- Create: `demo/apps/ai-todo/index.html`
- Create: `demo/apps/ai-todo/app.js`
- Create: `demo/apps/ai-todo/store.js`

- [ ] **Step 1: `demo/apps/ai-todo/index.html`**：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>AI 待办 · af-mobile 最小完整应用</title>
  <link rel="stylesheet" href="../../src/index.css">
  <!-- 豁免：app-shell 兜底——.page 底部留出固定 tabbar 高度 + 安全区，框架未提供该变体（kitchen-sink 同款） -->
  <style>
    .page { padding-bottom: calc(var(--s-4) + var(--tabbar-h) + env(safe-area-inset-bottom)); }
  </style>
  <!-- 主题防闪：先于组件挂载恢复 localStorage 主题 -->
  <script>try{var saved=localStorage.getItem('theme');if(saved==='light'||saved==='dark')document.documentElement.dataset.theme=saved}catch(e){}</script>
</head>
<body>
  <!-- app-shell：#app 为路由 outlet，af-tabbar 常驻 outlet 外（路由切换不销毁） -->
  <div id="app"></div>
  <af-tabbar id="tabbar" aria-label="主导航"></af-tabbar>
  <script type="module" src="./app.js"></script>
</body>
</html>
```

- [ ] **Step 2: `demo/apps/ai-todo/store.js`**：

```js
// store.js —— localStorage 待办仓库：最小 CRUD + 订阅。AI 工具（chat 页 defineTool）直接操作这份数据
const KEY = 'ai-todo.todos';
const subs = new Set();

function seed() {
  return [
    { id: crypto.randomUUID(), title: '体验：点 AI 助手让 AI 帮你加待办', due: '', done: false },
    { id: crypto.randomUUID(), title: '体验：右滑删除这条', due: '', done: false },
  ];
}
let todos;
try { todos = JSON.parse(localStorage.getItem(KEY)) ?? seed(); } catch { todos = seed(); }

const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(todos)); } catch { /* 隐私模式忽略 */ } };
const notify = () => subs.forEach((fn) => fn(todos));

export const store = {
  todos,
  add(title, due = '') {
    todos.unshift({ id: crypto.randomUUID(), title, due, done: false });
    persist(); notify();
  },
  toggle(id) {
    const t = todos.find((x) => x.id === id);
    if (t) { t.done = !t.done; persist(); notify(); }
  },
  remove(id) {
    const i = todos.findIndex((x) => x.id === id);
    if (i >= 0) { todos.splice(i, 1); persist(); notify(); }
  },
  completeByTitle(title) {
    const t = todos.find((x) => !x.done && x.title.includes(title));
    if (t) { t.done = true; persist(); notify(); }
    return t ?? null;
  },
  subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
};
```

- [ ] **Step 3: `demo/apps/ai-todo/app.js`**：

```js
// AI 待办 · 最小完整应用（三页：列表 / AI 助手 / 统计）——官方教科书画像
// 三页各覆盖一个能力域：主库 CRUD / chat 子库工具闭环 / charts 子库
import { register, route, start, afterEach, go, initLocale } from '../../src/index.js';
import { registerChat } from '../../src/chat/index.js';
import { registerChart } from '../../src/charts/index.js';
import listPage from './pages/list.js';
import chatPage from './pages/chat.js';
import statsPage from './pages/stats.js';

// 按需注册：主库组件 / chat 子库 / charts 子库（子库必须走子入口，禁主入口 register）
await register('af-tabbar', 'af-swipe-cell', 'af-dialog', 'af-toast');
registerChat();
await registerChart('af-chart-bar');
initLocale();

route('/', listPage);
route('/chat', chatPage);
route('/stats', statsPage);
start('#app', { hash: true });

// tabbar：点击 → 导航；路由 → 高亮（单一真相源，kitchen-sink 同款）
const tabbar = document.getElementById('tabbar');
tabbar.tabs = [
  { label: '待办', value: '/' },
  { label: 'AI 助手', value: '/chat' },
  { label: '统计', value: '/stats' },
];
tabbar.addEventListener('af-tabbar:change', (e) => go(tabbar.tabs[e.detail.index].value));
afterEach((r, p, path) => {
  const idx = tabbar.tabs.findIndex((t) => t.value === path);
  if (idx >= 0) tabbar.activeIndex = idx;
});
```

注意：`pages/` 三个文件 Task 6-8 才建，本任务暂不跑 vite（import 会 404），Task 8 完成后统一冒烟。

- [ ] **Step 4: 提交**

```bash
git add demo/apps/ai-todo/index.html demo/apps/ai-todo/app.js demo/apps/ai-todo/store.js
git commit -m "feat(demo): ai-todo 应用骨架——三页路由 + tabbar 联动 + localStorage 仓库" -- demo/apps/ai-todo/index.html demo/apps/ai-todo/app.js demo/apps/ai-todo/store.js
```

---

### Task 6: 列表页（主库 CRUD）（spec §④-B）

**Files:**
- Create: `demo/apps/ai-todo/pages/list.js`

- [ ] **Step 1: 完整实现**（全部白名单 class；swipe-cell 删除 + dialog 确认 + toast 反馈；abort 时退订）：

```js
// 列表页 —— 主库 CRUD 范式：createPage 同构（outlet 模板 + 事件 + ctx.signal 级联清理）
// 组件：af-swipe-cell（滑动删除）/ af-dialog（确认）/ af-toast（反馈）；全部白名单 class
import { escapeHtml as esc } from '../../src/index.js';
import { store } from '../store.js';

export default function listPage(params, ctx) {
  ctx.outlet.innerHTML = `
    <main class="page">
      <section class="hero">
        <p class="eyebrow">af-mobile 最小完整应用</p>
        <h1 class="display">待办</h1>
        <p class="subtitle">主库 CRUD · AI 助手通过工具直接操作这份数据</p>
      </section>
      <div class="form-row">
        <input class="input" id="new-title" placeholder="新待办标题" aria-label="新待办标题">
        <button class="btn" id="add-btn">添加</button>
      </div>
      <div class="list" id="rows" role="list"></div>
      <af-dialog id="confirm-del" title="删除待办">
        <div slot="body"><p class="body" id="del-title"></p></div>
        <div slot="footer">
          <button class="btn btn-ghost btn-block" data-act="cancel">取消</button>
          <button class="btn btn-danger btn-block" data-act="confirm">删除</button>
        </div>
      </af-dialog>
      <af-toast id="toast" aria-live="polite"></af-toast>
    </main>`;

  const rows = ctx.outlet.querySelector('#rows');
  const toast = ctx.outlet.querySelector('#toast');
  const dialog = ctx.outlet.querySelector('#confirm-del');
  let pendingDel = null;

  const rowHTML = (t) => `
    <af-swipe-cell role="listitem">
      <div slot="content" class="list-item fc">
        <input type="checkbox" class="checkbox" data-toggle="${t.id}" ${t.done ? 'checked' : ''} aria-label="切换完成状态">
        <span class="body flex-1 ${t.done ? 'text-muted' : ''}">${esc(t.title)}</span>
        ${t.due ? `<span class="caption text-muted">${esc(t.due)}</span>` : ''}
      </div>
      <div slot="right"><button class="btn btn-danger" data-del="${t.id}">删除</button></div>
    </af-swipe-cell>`;

  function render() {
    rows.innerHTML = store.todos.length
      ? store.todos.map(rowHTML).join('')
      : '<div class="empty"><p class="body">暂无待办，加一条或让 AI 帮你安排</p></div>';
    rows.querySelectorAll('af-swipe-cell').forEach((cell) => {
      cell.addEventListener('af-swipe-cell:action', () => {
        pendingDel = cell.querySelector('[data-del]').dataset.del;
        ctx.outlet.querySelector('#del-title').textContent =
          `确定删除「${store.todos.find((t) => t.id === pendingDel)?.title ?? ''}」吗？`;
        dialog.open();
      });
    });
  }

  ctx.outlet.querySelector('#add-btn').addEventListener('click', () => {
    const input = ctx.outlet.querySelector('#new-title');
    const title = input.value.trim();
    if (!title) return toast.show('先写点内容', { type: 'warning' });
    store.add(title);
    input.value = '';
    toast.show('已添加', { type: 'success' });
  });
  ctx.outlet.querySelector('#new-title').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') ctx.outlet.querySelector('#add-btn').click();
  });
  rows.addEventListener('change', (e) => {
    const id = e.target.closest('[data-toggle]')?.dataset.toggle;
    if (id) store.toggle(id);
  });
  dialog.querySelector('[data-act="confirm"]').addEventListener('click', () => dialog.close('confirm'));
  dialog.addEventListener('af-dialog:close', (e) => {
    if (e.detail.action === 'confirm' && pendingDel) {
      store.remove(pendingDel);
      toast.show('已删除', { type: 'success' });
    }
    pendingDel = null;
  });

  render();
  const unsub = store.subscribe(render);
  ctx.signal.addEventListener('abort', unsub);
}
```

- [ ] **Step 2: 提交**

```bash
git add demo/apps/ai-todo/pages/list.js
git commit -m "feat(demo): ai-todo 列表页——主库 CRUD 范式（swipe-cell/dialog/toast）" -- demo/apps/ai-todo/pages/list.js
```

---

### Task 7: AI 助手页（chat 子库完整闭环）（spec §④-B）

**Files:**
- Create: `demo/apps/ai-todo/pages/chat.js`

- [ ] **Step 1: 完整实现**（createSessions 多会话 + defineTool 工具直接操作 store + 原生 popover 会话列表——D-014 全用法，豆包 app 未做的差异化示范）：

```js
// AI 助手页 —— chat 子库完整闭环：af-chat + defineTool（AI 直接操作待办）+ sessions.js 多会话
// 先起 mock LLM：node mock-llm.mjs；接真实 LLM 见 site 教程「换真实 LLM」一节
import { createSessions, bindSessions, defineTool } from '../../src/chat/index.js';
import { store } from '../store.js';

const ENDPOINT = 'http://localhost:8787/v1/chat/completions';

const tools = [
  defineTool({
    name: 'add_todo',
    label: '新建待办',
    description: '新建一条待办',
    parameters: {
      type: 'object',
      properties: { title: { type: 'string', description: '待办标题' }, due: { type: 'string', description: '截止日期 YYYY-MM-DD，可选' } },
      required: ['title'],
    },
    execute: (args) => { store.add(String(args.title), args.due ? String(args.due) : ''); return { ok: true, title: args.title }; },
  }),
  defineTool({
    name: 'complete_todo',
    label: '完成待办',
    description: '按标题把一条未完成待办标记为完成',
    parameters: {
      type: 'object',
      properties: { title: { type: 'string', description: '待办标题（或关键词）' } },
      required: ['title'],
    },
    execute: (args) => {
      const t = store.completeByTitle(String(args.title));
      return t ? { ok: true, title: t.title } : { ok: false, error: '未找到匹配的未完成待办' };
    },
  }),
  defineTool({
    name: 'list_todos',
    label: '列出待办',
    description: '列出全部待办及完成状态',
    parameters: { type: 'object', properties: {} },
    execute: () => ({ count: store.todos.length, todos: store.todos.map((t) => ({ title: t.title, done: t.done })) }),
  }),
];

export default function chatPage(params, ctx) {
  ctx.outlet.innerHTML = `
    <main class="page page-col">
      <div class="fc jcsb">
        <h1 class="t-xl">AI 助手</h1>
        <button class="btn btn-ghost btn-sm" popovertarget="sessions" aria-label="会话列表">会话</button>
      </div>
      <div popover="auto" id="sessions" class="list p-2" aria-label="会话列表"></div>
      <af-chat class="flex-1" placeholder="跟 AI 说，帮你管理待办" aria-label="AI 对话"></af-chat>
    </main>`;

  const sessionStore = createSessions({
    endpoint: ENDPOINT,
    tools,
    storage: 'ai-todo.chat',
    systemPrompt: () => `你是待办应用的 AI 助手。今天 ${new Date().toISOString().slice(0, 10)}。用户让你管理待办时调用提供的工具，完成后简短确认。`,
  });
  if (!sessionStore.records.length) sessionStore.create();   // 首次进入建一个会话（否则 active 为 null，输入走受控模式不发请求）

  // 渲染会话列表 + 事件委托 + 自动把 active session 换绑到 af-chat（含初次）
  bindSessions(ctx.outlet.querySelector('#sessions'), sessionStore, ctx.outlet.querySelector('af-chat'));
}
```

- [ ] **Step 2: 提交**

```bash
git add demo/apps/ai-todo/pages/chat.js
git commit -m "feat(demo): ai-todo AI 助手页——defineTool 工具闭环 + 多会话完整示范" -- demo/apps/ai-todo/pages/chat.js
```

---

### Task 8: 统计页（charts 子库）（spec §④-B）

**Files:**
- Create: `demo/apps/ai-todo/pages/stats.js`

- [ ] **Step 1: 完整实现**：

```js
// 统计页 —— charts 子库范式：registerChart 注册（子入口）+ labels/series 响应 store 变化
import { store } from '../store.js';

export default function statsPage(params, ctx) {
  ctx.outlet.innerHTML = `
    <main class="page">
      <section class="hero">
        <p class="eyebrow">charts 子库</p>
        <h1 class="display">统计</h1>
        <p class="subtitle">af-chart-bar · 数据实时跟随待办变化</p>
      </section>
      <div class="card p-3">
        <p class="section-tt">完成情况</p>
        <af-chart-bar id="chart" legend></af-chart-bar>
      </div>
      <div class="stats-grid" id="grid" role="list" aria-label="统计数字"></div>
    </main>`;

  const chart = ctx.outlet.querySelector('#chart');
  const grid = ctx.outlet.querySelector('#grid');

  function render() {
    const done = store.todos.filter((t) => t.done).length;
    const open = store.todos.length - done;
    chart.labels = ['已完成', '未完成'];
    chart.series = [{ name: '数量', values: [done, open] }];
    grid.innerHTML = `
      <div class="card" role="listitem"><p class="stat-num">${store.todos.length}</p><p class="caption text-muted">全部</p></div>
      <div class="card" role="listitem"><p class="stat-num">${done}</p><p class="caption text-muted">已完成</p></div>
      <div class="card" role="listitem"><p class="stat-num">${open}</p><p class="caption text-muted">未完成</p></div>`;
  }

  render();
  const unsub = store.subscribe(render);
  ctx.signal.addEventListener('abort', unsub);
}
```

- [ ] **Step 2: 提交**

```bash
git add demo/apps/ai-todo/pages/stats.js
git commit -m "feat(demo): ai-todo 统计页——af-chart-bar 子库范式" -- demo/apps/ai-todo/pages/stats.js
```

---

### Task 9: demo 门禁接入 + 全链路冒烟（spec §④-B 验收）

**Files:**
- Modify: `scripts/check-demo.mjs:87-92`（walkDir 区追加 demo/apps 扫描）

- [ ] **Step 1: check-demo.mjs 扩展**——`walkDir(join(DEMO, 'scenarios'), ...)` 行后追加：

```js
walkDir(join(DEMO, 'apps'), 'demo/apps', { whitelist: true, antiflash: true });
```

（apps 是最小完整应用教学素材，与 components 同级严格度：白名单 + 主题防闪。）

- [ ] **Step 2: 跑 demo:check 修到全绿**

Run: `npm run demo:check`
Expected: PASS。若报白名单外 class / 缺防闪 / 内联 style，逐条改 demo/apps 文件（禁改检查脚本放行）。

- [ ] **Step 3: ESLint**

Run: `npx eslint demo/apps/ --max-warnings 0`
Expected: 0 warning 0 error

- [ ] **Step 4: 浏览器全链路冒烟**

```bash
node demo/apps/ai-todo/mock-llm.mjs & npm run demo
```
浏览器开 `http://localhost:5173/demo/apps/ai-todo/`（vite 端口以实际输出为准），逐项验证：
1. 三页渲染 + tabbar 点按/高亮联动
2. 列表页：添加 / 勾选完成 / 右滑删除（dialog 确认 + toast）
3. AI 页：输入「添加：买牛奶」→ 工具芯片「新建待办」→ 确认文本；「统计」页数字变化
4. 会话 popover：新建/切换/删除会话，localStorage 刷新恢复
5. 控制台无错误

- [ ] **Step 5: 提交**

```bash
git add scripts/check-demo.mjs
git commit -m "chore(demo): demo:check 纳入 demo/apps 严格扫描（白名单 + 防闪）" -- scripts/check-demo.mjs
```

---

### Task 10: 教程页 tutorial-todo-app（spec §④-C）

**Files:**
- Create: `site/guide/tutorial-todo-app.md`
- Modify: `site/.vitepress/config.mts`（guide items 追加教程项）

- [ ] **Step 1: 写 `site/guide/tutorial-todo-app.md`**——叙事全文如下，其中每个「**嵌入 X 全文**」代码块逐字粘贴对应 demo 文件当前内容（标注「以仓库文件为准」）：

````markdown
# 从零到跑通：AI 待办应用

本教程逐步拆解官方最小完整应用 `demo/apps/ai-todo/`（三页：待办列表 / AI 助手 / 统计）。
每个代码块与仓库文件一一对应——**以仓库文件为准**（它们持续吃 ESLint/白名单/ARIA 门禁，本页不会漂移成孤儿代码）。
跑通全程不需要任何 API Key。

## 0. 准备

```bash
npx @af-mobile/ui create my-todo   # 或直接读仓库 demo/apps/ai-todo/
cd my-todo && npm install
```

## 1. 应用骨架：注册 + 路由 + tabbar

（嵌入 `demo/apps/ai-todo/index.html` 全文）
（嵌入 `demo/apps/ai-todo/app.js` 全文）

要点：主库 `register` / chat 子库 `registerChat` / charts 子库 `registerChart` 三条注册路径各司其职。

## 2. 数据层：localStorage 仓库

（嵌入 `demo/apps/ai-todo/store.js` 全文）

## 3. 待办列表页（主库 CRUD）

（嵌入 `demo/apps/ai-todo/pages/list.js` 全文）

## 4. AI 助手页（chat 子库工具闭环 + 多会话）

（嵌入 `demo/apps/ai-todo/pages/chat.js` 全文）
（嵌入 `demo/apps/ai-todo/mock-llm.mjs` 全文，注明「node mock-llm.mjs 启动」）

要点：`defineTool` 的 execute 直接操作第 2 节的 store——AI 与 UI 操作同一份数据，这是「嵌入式能干活的 AI」的核心。

## 5. 统计页（charts 子库）

（嵌入 `demo/apps/ai-todo/pages/stats.js` 全文）

## 6. 换真实 LLM

mock 跑通后，把 endpoint 换成任意 OpenAI 兼容地址（豆包 Seed / DeepSeek / OpenAI 等），
在 `createSession` 的 `requestFn` 里注入鉴权（密钥只在你的服务端/本地，禁止硬编码进提交）：

```js
import { createSession } from '@af-mobile/ui/chat';
const session = createSession({
  endpoint: 'https://你的代理/v1/chat/completions',
  requestFn: (url, init) => fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${process.env.MY_API_KEY}` },
  }),
});
```

`requestFn` 完整契约见 [af-chat 文档](/components/af-chat)「接真实 LLM」节。
安全提示：`requestFn` 可拿到完整请求体，密钥注入点唯一且可控；不要把密钥写进 systemPrompt 或工具参数。

## 7. 部署

`af-mobile deploy`（脚手架已默认子路径适配）；完整链路见 starter `DEPLOY.md`。
````

- [ ] **Step 2: config.mts**——Task 4 的侧边栏项后追加：

```ts
            { text: '实战教程', link: '/guide/tutorial-todo-app' },
```

- [ ] **Step 3: 验证 + 提交**

Run: `npm run docs:build`
Expected: PASS（无死链；教程内链 `/components/af-chat`、`/guide/app-recipe` 均存在）

```bash
git add site/guide/tutorial-todo-app.md site/.vitepress/config.mts
git commit -m "docs(site): 从零到跑通实战教程——与 demo/apps/ai-todo 文件一一对应" -- site/guide/tutorial-todo-app.md site/.vitepress/config.mts
```

---

### Task 11: D-019 登记 + 全量门禁

**Files:**
- Modify: `docs/DECISIONS.md`（表 + 条目，追加到末尾）

- [ ] **Step 1: DECISIONS.md 索引表追加一行**：

```md
| D-019 | 2026-08-31 | 已决 | 外部实战反馈第二轮：学习成本专项（mock LLM + 契约 JSDoc + 上手指南 + 最小完整应用 + 脚手架子路径修复） |
```

- [ ] **Step 2: 末尾追加条目**：

```markdown
## D-019 学习成本专项：外部实战反馈第二轮（2026-08-31，已决）

背景：豆包（`@af-mobile/ui@1.8.0`）反馈接入最耗时在 chat 子库（requestFn 契约隐蔽、只能读源码、缺最小完整应用、理念与 API 文档割裂），并交付了一个高质量 AI 待办应用（浏览器实测四页 + 源码审计）。与第一轮（D-017/D-018，API 缺陷）不同，本轮全是学习成本问题——修法是文档/示例工程，不动框架内核。实测归因出脚手架子路径部署 bug（vite base/manifest start_url/配件引用全绝对路径 → 子路径部署必 404），对方已自行修复并交叉确认根因。设计详见 docs/superpowers/specs/2026-08-31-dx-learning-cost-design.md。

- **决策**（五项）：① `demo/apps/ai-todo/mock-llm.mjs` OpenAI 兼容零依赖 mock（P0）② chat index.d.ts 契约 JSDoc（P0）③ site/guide/app-recipe.md 单页规则入口（P1）④ demo/apps/ai-todo 三页最小完整应用 + tutorial 教程页（P2，B+C 形态）⑤ 脚手架子路径适配修复：vite `base:'./'` + manifest `start_url:'./'` + 配件相对引用（P0 bug fix，回链 D-009）
- **理由**：豆包自认严格验证的慢是质量保证——目标是消除纯摩擦（来回试/读源码/规则散落），不是降低验证标准；demo 是 AI 学习素材（D-011 同构），门禁管住不漂移
- **放弃了什么**：环境摩擦项不立项（非框架职责）；mock server 不进 npm 包（浏览器库不背 Node 脚本）；脚手架 `--template chat` 模板变体（分叉成本，等真实需求触发）；.d.ts 生成式改造（手工 JSDoc 已满足）
```

- [ ] **Step 3: 全量门禁**

```bash
npx eslint src/ test/ scripts/ e2e/ prompt/ eval/ mcp/ eslint-plugin-af-mobile/ adapters/ starter/src/ demo/ --max-warnings 0
npx vitest run
npm run size && npm run whitelist:check && npm run types:check && npm run aria:check
npm run prompt:check
npm run demo:check
npm run scaffold:check
npm run docs:build
```
Expected: 全绿。`prompt:check` 若因 prompt 快照变化失败：核对变化是否来自本任务改动（本计划不改 prompt/，若失败须排查是否误改）。

- [ ] **Step 4: 提交**

```bash
git add docs/DECISIONS.md
git commit -m "docs(decisions): D-019 学习成本专项登记（外部反馈第二轮五项）" -- docs/DECISIONS.md
```

- [ ] **Step 5: 汇报**——向用户汇报门禁结果 + 提醒：本地 main 与 origin 分叉（spec 提交在先），推送前需 `git pull --rebase`（由用户决定时机）。

---

## Self-Review 记录

1. **Spec 覆盖**：⑤→Task 1、②→Task 2、①→Task 3、③→Task 4、④-B→Task 5-9、④-C→Task 10、登记→Task 11；spec §五验证闸门 → Task 9/11 分摊。无缺口。
2. **占位符扫描**：Task 10 教程页的「嵌入 X 全文」是对 Task 3/5-8 已定义文件的逐字引用（教程页明确「以仓库文件为准」），非未定义引用。
3. **类型一致性**：`store.add(title, due)` / `store.completeByTitle(title)` / `store.subscribe` 在 Task 5 定义、Task 6/7/8 使用一致；`bindSessions(el, store, target)` 三参签名与 `src/chat/sessions.js:67` 一致；`registerChart('af-chart-bar')` await 与 scenarios fewshot 一致；`afterEach((r, p, path))` 与 kitchen-sink.html:276 一致。
