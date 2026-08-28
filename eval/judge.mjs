// af-mobile UI —— 生成 Eval 评估器（judge）
// 输入：run.mjs 收集的 results 数组（每条含 expects + best.codePath）
// 输出：
//   - lint pass@k：生成代码通过 ESLint
//   - DOM pass@k：Playwright 渲染后 expects 选择器存在于真实 DOM
//   - 视觉 pass@k：LLM 对截图的视觉评审（权威，避免 DOM class 名不匹配误判）
//   - 按规则聚合失败率 + 按类别 pass 率
//
// 用法（独立调用）：
//   node eval/judge.mjs eval/results/raw-*.json              # 仅 lint 聚合
//   node eval/judge.mjs eval/results/raw-*.json --visual     # 附加截图 + LLM 视觉评审
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// dist 新鲜度守卫：dist/index.js 早于 src 侧最新修改时告警（过期 bundle 会导致
// COMPONENT_TAGS 丢失/动态分包 404，静默毒化视觉评审——2026-08-24 复测踩坑）
export function checkDistFreshness({ autoBuild = true } = {}) {
  const distEntry = join(ROOT, 'dist', 'index.js');
  if (!existsSync(distEntry)) return { fresh: true, reason: 'dist 未构建（服务器会 fallback 到 src）' };
  const distMtime = statSync(distEntry).mtimeMs;
  const newestSrc = ['src/index.js', 'src/index.css', 'src/charts/index.js', 'src/chat/index.js', 'src/blocks/index.js']
    .map(f => { try { return statSync(join(ROOT, f)).mtimeMs; } catch { return 0; } })
    .reduce((a, b) => Math.max(a, b), 0);
  if (distMtime >= newestSrc) return { fresh: true };
  if (!autoBuild) return { fresh: false, reason: 'dist/index.js 落后于 src 修改' };
  console.error('⚠ dist 过期（早于 src 修改），自动执行 npm run build …');
  const { execSync } = require('node:child_process');
  execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
  return { fresh: true, rebuilt: true };
}

// ===== 纯函数：lint 聚合（同步，不依赖浏览器）=====
export function judge(results, opts = {}) {
  const passK = opts.passK || 1;
  const total = results.length;
  const lintPassed = results.filter(r => r.passed).length;
  const lintPassRate = total > 0 ? (lintPassed / total * 100).toFixed(1) + '%' : '0%';

  // 平均轮数（成功样本的轮数，失败样本算 3 轮上限）
  const roundsSum = results.reduce((s, r) => s + (r.best.rounds || 3), 0);
  const avgRounds = total > 0 ? (roundsSum / total).toFixed(2) : '0';

  // 按规则聚合错误次数（跨所有 attempt 的所有 error）
  const errorsByRule = {};
  for (const r of results) {
    for (const a of r.attempts) {
      for (const e of (a.lastErrors || [])) {
        errorsByRule[e.rule] = (errorsByRule[e.rule] || 0) + 1;
      }
    }
  }

  // 按类别聚合 lint
  const byCategory = {};
  for (const r of results) {
    if (!byCategory[r.category]) byCategory[r.category] = { total: 0, lintPassed: 0, visualPassed: 0 };
    byCategory[r.category].total++;
    if (r.passed) byCategory[r.category].lintPassed++;
  }

  const lintFailures = results.filter(r => !r.passed).map(r => ({
    id: r.id, category: r.category, exitCode: r.best.exitCode, errors: r.best.lastErrors || [],
  }));

  return {
    passK, total, lintPassed, lintPassRate, avgRounds, errorsByRule, byCategory, lintFailures,
  };
}

// 从 prompts.jsonl 读取 id → prompt 映射（raw 结果不含 prompt 字段）
function loadPromptMap() {
  const path = join(ROOT, 'eval/prompts.jsonl');
  const map = {};
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const o = JSON.parse(line);
      if (o.id) map[o.id] = { prompt: o.prompt || '', expects: o.expects || [], asserts: o.asserts || [] };
    }
  } catch { /* prompts.jsonl 不存在时忽略 */ }
  return map;
}

