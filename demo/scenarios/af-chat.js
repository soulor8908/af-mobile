// 沙盒场景：AI 对话核心（src/chat）
// 说明：chat 子库是「框架无关的会话核心」（createSession / createMessage / parseSSE / defineTool），
// 本身没有 Web 组件。这里在 Playground 手机壳内用纯 HTML + mock SSE 演示其完整能力。
import { createSession, createMessage, defineTool } from '../../src/chat/index.js';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// 合成一个 SSE 流 Response（无需真实后端）
function mockStream(frames) {
  const enc = new TextEncoder();
  let i = 0;
  const stream = new ReadableStream({
    start(controller) {
      const tick = () => {
        if (i < frames.length) { controller.enqueue(enc.encode(frames[i++])); setTimeout(tick, 35); }
        else controller.close();
      };
      tick();
    },
  });
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

function chunkText(text, size = 5) {
  const out = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

function sseDeltas(text) {
  return chunkText(text)
    .map((c) => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`)
    .concat('data: [DONE]\n\n');
}

// 模拟后端：根据对话状态返回不同帧（支持 function-calling 两轮循环）
function makeRequestFn(opts) {
  return async (_url, init) => {
    const body = JSON.parse(init.body || '{}');
    const msgs = body.messages || [];
    const last = msgs[msgs.length - 1];
    if (opts.failNext && opts.failNext()) return new Response('', { status: 500 });
    if (opts.useTool && last && last.role === 'user') {
      return mockStream([
        `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', function: { name: 'get_weather', arguments: '{"city":"上海"}' } }] } }] })}\n\n`,
        'data: [DONE]\n\n',
      ]);
    }
    if (last && last.role === 'tool') {
      return mockStream(sseDeltas('已为你查询：上海今日晴，25℃，东南风 3 级，适合出行。'));
    }
    const userText = last && last.role === 'user' ? last.content : '';
    return mockStream(
      sseDeltas(`（模拟流式回复）你说了：「${userText}」。这段文字由 createSession + parseSSE 驱动，逐字渲染，可随时 abort 中断。`),
    );
  };
}

function renderMessages(logEl, messages) {
  logEl.innerHTML = messages.map((m) => {
    if (m.role === 'user') {
      const t = m.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
      return `<div style="display:flex;justify-content:flex-end"><div style="max-width:78%;background:var(--c-brand);color:var(--c-onbrand);padding:8px 10px;border-radius:10px 10px 2px 10px;font-size:13px;white-space:pre-wrap;word-break:break-word">${escapeHtml(t)}</div></div>`;
    }
    if (m.role === 'tool') {
      const r = m.content.find((b) => b.type === 'tool_result');
      return `<div style="align-self:flex-start;max-width:88%;background:var(--c-muted-bg);color:var(--c-muted);padding:6px 8px;border-radius:8px;font-size:12px">🔧 工具结果：${escapeHtml(JSON.stringify(r?.result ?? ''))}</div>`;
    }
    const call = m.content.find((b) => b.type === 'tool_call');
    const text = m.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const head = call
      ? `<div style="font-size:11px;color:var(--c-muted);margin-bottom:2px">🔧 调用工具 ${escapeHtml(call.name)}(${escapeHtml(JSON.stringify(call.args ?? {}))})</div>`
      : '';
    return `<div style="align-self:flex-start;max-width:82%;background:var(--c-card);border:1px solid var(--c-border);color:var(--c-text);padding:8px 10px;border-radius:10px 10px 10px 2px;font-size:13px;white-space:pre-wrap;word-break:break-word">${head}${escapeHtml(text)}</div>`;
  }).join('');
  logEl.scrollTop = logEl.scrollHeight;
}

const CHAT_HTML = `<div id="chat-root" style="display:flex;flex-direction:column;height:440px;border:1px solid var(--c-border);border-radius:12px;overflow:hidden;background:var(--c-card)">
  <div id="chat-log" style="flex:1;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:8px"></div>
  <div style="border-top:1px solid var(--c-border);padding:8px;display:flex;gap:6px;align-items:flex-end;background:var(--c-bg)">
    <textarea id="chat-input" rows="1" placeholder="输入消息后回车发送…" style="flex:1;resize:none;border:1px solid var(--c-border);border-radius:8px;padding:8px;font:inherit;background:var(--c-card);color:var(--c-text)"></textarea>
    <button id="chat-send" class="btn btn-success" style="padding:8px 14px">发送</button>
    <button id="chat-abort" class="btn btn-ghost" style="padding:8px 10px" hidden>中止</button>
    <button id="chat-err" class="btn btn-ghost" style="padding:8px 10px" hidden>模拟错误</button>
  </div>
  <div id="chat-status" style="font-size:11px;color:var(--c-muted);padding:4px 10px;background:var(--c-bg)"></div>
</div>`;

