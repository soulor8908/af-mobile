// @af-mobile/mcp —— MCP Server，暴露 5 个工具供 AI Agent 调用（全部零 LLM 配置可用）
// 核心原则：调用方即 LLM——TRAE / Claude / Cursor 等 Agent 用自己的模型生成与修正，
// 本 Server 只提供确定性的 prompt 构建、lint 验证、修正建议与飞轮分析。
// 工具：
//   get_prompt        — 按需求裁剪 System Prompt（Agent 用自己的模型生成页面）
//   check_compliance  — 跑 ESLint 检查合规性，违规自动写入飞轮遥测（不调 LLM）
//   fix_code          — 返回修正 prompt + 逐条修正建议（Agent 自行修正，不调 LLM）
//   generate_page     — 端到端生成（手动模式返回 prompt；配了 AFMOBILE_AI_API_URL 才走自动模式）
//   flywheel_report   — 数据飞轮分析：Top 违规规则 + 白名单候选 + 收敛度（不调 LLM）
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { recordRun, detectTool } from '../eval/telemetry.mjs';
import { resolveAsset } from '../scripts/resolve-asset.mjs';

const PKG_DIR = dirname(fileURLToPath(import.meta.url));
const TMP_DIR = join(tmpdir(), 'af-mobile-mcp');
// 内嵌消费端 ESLint 配置：发布端不依赖仓库 flat config（pkg-publish 设计 §3.5）
// 双候选：源码态 <mcp>/eslint.config.mjs；打包态 <mcp>/dist/../eslint.config.mjs
const CONFIG_FILE = [
  join(PKG_DIR, 'eslint.config.mjs'),
  join(PKG_DIR, '..', 'eslint.config.mjs'),
].find(c => existsSync(c));
const ESLINT_OPTS = {
  configFile: CONFIG_FILE,
  // flat config 的 files 按 cwd 相对路径匹配 → cwd 必须覆盖 snippet 落盘目录
  cwd: TMP_DIR,
  tmpDir: TMP_DIR,
};

const TOOLS = [
  {
    name: 'get_prompt',
    description: '获取本项目专用的 af-mobile UI 页面生成 System Prompt（按需求自动裁剪 few-shot 与组件 API）。用你自己的模型生成代码，无需配置任何 LLM。',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: '需求描述（如"商品列表页带图"），用于裁剪最相关的 few-shot' },
        promptMode: { type: 'string', enum: ['full', 'tailored'], description: 'full=全量，tailored=按需裁剪（默认）' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'check_compliance',
    description: '检查代码是否符合 af-mobile UI 白名单与 ESLint 规则。返回违规列表 + 逐条修正建议，并自动写入数据飞轮（下次生成更准）。不调用 LLM。',
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
    description: '对已有代码构造修正 prompt（含逐条 ESLint 错误 + 具体修正建议）。你用自己的模型按 prompt 修正后，再调 check_compliance 验证。不调用 LLM。',
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
    description: '端到端页面生成。未配置 AFMOBILE_AI_API_URL 时返回 system prompt + user prompt（推荐：改用 get_prompt + 自有模型）。配置后才走自动生成。',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: '需求描述（如"商品列表页带图"）' },
        promptMode: { type: 'string', enum: ['full', 'tailored'], description: 'prompt 模式：full=全量，tailored=按需裁剪（默认）' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'flywheel_report',
    description: '数据飞轮分析报告：Top 违规规则（按来源/工具分解）、白名单候选、RULE_HINTS 缺口、收敛度。帮你了解常见错误模式，一次写对。不调用 LLM。',
    inputSchema: {
      type: 'object',
      properties: {
        since: { type: 'string', description: '时间窗口（如 "30d"），默认全部' },
        topN: { type: 'number', description: '返回 Top N 条规则（默认 10）' },
      },
    },
  },
];

// ===== 工具实现（导出供测试直接调用）=====

