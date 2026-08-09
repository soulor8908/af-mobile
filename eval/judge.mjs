// AIFlow UI —— 生成 Eval 评估器（judge）
// 输入：run.mjs 收集的 results 数组
// 输出：pass@k、按规则聚合失败率、按类别 pass 率、平均轮数
// export judge 函数供 run.mjs 复用，也可独立调用
//
// 用法（独立调用）：
//   node eval/judge.mjs eval/results/raw-*.json
export function judge(results, opts = {}) {
  const passK = opts.passK || 1;
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const passRate = total > 0 ? (passed / total * 100).toFixed(1) + '%' : '0%';

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

  // 按类别聚合
  const byCategory = {};
  for (const r of results) {
    if (!byCategory[r.category]) byCategory[r.category] = { total: 0, passed: 0 };
    byCategory[r.category].total++;
    if (r.passed) byCategory[r.category].passed++;
  }

  // 失败样本（便于排查）
  const failures = results.filter(r => !r.passed).map(r => ({
    id: r.id,
    category: r.category,
    exitCode: r.best.exitCode,
    errors: r.best.lastErrors || [],
  }));

  return {
    passK,
    total,
    passed,
    passRate,
    avgRounds,
    errorsByRule,
    byCategory,
    failures,
  };
}

// CLI 独立调用
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { readFileSync } = await import('node:fs');
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: judge.mjs <raw-results.json>');
    process.exit(2);
  }
  const results = JSON.parse(readFileSync(file, 'utf8'));
  const report = judge(results);
  console.log(JSON.stringify(report, null, 2));
}