function wireScenario(opts) {
  return function init() {
    const logEl = document.getElementById('chat-log');
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    const status = document.getElementById('chat-status');
    const abortBtn = document.getElementById('chat-abort');
    const errBtn = document.getElementById('chat-err');
    const preview = document.getElementById('preview');
    const emit = (type, detail) =>
      preview.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));

    if (abortBtn) abortBtn.hidden = !opts.showAbort;
    if (errBtn) errBtn.hidden = !opts.showError;

    const session = createSession({
      endpoint: '/mock',
      requestFn: makeRequestFn(opts),
      systemPrompt: '你是 af-mobile 对话核心演示助手。',
      tools: opts.useTool
        ? [defineTool({
            name: 'get_weather',
            description: '查询城市天气',
            parameters: { type: 'object', properties: { city: { type: 'string' } } },
            execute: async (args) => ({ city: args.city, weather: '晴', temp: 25 }),
          })]
        : [],
      onMessage: (msg) => {
        renderMessages(logEl, session.messages);
        if (msg.role === 'tool') emit('chat:tool', { result: msg.content[0]?.result });
      },
    });
    session.append(createMessage({ role: 'assistant', content: [{ type: 'text', text: opts.greeting }] }));

    let busy = false;
    const setStatus = (s) => { status.textContent = s; };
    async function doSend() {
      const text = input.value.trim();
      if (!text || busy) return;
      input.value = '';
      busy = true; sendBtn.disabled = true; setStatus('流式输出中…');
      emit('chat:send', { text });
      try {
        await session.send(text);
        emit('chat:stream-end', { messages: session.messages.length });
        setStatus('空闲');
      } catch (e) {
        emit('chat:error', { message: String(e.message || e) });
        setStatus('出错：' + (e.message || e));
      } finally {
        busy = false; sendBtn.disabled = false;
      }
    }
    sendBtn.addEventListener('click', doSend);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });
    if (abortBtn) abortBtn.addEventListener('click', () => {
      session.abort(); emit('chat:abort', {}); setStatus('已中止');
    });
    if (errBtn) errBtn.addEventListener('click', () => {
      opts.failNext = () => true; setStatus('下次发送将返回 500（触发错误态）');
    });
    renderMessages(logEl, session.messages);
  };
}

export default {
  tag: 'chat',
  name: 'AI 对话核心',
  scenarios: [
    {
      name: '流式对话',
      html: CHAT_HTML,
      main: { selector: '#chat-root' },
      props: [],
      events: ['chat:send', 'chat:stream-end'],
      styleTokens: [
        { token: '--c-brand', label: '主色（用户气泡）', type: 'color' },
        { token: '--c-border', label: '边框', type: 'color' },
      ],
      init: wireScenario({
        greeting: '你好，我是演示用的对话核心。发送消息即可看到 createSession + parseSSE 的逐字流式效果。',
        useTool: false,
        showAbort: false,
        showError: false,
      }),
    },
    {
      name: '工具调用',
      html: CHAT_HTML,
      main: { selector: '#chat-root' },
      props: [],
      events: ['chat:send', 'chat:stream-end', 'chat:tool'],
      styleTokens: [
        { token: '--c-brand', label: '主色（用户气泡）', type: 'color' },
        { token: '--c-border', label: '边框', type: 'color' },
      ],
      init: wireScenario({
        greeting: '试试说「上海天气怎么样」——我会先发起 get_weather 工具调用，再基于结果作答（function-calling 循环）。',
        useTool: true,
        showAbort: false,
        showError: false,
      }),
    },
    {
      name: '中止 / 错误',
      html: CHAT_HTML,
      main: { selector: '#chat-root' },
      props: [],
      events: ['chat:send', 'chat:stream-end', 'chat:abort', 'chat:error'],
      styleTokens: [
        { token: '--c-brand', label: '主色（用户气泡）', type: 'color' },
        { token: '--c-border', label: '边框', type: 'color' },
      ],
      init: wireScenario({
        greeting: '「中止」可在流式输出途中打断；「模拟错误」让下次请求返回 500，演示错误态处理。',
        useTool: false,
        showAbort: true,
        showError: true,
      }),
    },
  ],
};
