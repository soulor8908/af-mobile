// AIFlow UI —— L4 §4 AI 代码生成 ESLint 修正 3 轮流程
// 用法：
//   node scripts/ai-fix.mjs <html-or-js-file>              # 自检模式：跑 ESLint + 输出修正 prompt
//   AIFLOW_AI_API_URL=... node scripts/ai-fix.mjs <file>   # 自动模式：调用 LLM API 修正
//
// 流程（§4.1）：
//   1. 提取 <script> 内容（HTML 输入）或直接读 JS 文件
//   2. 跑 ESLint（plugin:aiflow/recommended）
//   3. 0 error → 成功
//   4. ≥1 error → 构造修正 prompt（含每条错误具体建议，D4）
//   5. 调用 LLM API（若配置）→ 重写 → 回到 Step 2
//   6. 3 轮失败 → 末尾打 <!-- AIFLOW_LINT_FAILED ... --> 标记（§4.3）
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_ROUNDS = 3;

// === 1. 提取待检测代码 ===
// HTML 输入：抽 <script> 块 + 把整 HTML 作为字符串嵌入（让 token-whitelist/no-inline-style 检测 class/style）
// JS 输入：直接用
export function extractCode(filePath) {
  const ext = extname(filePath).toLowerCase();
  const raw = readFileSync(filePath, 'utf8');
  if (ext === '.js' || ext === '.mjs') {
    return { js: raw, html: null };
  }
  // HTML：抽 <script>...</script>
  const scripts = [];
  const re = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(raw))) scripts.push(m[1]);
  // 把整个 HTML 作为字符串嵌入 JS（用反引号 + 转义内部反引号），让规则扫描字符串里的 class/style
  // 注意：HTML 内的反引号需要转义；用模板字符串
  const htmlLiteral = 'export const __html = ' + JSON.stringify(raw) + ';';
  return { js: scripts.join('\n;\n') + '\n' + htmlLiteral, html: raw };
}