// ===== 视觉评审（异步：Playwright 渲染截图 + LLM 评审）=====
// 对 lint 通过样本做截图 + LLM 视觉评审，返回 visual 明细
// 返回 { visualResults, visualPassed, visualPassRate, visualFailures, shotsDir }
export async function judgeVisual(results, opts = {}) {
  const { startServer, renderCapture } = await import('./visual.mjs');
  const { visualReferee } = await import('./visual-judge.mjs');
  checkDistFreshness();
  const shotsDir = opts.shotsDir || join(ROOT, 'eval/results/shots');
  mkdirSync(shotsDir, { recursive: true });
  const promptMap = opts.promptMap || loadPromptMap();

  const samples = results.filter(r => r.passed && r.best?.codePath && existsSync(r.best.codePath));
  const { server, port } = await startServer(opts.serverPort || 0);
  const visualResults = [];
  let visualPassed = 0;

  try {
    for (const r of samples) {
      const p = promptMap[r.id] || {};
      const semantic = (p.asserts || []).map((a) => (typeof a === 'string' ? { sel: a } : a));
      const dom = await renderCapture(r.best.codePath, [...(r.expects || []), ...semantic], { port, outDir: shotsDir });
      // LLM 视觉评审：默认关闭（省 token），仅 --visual-llm 显式开启时用截图评审
      let llm = null;
      if (opts.llm === true) {
        try {
          llm = await visualReferee(dom.screenshotPath, promptMap[r.id]?.prompt || '', r.expects);
        } catch (e) {
          llm = { pass: false, reason: 'LLM 评审失败: ' + e.message };
        }
      }
      const passed = llm ? llm.pass : dom.ok;
      if (passed) visualPassed++;
      visualResults.push({
        id: r.id, category: r.category,
        domPass: dom.ok, missing: dom.missing, fails: dom.fails,
        llmPass: llm ? llm.pass : null, llmReason: llm ? llm.reason : null,
        passed, screenshotPath: dom.screenshotPath, errors: dom.errors,
      });
    }
  } finally {
    server.close();
  }

  const total = results.length;
  const visualPassRate = total > 0 ? (visualPassed / total * 100).toFixed(1) + '%' : '0%';
  const visualFailures = visualResults.filter(v => !v.passed);

  // 语义断言失败回写：并入 flywheel 的 errorsByRule（af-mobile/semantic-visual 规则）
  if (opts.writeBack) {
    const byId = new Map(visualResults.map(v => [v.id, v]));
    for (const r of results) {
      const v = byId.get(r.id);
      r.attempts = (r.attempts || []).filter(a => !((a.lastErrors || []).length && (a.lastErrors || []).every(e => e.rule === 'af-mobile/semantic-visual')));
      if (v && !v.domPass && (v.fails || []).length) {
        r.attempts.push({
          ok: false, rounds: r.best?.rounds || 1,
          lastErrors: v.fails.map(f => ({ rule: 'af-mobile/semantic-visual', message: f })),
          codePath: r.best?.codePath || null,
        });
      }
    }
    writeFileSync(opts.writeBack, JSON.stringify(results, null, 2));
  }

  return { visualResults, visualPassed, visualPassRate, visualFailures, shotsDir, total };
}

// ===== 完整报告（lint + 视觉）=====
export async function fullJudge(results, opts = {}) {
  const lint = judge(results, opts);
  const visual = await judgeVisual(results, opts);
  const byCategory = { ...lint.byCategory };
  for (const v of visual.visualResults) {
    const item = results.find(x => x.id === v.id);
    if (item && byCategory[item.category] && v.passed) byCategory[item.category].visualPassed++;
  }
  return { ...lint, ...visual, byCategory };
}

// CLI 独立调用（Windows 兼容：与 run.mjs 同款判定，import.meta.url 与 argv[1] 分隔符/盘符差异归一化）
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const file = args.find(a => !a.startsWith('--'));
  if (!file) {
    console.error('Usage: judge.mjs RAW_RESULTS_JSON [--visual]');
    process.exit(2);
  }
  const results = JSON.parse(readFileSync(file, 'utf8'));
  const useVisual = args.includes('--visual');
  const useLlm = args.includes('--visual-llm');
  if (useVisual) {
    fullJudge(results, { llm: useLlm, writeBack: file }).then(r => {
      console.log(JSON.stringify({ ...r, visualResults: r.visualResults }, null, 2));
    });
  } else {
    console.log(JSON.stringify(judge(results), null, 2));
  }
}