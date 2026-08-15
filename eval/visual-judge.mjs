// AIFlow UI —— LLM 视觉评审
// 读取截图 PNG，转 base64，在文本中嵌入 Markdown 图片（deepseek 兼容），调用 LLM 评审
// 用法（独立）：
//   node eval/visual-judge.mjs <screenshot.png> "<需求描述>"
// 环境变量：
//   AIFLOW_AI_API_URL   LLM 端点（默认 http://127.0.0.1:8787）
//   AIFLOW_AI_API_KEY   Bearer key（代理场景可省略）
//   AIFLOW_AI_MODEL     模型名（默认用代理/端点默认）
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULTS = {
  url: process.env.AIFLOW_AI_API_URL || 'http://127.0.0.1:8787',
  key: process.env.AIFLOW_AI_API_KEY || '',
  model: process.env.AIFLOW_AI_MODEL || '',
};

// 调用 LLM 视觉评审：传截图 + 需求 + expects，返回 { pass, reason }
export async function visualReferee(screenshotPath, prompt, expects, { url, key, model } = {}) {
  const u = url || DEFAULTS.url;
  const k = key || DEFAULTS.key;
  const m = model || DEFAULTS.model;
  const png = readFileSync(screenshotPath);
  const b64 = png.toString('base64');

  // deepseek 兼容：用 Markdown 图在文本中嵌入
  const userMsg = `这是移动端 H5 页面截图。

![截图](data:image/png;base64,${b64})

需求：${prompt || ''}
期望应出现的元素选择器：${(expects || []).join(', ')}

请判断截图是否完整、正确地实现了需求。只回答 JSON 格式（不要其他文字）：
{"pass": true或false, "reason": "一句话说明原因"}

pass 为 true 表示实现正确，false 表示有缺失或错误。`;

  const body = { model: m || 'deepseek-v4-flash', temperature: 0, messages: [{ role: 'user', content: userMsg }] };
  const res = await fetch(u, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(k ? { Authorization: `Bearer ${k}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`视觉评审 API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content || data.choices?.[0]?.message?.content || data.text || '';
  // 提取 JSON
  const m2 = text.match(/\{[\s\S]*?"pass"[\s\S]*?\}/);
  if (m2) {
    try {
      const j = JSON.parse(m2[0]);
      return { pass: !!j.pass, reason: j.reason || '', raw: text };
    } catch { /* fallthrough */ }
  }
  return { pass: false, reason: '无法解析评审结果', raw: text };
}

// CLI
const isMain = process.argv[1] && resolve(process.argv[1]) === import.meta.url.replace('file://', '');
if (process.argv[1] && process.argv[1].endsWith('visual-judge.mjs')) {
  const [shot, prompt, ...rest] = process.argv.slice(2);
  if (!shot) { console.error('Usage: visual-judge.mjs <screenshot.png> "<需求>"'); process.exit(2); }
  visualReferee(shot, prompt).then(r => {
    console.log(JSON.stringify(r, null, 2));
  }).catch(e => { console.error(e); process.exit(2); });
}