// === 2. 跑 ESLint ===
// 临时文件必须放在 ROOT 下，让 ESLint flat config 能被找到（ESLint 从被 lint 的文件往上搜 config）
async function runEslint(code) {
  if (!code || !code.trim()) return { messages: [] };
  const { ESLint } = await import('eslint');
  const engine = new ESLint({ cwd: ROOT });
  const dir = join(ROOT, '.cache/ai-fix');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const jsPath = join(dir, 'snippet.js');
  writeFileSync(jsPath, code);
  let results;
  try {
    results = await engine.lintFiles([jsPath]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const messages = results.flatMap(r => r.messages.map(m => ({
    file: r.filePath,
    line: m.line, column: m.column,
    rule: m.ruleId || '(no-rule)',
    severity: m.severity === 2 ? 'error' : 'warn',
    message: m.message,
  })));
  return { messages };
}

// === 3. 构造修正 prompt（D4：给每条错误具体建议）===
const RULE_HINTS = {
  'aiflow/no-token-modification': '不要重定义 L1 token 变量。如需新 token，写在 tokens.css 或 tokens.project.css',
  'aiflow/no-inline-style': '改用对应的 atomic class：padding:16px → p-4；color:var(--c-brand) → text-brand；border-radius:8px → r-m',
  'aiflow/token-whitelist': '该 class 不在 115 白名单内。改用最接近的 L2 配方/原子，或在 .eslintrc 的 extraClass 登记',
  'aiflow/no-recipe-break': '该 class 组合会破坏配方：.btn 不要叠加 text-* 颜色；.input 不要叠加 t-sm/t-xs；.cell 不要叠加 f/fc',
  'aiflow/no-variant-conflict': '互斥变体只能保留最后一个：btn-sm+btn-lg → 删 btn-sm',
  'aiflow/no-arbitrary-value': '改用最接近的原子档位：p-[13px] → p-3 (12px)；p-7 → p-6 (32px)',
  'aiflow/no-tailwind-syntax': '不要用 Tailwind 前缀语法（md:/hover:/dark: 等）。响应式请用 @container in recipes.project.css',
  'aiflow/prefer-component': '改用对应 L3 真组件：.toast → <af-toast>；.sheet → <af-action-sheet>',
  'aiflow/atomic-duplicate': '同属性原子重复，保留最后一个：p-4 p-2 → 只留 p-2',
  'aiflow/wc-light-no-style': 'Light DOM 组件不能用内联 style、<style> 标签或 innerHTML 中的 style="..." 属性。改用 L2 配方/原子 class 或迁移到 Shadow 组件',
  'aiflow/wc-shadow-use-token': 'Shadow CSS 必须用 var(--*) 引用 token。例：color: #fff → color: var(--c-onbrand)',
  'aiflow/wc-part-naming': 'part 名必须 kebab-case：DialogContent → dialog-content',
  'aiflow/wc-event-naming': '事件名必须 af-{组件}:{动作}：afList_LoadMore → af-list:loadmore',
  'aiflow/wc-aria-required': '补全必需 ARIA 角色/属性。详见 aria-requirements.json',
  'aiflow/wc-cleanup': 'unmounted() 内补对应的清理调用：addEventListener → removeEventListener；setInterval → clearInterval',
};

export function buildFixPrompt(messages, originalCode) {
  const errors = messages.filter(m => m.severity === 'error');
  const warns = messages.filter(m => m.severity === 'warn');
  const lines = [];
  lines.push('# 上次生成的代码违反以下 ESLint 规则，请按要求修正');
  lines.push('# 重要：只改违规点，其余内容、结构、标签、顺序全部保持不变');
  lines.push('');

  let n = 0;
  for (const e of errors) {
    n++;
    const hint = RULE_HINTS[e.rule] || '（无具体建议，请查阅设计文档）';
    lines.push(`## 错误 ${n}（第 ${e.line} 行）— ${e.rule}`);
    lines.push(e.message);
    lines.push(`【建议】${hint}`);
    lines.push('');
  }
  // warn 已被 --fix 自动修的，无需 AI 处理；只列 warning 让 AI 知道
  if (warns.length) {
    lines.push(`## 警告（${warns.length} 条，可参考但不强制修改）`);
    for (const w of warns.slice(0, 5)) {
      lines.push(`- 第 ${w.line} 行 [${w.rule}]：${w.message}`);
    }
    lines.push('');
  }
  lines.push('请输出完整修正后的代码（只改违规行，其余保持不变）。');
  return lines.join('\n');
}

// === 4. 调用 LLM API（若配置）===
async function callLLM(systemPrompt, userPrompt) {
  const url = process.env.AIFLOW_AI_API_URL;
  const key = process.env.AIFLOW_AI_API_KEY;
  const model = process.env.AIFLOW_AI_MODEL || 'gpt-4o';
  if (!url) return null; // 未配置 → 走手动模式
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({ model, system: systemPrompt, user: userPrompt, temperature: 0.1, top_p: 0.5 }),
  });
  if (!res.ok) throw new Error(`LLM API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content || data.choices?.[0]?.message?.content || data.text || '';
}

// === 5. 主循环（最多 3 轮）===
// 输入：待修文件绝对路径 + 可选 LLM 调用器（不传则用手动模式）
// 返回：{ ok: Boolean, rounds: Number, lastErrors: Array, exitCode: Number }
export async function runAiFixLoop(absFile, llmCaller) {
  const systemPromptPath = join(ROOT, 'prompt/system-prompt.md');
  const systemPrompt = existsSync(systemPromptPath)
    ? readFileSync(systemPromptPath, 'utf8')
    : '(System Prompt 未构建，请先运行 npm run prompt)';

  let originalCode = readFileSync(absFile, 'utf8');
  let extract = extractCode(absFile);
  let lastMessages = [];

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const { messages } = await runEslint(extract.js);
    lastMessages = messages;
    const errors = messages.filter(m => m.severity === 'error');
    if (errors.length === 0) {
      return { ok: true, rounds: round, lastErrors: [], exitCode: 0 };
    }

    const fixPrompt = buildFixPrompt(messages, originalCode);

    if (!llmCaller) {
      // 手动模式：返回修正 prompt + 原代码，调用方决定如何处理
      return {
        ok: false, rounds: round, lastErrors: errors, exitCode: 2,
        systemPrompt, fixPrompt, originalCode,
      };
    }

    // 自动模式：调用 LLM 重写
    let newCode;
    try {
      newCode = await llmCaller(systemPrompt, fixPrompt + '\n\n# 原代码\n```\n' + originalCode + '\n```');
    } catch (e) {
      return { ok: false, rounds: round, lastErrors: errors, exitCode: 3, error: e.message };
    }
    if (!newCode || !newCode.trim()) {
      return { ok: false, rounds: round, lastErrors: errors, exitCode: 3, error: 'LLM 返回空内容' };
    }
    // 提取代码块（如果有 ```...``` 包裹），去掉围栏带来的尾部换行
    const codeBlock = newCode.match(/```(?:html|javascript|js)?\n([\s\S]*?)```/);
    if (codeBlock) newCode = codeBlock[1].replace(/\n+$/, '');
    writeFileSync(absFile, newCode);
    originalCode = newCode;
    extract = extractCode(absFile);
  }

  // 最后一轮 LLM 修正后必须再 ESLint 验证一次（设计 §4.1：3 轮 = 3 次 LLM 修正 + 4 次 ESLint）
  const { messages: finalMsgs } = await runEslint(extract.js);
  lastMessages = finalMsgs;
  const finalErrors = finalMsgs.filter(m => m.severity === 'error');
  if (finalErrors.length === 0) {
    return { ok: true, rounds: MAX_ROUNDS, lastErrors: [], exitCode: 0 };
  }

  // 3 轮失败：末尾打 AIFLOW_LINT_FAILED 标记
  const errors = lastMessages.filter(m => m.severity === 'error');
  const failMark = `<!-- AIFLOW_LINT_FAILED\n${JSON.stringify(errors, null, 2)}\n-->`;
  writeFileSync(absFile, originalCode + '\n' + failMark + '\n');
  return { ok: false, rounds: MAX_ROUNDS, lastErrors: errors, exitCode: 1 };
}

// CLI 直接运行
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const file = process.argv[2];
  if (!file || file === '-h' || file === '--help') {
    console.error('Usage: ai-fix.mjs <html-or-js-file>');
    console.error('Env: AIFLOW_AI_API_URL (LLM endpoint, optional)');
    console.error('     AIFLOW_AI_API_KEY (LLM auth, optional)');
    console.error('     AIFLOW_AI_MODEL (model name, optional)');
    process.exit(file ? 0 : 2);
  }
  const absFile = resolve(process.cwd(), file);
  if (!existsSync(absFile)) {
    console.error('✗ file not found: ' + absFile);
    process.exit(2);
  }
  // CLI 的 LLM caller：默认从环境变量读
  const llmCaller = process.env.AIFLOW_AI_API_URL ? callLLM : null;
  runAiFixLoop(absFile, llmCaller).then(r => {
    if (r.ok) {
      console.error('✓ ESLint 通过（warn 不阻断）');
      process.exit(0);
    }
    if (r.exitCode === 2) {
      console.error('\n⚠ 未配置 AIFLOW_AI_API_URL，进入手动模式');
      console.error('  请把以下修正 Prompt + 原代码复制到 LLM，把输出写回原文件后重跑：\n');
      process.stdout.write('=== SYSTEM ===\n' + r.systemPrompt + '\n');
      process.stdout.write('=== USER ===\n' + r.fixPrompt + '\n');
      process.stdout.write('=== ORIGINAL CODE ===\n' + r.originalCode + '\n');
      process.exit(2);
    }
    if (r.exitCode === 1) {
      console.error(`\n✗ ${MAX_ROUNDS} 轮修正失败，已打 AIFLOW_LINT_FAILED 标记`);
      const byRule = {};
      for (const e of r.lastErrors) byRule[e.rule] = (byRule[e.rule] || 0) + 1;
      for (const [rule, n] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
        console.error(`  ${rule}: ${n} 次`);
      }
    }
    process.exit(r.exitCode);
  }).catch(e => { console.error(e); process.exit(2); });
}
