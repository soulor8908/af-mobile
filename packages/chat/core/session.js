// 会话管理：维护消息列表、发送/中止、状态机（idle/streaming/error）
// 设计要点：框架无关，仅依赖 message.js + stream.js，不引用 DOM/React/Vue
// SSE 帧约定：data 为 JSON，{type:'text',delta} / {type:'tool_call',id,name,args} / {type:'done'}

import { createMessage } from './message.js';
import { parseSSE } from './stream.js';

/**
 * @typedef {Object} SessionOptions
 * @property {string} endpoint - SSE 流式接口地址
 * @property {import('./tool.js').Tool[]} [tools] - 工具注册表
 * @property {(msg: import('./message.js').Message) => void} [onMessage] - 消息回调
 */

/**
 * 创建一个会话实例
 * @param {SessionOptions} opts
 * @returns {{messages: import('./message.js').Message[], state: 'idle'|'streaming'|'error', send: (text: string) => Promise<void>, abort: () => void, subscribe: (fn: () => void) => () => void}}
 */
export function createSession(opts) {
  const messages = [];
  const tools = new Map((opts.tools ?? []).map((t) => [t.name, t]));
  const onMessage = opts.onMessage ?? (() => {});
  const listeners = new Set();
  let state = 'idle';
  let controller = null;

  const notify = () => listeners.forEach((fn) => fn());
  function push(msg) { messages.push(msg); onMessage(msg); notify(); }

  async function runTool(call) {
    const tool = tools.get(call.name);
    const result = tool
      ? await tool.execute(call.args ?? {})
      : { error: `unknown tool: ${call.name}` };
    push(createMessage({ role: 'tool', content: [{ type: 'tool_result', id: call.id, result }] }));
  }

  async function stream() {
    controller = new AbortController();
    state = 'streaming';
    notify();
    try {
      const res = await fetch(opts.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, tools: [...tools.values()] }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`chat request failed: ${res.status}`);
      const assistant = createMessage({ role: 'assistant', content: [] });
      push(assistant);
      for await (const frame of parseSSE(res)) {
        let data;
        try { data = JSON.parse(frame.data); } catch { continue; }
        if (data.type === 'text') {
          const last = assistant.content.at(-1);
          if (last?.type === 'text') last.text += data.delta;
          else assistant.content.push({ type: 'text', text: data.delta });
          onMessage(assistant); notify();
        } else if (data.type === 'tool_call') {
          assistant.content.push({ type: 'tool_call', id: data.id, name: data.name, args: data.args });
          notify();
          await runTool({ id: data.id, name: data.name, args: data.args });
        } else if (data.type === 'done') break;
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
    abort() { controller?.abort(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
