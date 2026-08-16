// AIFlow UI —— 数据飞轮 v2：统一遥测事件库（本地优先，零 LLM）
// 所有数据生产者（MCP / CLI / CI / eval）通过 recordRun 写入同一 JSONL；
// 分析层（eval/flywheel.mjs）通过 readTelemetry 读取。
// 存储：.aiflow/telemetry.jsonl（gitignore），可用 AIFLOW_TELEMETRY_DIR 覆盖（测试隔离）。
import { appendFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// 来源权重：真实使用 > 合成 eval（分析层加权求和用）
export const SOURCE_WEIGHTS = { mcp: 3, cli: 2, ci: 2, eval: 1 };

// 遥测目录（env 可覆盖，测试隔离用）
// cwd 基准（pkg-publish 设计 §3.4）：开发态 cwd=仓库根（行为不变）；发布态 cwd=用户项目根（遥测属项目级数据，不落包目录）
export function telemetryDir() {
  return process.env.AIFLOW_TELEMETRY_DIR || join(process.cwd(), '.aiflow');
}

function telemetryPath() {
  return join(telemetryDir(), 'telemetry.jsonl');
}

// 识别当前是哪个开发工具在驱动：显式 env > 常见 Agent 标记 > unknown
export function detectTool() {
  if (process.env.AIFLOW_TOOL) return process.env.AIFLOW_TOOL;
  if (process.env.CLAUDECODE === '1' || process.env.CLAUDE_CODE_ENTRYPOINT) return 'claude-code';
  if (process.env.CURSOR_AGENT) return 'cursor';
  if (process.env.CI) return 'ci';
  return 'unknown';
}

// ===== 消息脱敏（隐私红线：遥测不落任何代码内容）=====
// 已知会嵌入代码片段的规则消息 → 落盘前剥离引号内内容，只保留语义前缀。
// 保留 class/组件/属性名等标识符（白名单候选与档位挖掘依赖它们）。
const RULE_MESSAGE_REDACT = new Map([
  // "Inline style 'color:red;url(x)' is forbidden..." → 整个 style 属性值剥离
  ['aiflow/no-inline-style', m => m.replace(/'[^']*'/g, "'[style]'")],
  // "'color: #fff' in Shadow CSS must use var(--*)..." → 整条 CSS 声明剥离
  ['aiflow/wc-shadow-use-token', m => m.replace(/'[^']*'/g, "'[css]'")],
]);

const MAX_MESSAGE_LEN = 200;

// 单条违规消息脱敏：规则定向剥离 + 超长截断兜底（防未来规则意外嵌入大段代码）
export function sanitizeMessage(rule, message) {
  const redact = RULE_MESSAGE_REDACT.get(rule);
  const msg = redact ? redact(String(message)) : String(message);
  return msg.length > MAX_MESSAGE_LEN ? msg.slice(0, MAX_MESSAGE_LEN) + '…' : msg;
}

// 记录一次 lint 运行（违规或干净均可；violations 空数组 + passed=true 表示干净运行）
// violations: [{ rule, severity, line, message }]
export function recordRun({ source, tool, file, passed, violations }) {
  const event = {
    v: 1,
    ts: new Date().toISOString(),
    source,
    tool: tool || detectTool(),
    file,
    passed: Boolean(passed),
    violations: (violations || []).map(v => ({
      rule: v.rule,
      severity: v.severity || 'error',
      line: v.line || 0,
      message: sanitizeMessage(v.rule, v.message || ''),
    })),
  };
  const dir = telemetryDir();
  mkdirSync(dir, { recursive: true });
  appendFileSync(telemetryPath(), JSON.stringify(event) + '\n');
  return event;
}

// 读取全部事件（逐行解析，坏行跳过不崩——AGENTS #6）
export function readTelemetry() {
  const p = telemetryPath();
  if (!existsSync(p)) return [];
  const out = [];
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* 坏行丢弃 */ }
  }
  return out;
}
