#!/usr/bin/env node
// @af-mobile/mcp —— MCP Server，暴露 3 个工具供 AI Agent 调用
// 工具：
//   check_compliance — 跑 ESLint 检查代码合规性（纯本地，无 LLM）
//   fix_code         — ESLint 修正闭环（手动模式返回修正 prompt，自动模式调 LLM 修正）
//   generate_page    — 端到端页面生成（手动模式返回 system prompt，自动模式调 LLM 生成）
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TMP_DIR = join(ROOT, '.cache/mcp');

const TOOLS = [
  {
    name: 'check_compliance',
    description: '检查代码是否符合 AIFlow UI 白名单与 ESLint 规则。返回违规列表（error/warn），不调用 LLM。',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: '待检查的代码（HTML 或 JS）' },
        filename: { type: 'string', description: '文件名（用于判断 HTML/JS，默认 snippet.html）' },
      },
      required: ['code'],
    },
  },
  {
    name: 'fix_code',
    description: '对已有代码跑 ESLint 修正闭环（最多 3 轮）。手动模式（未配 AIFLOW_AI_API_URL）返回修正 prompt + 违规列表；自动模式调 LLM 修正后返回最终代码。',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: '待修正的代码（HTML 或 JS）' },
        filename: { type: 'string', description: '文件名（默认 snippet.html）' },
      },
      required: ['code'],
    },
  },
  {
    name: 'generate_page',
    description: '根据需求描述端到端生成页面（system prompt → LLM 生成 → ESLint 修正闭环）。手动模式返回 system prompt + user prompt；自动模式返回生成+修正后的完整代码。',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: '需求描述（如"商品列表页带图"）' },
        promptMode: { type: 'string', enum: ['full', 'tailored'], description: 'prompt 模式：full=全量，tailored=按需裁剪（默认）' },
      },
      required: ['prompt'],
    },
  },
];

// ===== 工具实现（导出供测试直接调用）=====
export async function checkCompliance({ code, filename = 'snippet.html' }) {
  const { extractCode, runEslint } = await import('../scripts/ai-fix.mjs');
  const tmpPath = join(TMP_DIR, filename);
  mkdirSync(TMP_DIR, { recursive: true });
  writeFileSync(tmpPath, code);
  const { js } = extractCode(tmpPath);
  rmSync(TMP_DIR, { recursive: true, force: true });
  const { messages } = await runEslint(js);
  const errors = messages.filter(m => m.severity === 'error');
  const warnings = messages.filter(m => m.severity === 'warn');
  return {
    passed: errors.length === 0,
    errorCount: errors.length,
    warningCount: warnings.length,
    errors: errors.map(e => ({ line: e.line, rule: e.rule, message: e.message })),
    warnings: warnings.map(w => ({ line: w.line, rule: w.rule, message: w.message })),
  };
}

export async function fixCode({ code, filename = 'snippet.html' }) {
  const { runAiFixLoop } = await import('../scripts/ai-fix.mjs');
  mkdirSync(TMP_DIR, { recursive: true });
  const tmpPath = join(TMP_DIR, filename);
  writeFileSync(tmpPath, code);
  const result = await runAiFixLoop(tmpPath, null);
  rmSync(TMP_DIR, { recursive: true, force: true });
  if (result.ok) return { passed: true, rounds: result.rounds, message: 'ESLint 通过' };
  // 手动模式：返回修正 prompt 供调用方（AI Agent）自行修正
  return {
    passed: false,
    rounds: result.rounds,
    exitCode: result.exitCode,
    fixPrompt: result.fixPrompt || '',
    errors: (result.lastErrors || []).map(e => ({ line: e.line, rule: e.rule, message: e.message })),
  };
}

export async function generatePage({ prompt, promptMode = 'tailored' }) {
  const { generate } = await import('../scripts/generate.mjs');
  const outputPath = join(TMP_DIR, `gen-${Date.now()}.html`);
  const result = await generate(prompt, { outputPath, promptMode });
  if (result.ok) return { passed: true, code: result.code, rounds: result.rounds };
  // 手动模式：返回 system prompt 供调用方自行生成
  if (result.exitCode === 2) return { passed: false, mode: 'manual', systemPrompt: result.systemPrompt, userPrompt: result.userPrompt };
  return { passed: false, error: result.error || '生成失败', lastErrors: result.lastErrors || [] };
}

// ===== MCP Server =====
const server = new Server(
  { name: 'aiflow-ui-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    let result;
    if (name === 'check_compliance') result = await checkCompliance(args);
    else if (name === 'fix_code') result = await fixCode(args);
    else if (name === 'generate_page') result = await generatePage(args);
    else throw new Error(`Unknown tool: ${name}`);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (e) {
    return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
  }
});

// 启动
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error('✓ aiflow-ui-mcp server running via stdio');
});
