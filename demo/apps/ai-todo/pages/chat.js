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
