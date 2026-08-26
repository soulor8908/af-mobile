// af-mobile UI —— Agent 模式 Eval 运行器（生评分离：agent 当生成器，程序当评审器）
// 用法：
//   node eval/agent-run.mjs --emit [--limit 5] [--category list] [--ids 001,002] [--variant agent-x] [--k 1]
//   node eval/agent-run.mjs --lint eval/results/001-k0-agent-x.html    # 0 token 自检，exit 1 = 有 lint error
//   node eval/agent-run.mjs --collect [--variant agent-x] [--k 1] [--out eval/results/raw.json]
//
// 设计（生评分离）：
//   judge.mjs / flywheel.mjs 只消费 raw.json（id/category/expects/passed/attempts/best.codePath）+ HTML 文件，
//   生成器是谁无所谓。本脚本把 run.mjs 中绑死 AFMOBILE_AI_API_URL 的生成环节解耦出来：
//   emit    输出任务清单（JSON 到 stdout），供 WorkBuddy / Trae 等 agent 分批领取生成
//   lint    复用 ai-fix.mjs 的 extractCode + runEslint（纯程序，0 token），agent 生成后自修闭环用
//   collect 扫描结果目录权威重跑 lint，组装 raw.json，接回 judge / flywheel 原管道（一行不改）
// 约定：
//   文件命名 <id>-k<k>-<variant>.html（与 run.mjs 一致）；variant=current 时 collect 默认写 raw.json
//   exitCode 沿用 ai-fix 约定：0=通过，1=lint 失败，3=执行异常
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPrompts } from './run.mjs';
import { extractCode, runEslint } from '../scripts/ai-fix.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RESULTS_DIR = join(ROOT, 'eval/results');

// === 参数解析 ===
function parseArgs(args) {
  const opts = { limit: 0, category: '', ids: [], variant: 'agent', k: 1, out: '', lintFile: '', mode: '' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--emit') opts.mode = 'emit';
    else if (args[i] === '--collect') opts.mode = 'collect';
    else if (args[i] === '--lint') { opts.mode = 'lint'; opts.lintFile = args[++i]; }
    else if (args[i] === '--limit') opts.limit = parseInt(args[++i]);
    else if (args[i] === '--category') opts.category = args[++i];
    else if (args[i] === '--ids') opts.ids = args[++i].split(',').filter(Boolean);
    else if (args[i] === '--variant') opts.variant = args[++i];
    else if (args[i] === '--k') opts.k = parseInt(args[++i]);
    else if (args[i] === '--out') opts.out = args[++i];
  }
  return opts;
}

// === emit：输出 agent 任务清单（每条 id × k 一个任务）===
function emit(opts) {
  const prompts = loadPrompts();
  const filtered = prompts.filter(p =>
    (!opts.category || p.category === opts.category) && (!opts.ids.length || opts.ids.includes(p.id)));
  const target = opts.limit > 0 ? filtered.slice(0, opts.limit) : filtered;
  mkdirSync(RESULTS_DIR, { recursive: true });
  const tasks = [];
  for (const item of target) {
    for (let k = 0; k < opts.k; k++) {
      const outputPath = join(RESULTS_DIR, `${item.id}-k${k}-${opts.variant}.html`);
      tasks.push({
        id: item.id,
        category: item.category,
        prompt: item.prompt,
        expects: item.expects,
        outputPath,
        lintCmd: `node eval/agent-run.mjs --lint "${outputPath}"`,
      });
    }
  }
  process.stdout.write(JSON.stringify(tasks, null, 2) + '\n');
  console.error(`✓ emit ${tasks.length} 个任务（${target.length} 条 prompt × k=${opts.k}，variant=${opts.variant}）`);
}

// === lint：0 token 自检（agent 生成后自修闭环用，最多 3 轮由 agent 自控）===
async function lint(file) {
  const abs = resolve(ROOT, file);
  const { js } = extractCode(abs);
  const { messages } = await runEslint(js);
  const errors = messages.filter(m => m.severity === 'error');
  const warns = messages.filter(m => m.severity === 'warn');
  process.stdout.write(JSON.stringify({ ok: errors.length === 0, errors, warns }, null, 2) + '\n');
  console.error(errors.length === 0
    ? `✓ ${file} lint 通过（${warns.length} warn）`
    : `✗ ${file} ${errors.length} 个 error（另 ${warns.length} warn）`);
  process.exit(errors.length === 0 ? 0 : 1);
}

// === collect：权威重跑 lint + 组装 raw.json ===
async function collect(opts) {
  const prompts = loadPrompts();
  const promptMap = new Map(prompts.map(p => [p.id, p]));
  const re = /^(.+)-k(\d+)-(.+)\.html$/;
  const files = readdirSync(RESULTS_DIR)
    .map(f => ({ f, m: f.match(re) }))
    .filter(x => x.m && x.m[3] === opts.variant && promptMap.has(x.m[1]));

  // 按 id 分组，k 升序
  const byId = new Map();
  for (const { f, m } of files) {
    if (!byId.has(m[1])) byId.set(m[1], []);
    byId.get(m[1]).push({ k: parseInt(m[2]), path: join(RESULTS_DIR, f) });
  }

  const results = [];
  for (const item of prompts) {
    const group = (byId.get(item.id) || []).sort((a, b) => a.k - b.k);
    if (group.length === 0) continue; // 未生成的跳过，末尾统一报告
    const attempts = [];
    for (const { path } of group) {
      try {
        const { js } = extractCode(path);
        const { messages } = await runEslint(js);
        const errors = messages.filter(m2 => m2.severity === 'error');
        attempts.push({
          ok: errors.length === 0,
          rounds: 1, // agent 自修轮数不计入程序判定，lint 通过即 1 轮
          exitCode: errors.length === 0 ? 0 : 1,
          lastErrors: errors,
          error: null,
          codePath: errors.length === 0 ? path : null,
        });
      } catch (e) {
        attempts.push({ ok: false, rounds: 1, exitCode: 3, lastErrors: [], error: e.message, codePath: null });
      }
    }
    const passed = attempts.some(a => a.ok);
    const best = attempts.find(a => a.ok) || attempts[attempts.length - 1];
    // lint 失败也要保留 codePath 供 judge --visual 截图归因（与 run.mjs 不同：失败时也给路径）
    if (!best.codePath) best.codePath = group[group.length - 1].path;
    results.push({ id: item.id, category: item.category, expects: item.expects, passed, attempts, best });
    process.stderr.write(`  [${item.id}] ${item.category} ${passed ? '✓' : '✗'}\n`);
  }

  const missing = prompts.filter(p => !byId.has(p.id)).map(p => p.id);
  if (missing.length) console.error(`⚠ 缺 ${missing.length} 条未生成：${missing.join(',')}`);

  const outPath = opts.out
    ? resolve(ROOT, opts.out)
    : join(RESULTS_DIR, opts.variant === 'current' ? 'raw.json' : `raw-${opts.variant}.json`);
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  const passedN = results.filter(r => r.passed).length;
  console.error(`✓ collect ${results.length} 条 → ${outPath}（lint pass ${passedN}/${results.length}）`);
  console.error(`  下一步：node eval/judge.mjs "${outPath}" --visual && node eval/flywheel.mjs "${outPath}"`);
}

// === 入口 ===
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.mode === 'emit') return emit(opts);
  if (opts.mode === 'lint') return lint(opts.lintFile);
  if (opts.mode === 'collect') return collect(opts);
  console.error('用法：agent-run.mjs --emit | --lint <file> | --collect（见文件头注释）');
  process.exit(2);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch(e => { console.error(e); process.exit(2); });
