// af-mobile UI —— LLM 格式转换代理
// 把 callLLM 发送的 { model, system, user, temperature, top_p } 协议
// 转换为 OpenAI 兼容格式 { model, messages:[{role:'system'},{role:'user'}], ... } 转发到真实 LLM 端点
// 返回 OpenAI 兼容响应（含 choices[0].message.content），供脚本原有解析逻辑直接使用
//
// 用法：
//   AFMOBILE_AI_API_KEY=sk-xxx AFMOBILE_AI_MODEL=deepseek-v4-flash node eval/proxy.mjs [port]
// 环境变量：
//   AFMOBILE_AI_API_KEY  必填，上游 LLM 的 Bearer key
//   AFMOBILE_AI_MODEL    必填，上游模型名
//   AFMOBILE_AI_TARGET   可选，上游端点（默认 https://api.deepseek.com/v1/chat/completions）
import { createServer } from 'node:http';

const PORT = Number(process.argv[2]) || 8787;
const TARGET = process.env.AFMOBILE_AI_TARGET || 'https://api.deepseek.com/v1/chat/completions';
const KEY = process.env.AFMOBILE_AI_API_KEY;
const MODEL = process.env.AFMOBILE_AI_MODEL;

if (!KEY || !MODEL) {
  console.error('✗ 缺少 AFMOBILE_AI_API_KEY / AFMOBILE_AI_MODEL 环境变量');
  process.exit(2);
}

// 调用真实 LLM 端点（OpenAI 兼容）
async function callUpstream(body) {
  const res = await fetch(TARGET, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`上游 LLM ${res.status}: ${await res.text()}`);
  return res.json();
}

createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'method not allowed' }));
    return;
  }
  let raw = '';
  for await (const chunk of req) raw += chunk;
  let incoming;
  try {
    incoming = JSON.parse(raw);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid json' }));
    return;
  }

  // 转换：{ model, system, user, temperature, top_p } → OpenAI 消息格式
  const messages = [];
  if (incoming.system) messages.push({ role: 'system', content: incoming.system });
  if (incoming.user) messages.push({ role: 'user', content: incoming.user });
  if (incoming.messages) messages.push(...incoming.messages); // 已兼容格式则透传
  if (messages.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '缺少 system/user 或 messages' }));
    return;
  }

  const out = {
    model: (incoming.model && incoming.model !== 'gpt-4o') ? incoming.model : MODEL,
    messages,
    temperature: incoming.temperature ?? 0.1,
    top_p: incoming.top_p ?? 0.5,
  };
  if (incoming.max_tokens) out.max_tokens = incoming.max_tokens;

  try {
    const data = await callUpstream(out);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  } catch (e) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}).listen(PORT, () => {
  console.error(`✓ LLM proxy @ http://127.0.0.1:${PORT} → ${TARGET} (${MODEL})`);
});
