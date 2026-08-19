// 沙盒场景：AI 对话（af-chat 组件 + createSession mock 后端）
// 说明：af-chat 双模式中的「绑定 session」模式——组件接线一行（chatEl.session = session），
// 气泡流/composer/工具芯片/流式光标全部由组件渲染，事件 af-chat:* 直接冒泡到事件面板。
import { registerChat, createSession, defineTool } from '../../src/chat/index.js';

registerChat();

// 合成一个 SSE 流 Response（无需真实后端）
const enc = new TextEncoder();
function mockStream(frames) {
  let i = 0;
  return new Response(new ReadableStream({
    start(c) {
      const tick = () => (i < frames.length ? (c.enqueue(enc.encode(frames[i++])), setTimeout(tick, 30)) : c.close());
      tick();
    },
  }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}
const sse = (d) => `data: ${JSON.stringify(d)}\n\n`;
const deltas = (t, n = 4) => Array.from({ length: Math.ceil(t.length / n) }, (_, i) =>
  sse({ choices: [{ delta: { content: t.slice(i * n, i * n + n) } }] })).concat('data: [DONE]\n\n');

// 模拟后端：按对话状态返回不同帧（function-calling 两轮循环 / 可注入故障）
function makeRequestFn(opts) {
  return async (_url, init) => {
    const body = JSON.parse(init.body || '{}');
    const msgs = body.messages || [];
    const last = msgs[msgs.length - 1];
    if (opts.failOn?.(last)) return new Response('', { status: 500 });
    if (opts.useTool && last?.role === 'user') {
      return mockStream([
        sse({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', function: { name: 'get_weather', arguments: '{"city":"上海"}' } }] } }] }),
        'data: [DONE]\n\n',
      ]);
    }
    if (last?.role === 'tool') {
      return mockStream(deltas('已为你查询：上海今日晴，25℃，东南风 3 级，适合出行。'));
    }
    return mockStream(deltas(`（模拟流式回复）你说了：「${last?.content ?? ''}」。逐字渲染，流式中发送键变「停止」，点击即中止。`));
  };
}

// 场景容器：playground 沙盒允许内联 style 作容器布局；af-chat 本体样式全在 shadow + 白名单内
const CHAT_HTML = `<div style="display:flex;flex-direction:column;height:440px"><af-chat id="chat" style="flex:1"></af-chat></div>`;

function wireScenario(opts) {
  return function init() {
    const chatEl = document.getElementById('chat');
    const session = createSession({
      endpoint: '/mock',
      requestFn: makeRequestFn(opts),
      systemPrompt: '你是 af-mobile 对话演示助手。',
      tools: opts.useTool
        ? [defineTool({
            name: 'get_weather',
            description: '查询城市天气',
            parameters: { type: 'object', properties: { city: { type: 'string' } } },
            execute: async (args) => ({ city: args.city, weather: '晴', temp: 25 }),
          })]
        : [],
    });
    chatEl.session = session;
    session.append({ role: 'assistant', content: [{ type: 'text', text: opts.greeting }] });
  };
}

export default {
  tag: 'chat',
  name: 'AI 对话（af-chat）',
  scenarios: [
    {
      name: '流式对话',
      html: CHAT_HTML,
      main: { selector: '#chat' },
      props: [],
      events: ['af-chat:send'],
      styleTokens: [
        { token: '--c-brand', label: '主色（用户气泡）', type: 'color' },
        { token: '--c-border', label: '边框', type: 'color' },
      ],
      init: wireScenario({
        greeting: '你好，我是 af-chat。发送消息即可看到流式逐字渲染 + 光标动画；Enter 发送，Shift+Enter 换行。',
        useTool: false,
      }),
    },
    {
      name: '工具调用',
      html: CHAT_HTML,
      main: { selector: '#chat' },
      props: [],
      events: ['af-chat:send', 'af-chat:abort'],
      styleTokens: [
        { token: '--c-brand', label: '主色（用户气泡）', type: 'color' },
        { token: '--c-border', label: '边框', type: 'color' },
      ],
      init: wireScenario({
        greeting: '试试说「上海天气怎么样」——我会先发起 get_weather 工具调用（气泡上方出现芯片），再基于结果作答。',
        useTool: true,
      }),
    },
    {
      name: '中止 / 错误',
      html: CHAT_HTML,
      main: { selector: '#chat' },
      props: [],
      events: ['af-chat:send', 'af-chat:abort', 'af-chat:error'],
      styleTokens: [
        { token: '--c-brand', label: '主色（用户气泡）', type: 'color' },
        { token: '--c-danger', label: '错误色（错误条）', type: 'color' },
      ],
      init: wireScenario({
        greeting: '流式输出途中点「停止」可中止；发送任意包含「错误」二字的消息，下次请求返回 500，演示错误条 + 重试。',
        useTool: false,
        failOn: (last) => typeof last?.content === 'string' && last.content.includes('错误'),
      }),
    },
  ],
};