// 遥测：MCP 每次检查都记录（含干净运行——收敛度数据）
function recordMcpRun(file, passed, messages) {
  recordRun({
    source: 'mcp',
    tool: detectTool(),
    file,
    passed,
    violations: messages.map(m => ({ rule: m.rule, severity: m.severity, line: m.line, message: m.message })),
  });
}

export async function getPrompt({ prompt, promptMode = 'tailored' }) {
  if (promptMode === 'full') {
    const p = resolveAsset('prompt/system-prompt.md');
    const systemPrompt = existsSync(p)
      ? readFileSync(p, 'utf8')
      : '(System Prompt 未构建，请先运行 npm run prompt；或改用 tailored 模式)';
    return { promptMode, systemPrompt };
  }
  const { buildPrompt } = await import('../scripts/build-prompt.mjs');
  return { promptMode, systemPrompt: buildPrompt({ userPrompt: prompt }) };
}

export async function checkCompliance({ code, filename = 'snippet.html' }) {
  const { extractCode, runEslint } = await import('../scripts/ai-fix.mjs');
  const tmpPath = join(TMP_DIR, filename);
  mkdirSync(TMP_DIR, { recursive: true });
  writeFileSync(tmpPath, code);
  const { js } = extractCode(tmpPath);
  rmSync(TMP_DIR, { recursive: true, force: true });
  const { messages } = await runEslint(js, ESLINT_OPTS);
  const errors = messages.filter(m => m.severity === 'error');
  const warnings = messages.filter(m => m.severity === 'warn');
  recordMcpRun(filename, errors.length === 0, [...errors, ...warnings]);
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
  const result = await runAiFixLoop(tmpPath, null, null, ESLINT_OPTS);
  rmSync(TMP_DIR, { recursive: true, force: true });
  if (result.ok) {
    recordMcpRun(filename, true, []);
    return { passed: true, rounds: result.rounds, message: 'ESLint 通过' };
  }
  recordMcpRun(filename, false, result.lastErrors || []);
  // 手动模式：返回修正 prompt 供调用方（AI Agent，用自己的模型）自行修正
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
  const result = await generate(prompt, { outputPath, promptMode, eslintOpts: ESLINT_OPTS });
  if (result.ok) return { passed: true, code: result.code, rounds: result.rounds };
  // 手动模式：返回 system prompt 供调用方自行生成（推荐改用 get_prompt）
  if (result.exitCode === 2) return { passed: false, mode: 'manual', systemPrompt: result.systemPrompt, userPrompt: result.userPrompt };
  return { passed: false, error: result.error || '生成失败', lastErrors: result.lastErrors || [] };
}

export async function flywheelReport({ since, topN = 10 } = {}) {
  const { readTelemetry } = await import('../eval/telemetry.mjs');
  const { analyze } = await import('../eval/flywheel.mjs');
  const events = readTelemetry();
  if (events.length === 0) {
    return { total: 0, message: '飞轮暂无数据。调 check_compliance / fix_code 或跑 npm run lint:flywheel 喂数据。' };
  }
  const a = await analyze(events, { since });
  return {
    total: a.total,
    topRules: a.perRule.slice(0, topN),
    whitelistCandidates: {
      classes: a.whitelistCandidates.classes.slice(0, topN),
      components: a.whitelistCandidates.components.slice(0, topN),
    },
    arbitraryValues: a.arbitraryValues.slice(0, topN),
    hintsGap: a.hintsGap,
    convergence: a.convergence,
  };
}

// ===== MCP Server =====
const server = new Server(
  { name: 'af-mobile-mcp', version: '2.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    let result;
    if (name === 'get_prompt') result = await getPrompt(args);
    else if (name === 'check_compliance') result = await checkCompliance(args);
    else if (name === 'fix_code') result = await fixCode(args);
    else if (name === 'generate_page') result = await generatePage(args);
    else if (name === 'flywheel_report') result = await flywheelReport(args);
    else throw new Error(`Unknown tool: ${name}`);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (e) {
    return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
  }
});

// 启动
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error('✓ af-mobile-mcp server running via stdio (5 tools, zero-LLM ready)');
});
