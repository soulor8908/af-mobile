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
