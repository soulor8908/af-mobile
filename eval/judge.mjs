// AIFlow UI —— 生成 Eval 评估器（judge）
// 输入：run.mjs 收集的 results 数组（每条含 expects + best.codePath）
// 输出：lint pass@k + 视觉 pass@k（DOM 断言）+ 按规则聚合失败率 + 按类别 pass 率
// export judge 函数供 run.mjs 复用，也可独立调用
//
// 视觉 pass（轻量路径）：用 jsdom 渲染生成 HTML，对 expects 中的 selector 做 querySelector 断言
// 把"lint pass"与"视觉 pass"分开报告，避免把合规当正确
//
// 用法（独立调用）：
//   node eval/judge.mjs eval/results/raw-*.json
import { readFileSync, existsSync } from 'node:fs';
import { JSDOM } from 'jsdom';

// DOM 断言：渲染 HTML，检查 expects 中的 selector 是否都存在
// 返回 { passed, missing }
function domAssert(html, expects) {
  if (!html || !expects || !expects.length) return { passed: false, missing: ['(无 expects 或无 HTML)'] };
  try {
    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    const doc = dom.window.document;
    const missing = expects.filter(sel => !doc.querySelector(sel));
    return { passed: missing.length === 0, missing };
  } catch (e) {
    return { passed: false, missing: [`(渲染失败: ${e.message})`] };
  }
}

export function judge(results, opts = {}) {
  const passK = opts.passK || 1;
  const total = results.length;
  const lintPassed = results.filter(r => r.passed).length;
  const lintPassRate = total > 0 ? (lintPassed / total * 100).toFixed(1) + '%' : '0%';

  // 视觉 pass：对成功样本（lint 通过）做 DOM 断言
  let visualPassed = 0;
  const visualFailures = [];
  const categoryVisual = {}; // 临时记录每类视觉 pass 数
  for (const r of results) {
    if (!r.passed) continue; // lint 没过的样本不评估视觉
    const best = r.best;
    let html = '';
    if (best && best.codePath && existsSync(best.codePath)) {
      html = readFileSync(best.codePath, 'utf8');
    }
    const dom = domAssert(html, r.expects);
    if (dom.passed) {
      visualPassed++;
      categoryVisual[r.category] = (categoryVisual[r.category] || 0) + 1;
    } else {
      visualFailures.push({ id: r.id, category: r.category, missing: dom.missing });
    }
  }
  const visualPassRate = total > 0 ? (visualPassed / total * 100).toFixed(1) + '%' : '0%';

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

  // 按类别聚合（lint + 视觉）
  const byCategory = {};
  for (const r of results) {
    if (!byCategory[r.category]) byCategory[r.category] = { total: 0, lintPassed: 0, visualPassed: 0 };
    byCategory[r.category].total++;
    if (r.passed) byCategory[r.category].lintPassed++;
  }
  for (const [cat, n] of Object.entries(categoryVisual)) {
    if (byCategory[cat]) byCategory[cat].visualPassed = n;
  }

  // 失败样本（lint 失败 + 视觉失败，便于排查）
  const lintFailures = results.filter(r => !r.passed).map(r => ({
    id: r.id, category: r.category, exitCode: r.best.exitCode, errors: r.best.lastErrors || [],
  }));

  return {
    passK,
    total,
    lintPassed,
    lintPassRate,
    visualPassed,
    visualPassRate,
    avgRounds,
    errorsByRule,
    byCategory,
    lintFailures,
    visualFailures,
  };
}

// CLI 独立调用
const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: judge.mjs <raw-results.json>');
    process.exit(2);
  }
  const results = JSON.parse(readFileSync(file, 'utf8'));
  const report = judge(results);
  console.log(JSON.stringify(report, null, 2));
}
