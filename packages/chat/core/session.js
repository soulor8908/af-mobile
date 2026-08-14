// 会话管理：维护消息列表、发送/中止、状态机（idle/streaming/error）
// 设计要点：框架无关，仅依赖 message.js + stream.js，不引用 DOM/React/Vue
// 协议：OpenAI 标准 SSE（choices[0].delta.content / delta.tool_calls），内置 function calling 循环
// 传输：默认 fetch，可用 requestFn 自定义（如走代理 / 注入请求头 / 组装 URL）

import { createMessage } from './message.js';
import { parseSSE } from './stream.js';

const MAX_TOOL_ROUNDS = 6;

/**
 * @typedef {Object} SessionOptions
 * @property {string} endpoint - 会话地址（传给 requestFn）
 * @property {string|(() => string)} [systemPrompt] - 系统提示词（首轮注入，可为函数以每次取最新值）
 * @property {import('./tool.js').Tool[]} [tools] - 工具注册表
 * @property {(url: string, init: RequestInit) => Promise<Response>} [requestFn] - 自定义请求（默认 fetch）
 * @property {number} [maxToolRounds] - 工具调用最大轮数
 * @property {(msg: import('./message.js').Message) => void} [onMessage] - 消息回调
 * @property {Array<Partial<import('./message.js').Message>>} [initialMessages] - 初始消息（恢复历史会话）
 */

/**
 * 创建一个会话实例
 * @param {SessionOptions} opts
 * @returns {{messages: import('./message.js').Message[], state: 'idle'|'streaming'|'error', send: (text: string) => Promise<void>, abort: () => void, subscribe: (fn: () => void) => () => void}}
 */
export function createSession(opts) {
  const messages = (opts.initialMessages ?? []).map((m) => createMessage(m));
  const tools = new Map((opts.tools ?? []).map((t) => [t.name, t]));
  const onMessage = opts.onMessage ?? (() => {});
  const requestFn = opts.requestFn ?? ((url, init) => fetch(url, init));
  const maxToolRounds = opts.maxToolRounds ?? MAX_TOOL_ROUNDS;
  const listeners = new Set();
  let state = 'idle';
  let controller = null;

  const notify = () => listeners.forEach((fn) => fn());
  function push(msg) { messages.push(msg); onMessage(msg); notify(); }
  const systemPrompt = () =>
    typeof opts.systemPrompt === 'function' ? opts.systemPrompt() : opts.systemPrompt;

  async function runTool(call) {
    const tool = tools.get(call.name);
    const result = tool
      ? await tool.execute(call.args ?? {})
      : { error: `unknown tool: ${call.name}` };
    push(createMessage({ role: 'tool', content: [{ type: 'tool_result', id: call.id, result }] }));
  }

  // 内部消息 → OpenAI API 消息（tool 内容序列化回字符串，纯文本拼接 text 块）
  function toAPIMessages() {
    return messages.map((m) => {
      const text = m.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
      if (m.role === 'user' || m.role === 'system') return { role: m.role, content: text };
      if (m.role === 'assistant') {
        const calls = m.content
          .filter((b) => b.type === 'tool_call')
          .map((b) => ({
            id: b.id, type: 'function',
            function: { name: b.name, arguments: JSON.stringify(b.args ?? {}) },
          }));
        const msg = { role: 'assistant', content: text || null };
        if (calls.length) msg.tool_calls = calls;
        return msg;
      }
      if (m.role === 'tool') {
        const block = m.content.find((b) => b.type === 'tool_result');
        return { role: 'tool', tool_call_id: block?.id, content: JSON.stringify(block?.result ?? '') };
      }
      return null;
    }).filter(Boolean);
  }

  // 单轮请求：解析 OpenAI SSE，产出本轮工具调用（返回 [] 表示流结束）
  async function oneRound() {
    const apiMessages = [
      ...(systemPrompt() ? [{ role: 'system', content: systemPrompt() }] : []),
      ...toAPIMessages(),
    ];
    const res = await requestFn(opts.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: apiMessages,
        stream: true,
        tools: [...tools.values()].map((t) => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters ?? { type: 'object', properties: {} },
          },
        })),
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`chat request failed: ${res.status}`);

    const assistant = createMessage({ role: 'assistant', content: [] });
    let pushed = false;
    const pushAssistant = () => { if (!pushed) { push(assistant); pushed = true; } };
    const pending = new Map();
    for await (const frame of parseSSE(res)) {
      if (frame.data === '[DONE]') break;
      let data;
      try { data = JSON.parse(frame.data); } catch { continue; }
      const delta = data.choices?.[0]?.delta;
      if (!delta) continue;
      if (delta.content) {
        const last = assistant.content.at(-1);
        if (last?.type === 'text') last.text += delta.content;
        else assistant.content.push({ type: 'text', text: delta.content });
        pushAssistant();
        onMessage(assistant); notify();
      }
      // 工具调用分片按 index 聚合（name/arguments 可能跨多帧到达）
      for (const tc of delta.tool_calls ?? []) {
        const acc = pending.get(tc.index) ?? { id: '', name: '', args: '' };
        if (tc.id) acc.id = tc.id;
        if (tc.function?.name) acc.name += tc.function.name;
        if (tc.function?.arguments) acc.args += tc.function.arguments;
        pending.set(tc.index, acc);
      }
    }
    const calls = [];
    for (const acc of pending.values()) {
      let args = {};
      try { args = JSON.parse(acc.args || '{}'); } catch { /* 非法参数保持空对象 */ }
      assistant.content.push({ type: 'tool_call', id: acc.id, name: acc.name, args });
      pushAssistant();
      notify();
      calls.push({ id: acc.id, name: acc.name, args });
    }
    return calls;
  }

  async function stream() {
    controller = new AbortController();
    state = 'streaming';
    notify();
    try {
      for (let round = 0; round < maxToolRounds; round++) {
        const calls = await oneRound();
        if (calls.length === 0) break;
        for (const call of calls) await runTool(call);
      }
      state = 'idle';
    } catch (err) {
      state = 'error';
      throw err;
    } finally {
      controller = null;
      notify();
    }
  }

  return {
    messages,
    get state() { return state; },
    send(text) {
      push(createMessage({ role: 'user', content: [{ type: 'text', text }] }));
      return stream();
    },
    // 注入外部消息（本地引擎结果 / 系统注入），不触发网络请求
    append(msg) {
      const created = createMessage(msg);
      push(created);
      return created;
    },
    abort() { controller?.abort(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
