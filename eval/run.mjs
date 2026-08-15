// AIFlow UI —— 生成 Eval 运行器
// 读 eval/prompts.jsonl → 对每条需求调 generate.mjs（生成→lint→修正→再生）
// 收集每条的：pass/fail、轮数、ESLint 错误（按规则聚合）、生成代码
// 用法：
//   AIFLOW_AI_API_URL=... node eval/run.mjs                    # 跑全部
//   AIFLOW_AI_API_URL=... node eval/run.mjs --limit 5          # 只跑前 5 条
//   AIFLOW_AI_API_URL=... node eval/run.mjs --category list    # 只跑某类
//   AIFLOW_AI_API_URL=... node eval/run.mjs --pass-k 3         # pass@k（每条跑 k 次取最优）
//   node eval/run.mjs --dry-run                                # 不调 LLM，只验证 prompts.jsonl 格式
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from '../scripts/generate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROMPTS_PATH = join(ROOT, 'eval/prompts.jsonl');
const RESULTS_DIR = join(ROOT, 'eval/results');

// 读 prompts.jsonl
function loadPrompts() {
  const lines = readFileSync(PROMPTS_PATH, 'utf8').split('\n').filter(l => l.trim());
  return lines.map((line, i) => {
    const obj = JSON.parse(line);
    if (!obj.id || !obj.prompt || !obj.category) {
      throw new Error(`prompts.jsonl 第 ${i + 1} 行缺少 id/prompt/category 字段`);
    }
    if (!Array.isArray(obj.expects) || obj.expects.length === 0) {
      throw new Error(`prompts.jsonl 第 ${i + 1} 行缺少 expects 字段（期望元素的 selector 数组）`);
    }
    return obj;
  });
}

// 单条 eval 运行：生成 + ai-fix 闭环
async function runOne(item, passK = 1, promptMode = 'tailored') {
  const attempts = [];
  for (let k = 0; k < passK; k++) {
    const outputPath = join(RESULTS_DIR, `${item.id}-k${k}.html`);
    const result = await generate(item.prompt, { outputPath, promptMode });
    attempts.push({
      ok: result.ok,
      rounds: result.rounds,
      exitCode: result.exitCode,
      lastErrors: result.lastErrors,
      error: result.error || null,
      codePath: result.ok ? outputPath : null,
    });
    if (result.ok) break; // pass@k：成功就不再试
  }
  // pass@k：任一次成功即 pass
  const passed = attempts.some(a => a.ok);
  const best = attempts.find(a => a.ok) || attempts[attempts.length - 1];
  return { id: item.id, category: item.category, expects: item.expects, passed, attempts, best };
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  let limit = 0;
  let category = '';
  let passK = 1;
  let dryRun = false;
  let promptMode = 'tailored';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit') limit = parseInt(args[++i]);
    else if (args[i] === '--category') category = args[++i];
    else if (args[i] === '--pass-k') passK = parseInt(args[++i]);
    else if (args[i] === '--prompt') promptMode = args[++i] === 'full' ? 'full' : 'tailored';
    else if (args[i] === '--dry-run') dryRun = true;
  }

  const prompts = loadPrompts();
  console.error(`✓ 加载 ${prompts.length} 条 eval prompt`);

  if (dryRun) {
    console.error('✓ dry-run：prompts.jsonl 格式正确');
    process.exit(0);
  }

  if (!process.env.AIFLOW_AI_API_URL) {
    console.error('✗ 未配置 AIFLOW_AI_API_URL，无法运行生成 eval');
    console.error('  用 --dry-run 仅验证 prompts.jsonl 格式');
    process.exit(2);
  }

  const filtered = prompts.filter(p => !category || p.category === category);
  const target = limit > 0 ? filtered.slice(0, limit) : filtered;
  console.error(`▶ 运行 ${target.length} 条（pass@${passK}，prompt=${promptMode}）...`);

  mkdirSync(RESULTS_DIR, { recursive: true });
  const results = [];
  for (const item of target) {
    process.stderr.write(`  [${item.id}] ${item.category} ... `);
    const r = await runOne(item, passK, promptMode);
    results.push(r);
    process.stderr.write(r.passed ? `✓ (${r.best.rounds} 轮)\n` : `✗ (${r.best.exitCode})\n`);
  }

  // 写原始结果
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const rawPath = join(RESULTS_DIR, `raw-${ts}.json`);
  writeFileSync(rawPath, JSON.stringify(results, null, 2));
  console.error(`\n✓ 原始结果 → ${rawPath}`);

  // 调 judge 聚合（lint + 视觉：渲染截图 + LLM 评审）
  const { fullJudge } = await import('./judge.mjs');
  const report = await fullJudge(results, { passK });
  const reportPath = join(RESULTS_DIR, `report-${ts}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.error(`✓ 聚合报告 → ${reportPath}`);

  // 控制台摘要
  console.error('\n════════════════════════════════════════════');
  console.error(`lint pass@${passK}: ${report.lintPassRate} (${report.lintPassed}/${report.total})`);
  console.error(`视觉 pass@${passK}: ${report.visualPassRate} (${report.visualPassed}/${report.total})`);
  console.error(`平均轮数: ${report.avgRounds}`);
  console.error('\n按规则聚合失败率:');
  for (const [rule, n] of Object.entries(report.errorsByRule).sort((a, b) => b[1] - a[1])) {
    console.error(`  ${rule}: ${n} 次`);
  }
  console.error('\n按类别 pass 率（lint / 视觉）:');
  for (const [cat, s] of Object.entries(report.byCategory).sort()) {
    const lp = s.total > 0 ? (s.lintPassed / s.total * 100).toFixed(1) : '0';
    const vp = s.total > 0 ? (s.visualPassed / s.total * 100).toFixed(1) : '0';
    console.error(`  ${cat}: lint ${s.lintPassed}/${s.total} (${lp}%) / 视觉 ${s.visualPassed}/${s.total} (${vp}%)`);
  }
  console.error('\n视觉失败明细:');
  for (const v of report.visualFailures.slice(0, 15)) {
    console.error(`  [${v.id}] ${v.category}: ${v.llmReason || ('DOM缺 ' + (v.missing || []).join(','))}`);
  }
  console.error('════════════════════════════════════════════');
}

main().catch(e => { console.error(e); process.exit(2); });
