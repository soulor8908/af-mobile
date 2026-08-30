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

来源：`demo/apps/ai-todo/index.html`（以仓库文件为准）

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>AI 待办 · af-mobile 最小完整应用</title>
  <link rel="stylesheet" href="../../../src/index.css">
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

来源：`demo/apps/ai-todo/app.js`（以仓库文件为准）

```js
// AI 待办 · 最小完整应用（三页：列表 / AI 助手 / 统计）——官方教科书画像
// 三页各覆盖一个能力域：主库 CRUD / chat 子库工具闭环 / charts 子库
import { register, route, start, afterEach, go, initLocale } from '../../../src/index.js';
import { registerChat } from '../../../src/chat/index.js';
import { registerChart } from '../../../src/charts/index.js';
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

要点：主库 `register` / chat 子库 `registerChat` / charts 子库 `registerChart` 三条注册路径各司其职。

## 2. 数据层：localStorage 仓库

来源：`demo/apps/ai-todo/store.js`（以仓库文件为准）

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

## 3. 待办列表页（主库 CRUD）

来源：`demo/apps/ai-todo/pages/list.js`（以仓库文件为准）

```js
// 列表页 —— 主库 CRUD 范式：createPage 同构（outlet 模板 + 事件 + ctx.signal 级联清理）
// 组件：af-swipe-cell（滑动删除）/ af-dialog（确认）/ af-toast（反馈）；全部白名单 class
import { escapeHtml as esc } from '../../../../src/index.js';
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

## 4. AI 助手页（chat 子库工具闭环 + 多会话）

来源：`demo/apps/ai-todo/pages/chat.js`（以仓库文件为准）

```js
// AI 助手页 —— chat 子库完整闭环：af-chat + defineTool（AI 直接操作待办）+ sessions.js 多会话
// 先起 mock LLM：node mock-llm.mjs；接真实 LLM 见 site 教程「换真实 LLM」一节
import { createSessions, bindSessions, defineTool } from '../../../../src/chat/index.js';
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

来源：`demo/apps/ai-todo/mock-llm.mjs`（以仓库文件为准；`node mock-llm.mjs` 启动）

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

要点：`defineTool` 的 execute 直接操作第 2 节的 store——AI 与 UI 操作同一份数据，这是「嵌入式能干活的 AI」的核心。

## 5. 统计页（charts 子库）

来源：`demo/apps/ai-todo/pages/stats.js`（以仓库文件为准）

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
