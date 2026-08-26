// af-mobile UI —— L3.5 Block A/B 对照实验编排器（复活路径，见 l3.5-block-detailed-design.md 冻结声明）
// 同一 eval 题集跑两臂：
//   A 臂 current = 现行 prompt（L2/L3 自由拼装）
//   B 臂 blocks  = Block 版 prompt（L3.5 优先指引 + Block 表）
// 度量：lint pass@k / 视觉 pass@k / 平均轮数 / 逐题明细
// 用法：
//   AFMOBILE_AI_API_URL=... node eval/ab.mjs                          # 默认题集（001/002/006/011/012）
//   AFMOBILE_AI_API_URL=... node eval/ab.mjs --ids 001,011            # 自定义题集
//   AFMOBILE_AI_API_URL=... node eval/ab.mjs --pass-k 3               # pass@3
//   AFMOBILE_AI_API_URL=... node eval/ab.mjs --variant current        # 只跑单臂（补数据）
// 判定参考（设计文档）：B 臂 pass@k 显著优于 A 臂 → 全面复活 42 Block 计划；否则本层归档
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPrompts, runOne } from './run.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RESULTS_DIR = join(ROOT, 'eval/results');
// 与 5 个高频 Block 映射的题集：商品列表(product-grid)/订单列表(order-list)/收藏两列网格(product-grid)/登录(auth-form)/注册(auth-form)
const DEFAULT_IDS = ['001', '002', '006', '011', '012'];

async function runArm(variant, prompts, passK) {
  const promptMode = variant === 'blocks' ? 'blocks' : 'tailored';
  const results = [];
  for (const item of prompts) {
    process.stderr.write(`  [${variant}/${item.id}] ${item.category} ... `);
    const r = await runOne(item, passK, promptMode, variant);
    results.push(r);
    process.stderr.write(r.passed ? `✓ (${r.best.rounds} 轮)\n` : `✗ (${r.best.exitCode})\n`);
  }
  const { fullJudge } = await import('./judge.mjs');
  const report = await fullJudge(results, { passK });
  report.variant = variant;
  return report;
}

function pct(n, total) { return total > 0 ? (n / total * 100).toFixed(1) + '%' : '0%'; }

async function main() {
  const args = process.argv.slice(2);
  let ids = DEFAULT_IDS;
  let passK = 1;
  let only = ''; // 只跑单臂：current | blocks
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--ids') ids = args[++i].split(',').filter(Boolean);
    else if (args[i] === '--pass-k') passK = parseInt(args[++i]);
    else if (args[i] === '--variant') only = args[++i] === 'blocks' ? 'blocks' : 'current';
  }

  if (!process.env.AFMOBILE_AI_API_URL) {
    console.error('✗ 未配置 AFMOBILE_AI_API_URL，无法运行 A/B 实验');
    console.error('  配置后运行：AFMOBILE_AI_API_URL=... node eval/ab.mjs');
    process.exit(2);
  }

  const all = loadPrompts();
  const prompts = all.filter(p => ids.includes(p.id));
  if (!prompts.length) {
    console.error(`✗ 题集为空（--ids ${ids.join(',')} 在 prompts.jsonl 中无匹配）`);
    process.exit(2);
  }
  mkdirSync(RESULTS_DIR, { recursive: true });

  const arms = {};
  const variants = only ? [only] : ['current', 'blocks'];
  for (const v of variants) {
    console.error(`▶ A/B 实验臂 [${v}]：${prompts.length} 题，pass@${passK}`);
    arms[v] = await runArm(v, prompts, passK);
  }

  // 逐题对照明细（visualResults 含 domPass/missing）
  const detailRows = prompts.map((p) => {
    const row = { id: p.id, category: p.category };
    for (const [v, rep] of Object.entries(arms)) {
      const vr = (rep.visualResults || []).find(x => x.id === p.id);
      row[v] = vr ? { visual: vr.passed, domPass: vr.domPass, missing: vr.missing } : { visual: null };
    }
    return row;
  });

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const out = {
    ts, passK, ids: prompts.map(p => p.id),
    arms: Object.fromEntries(Object.entries(arms).map(([v, r]) => [v, {
      lintPassRate: r.lintPassRate, lintPassed: r.lintPassed, visualPassRate: r.visualPassRate,
      visualPassed: r.visualPassed, total: r.total, avgRounds: r.avgRounds, errorsByRule: r.errorsByRule,
    }])),
    detail: detailRows,
  };
  const outPath = join(RESULTS_DIR, `ab-${ts}.json`);
  writeFileSync(outPath, JSON.stringify(out, null, 2));

  console.error('\n════════════ A/B 对照结果 ════════════');
  for (const [v, r] of Object.entries(arms)) {
    console.error(`[${v}] lint pass@${passK}: ${r.lintPassed}/${r.total} (${r.lintPassRate}) | 视觉: ${r.visualPassed}/${r.total} (${r.visualPassRate}) | 平均轮数: ${r.avgRounds}`);
  }
  if (arms.current && arms.blocks) {
    const dl = arms.blocks.lintPassed - arms.current.lintPassed;
    const dv = arms.blocks.visualPassed - arms.current.visualPassed;
    console.error(`\nΔ lint pass: ${dl >= 0 ? '+' : ''}${dl} 题 | Δ 视觉 pass: ${dv >= 0 ? '+' : ''}${dv} 题（共 ${arms.current.total} 题）`);
    console.error('判定参考：Δ 显著为正 → 按 l3.5 设计文档考虑复活 42 Block；无优势/为负 → 本层维持归档');
  }
  console.error('\n逐题明细（visual pass）：');
  for (const d of detailRows) {
    const c = d.current ? (d.current.visual ? '✓' : `✗ ${((d.current.missing || []).join(',') || 'LLM')}`) : '-';
    const b = d.blocks ? (d.blocks.visual ? '✓' : `✗ ${((d.blocks.missing || []).join(',') || 'LLM')}`) : '-';
    console.error(`  [${d.id}] ${d.category}: current ${c} | blocks ${b}`);
  }
  console.error(`\n✓ 完整结果 → ${outPath}`);
  console.error('═══════════════════════════════════════');
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch(e => { console.error(e); process.exit(2); });
