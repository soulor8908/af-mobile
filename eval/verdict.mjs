// eval/verdict.mjs —— 教材增量复合判据（spec §3）
// ① current 在 trap 题上视觉净胜 ≥2 题，或 ② nofewshot 臂错误模式计数比 current 多 ≥3 次 → 增量成立
// 用法：node eval/verdict.mjs eval/results/report-46v-trap-current.json eval/results/report-46v-trap-nofewshot.json
export function compareVerdict(current, base) {
  const trapC = (current.byDifficulty && current.byDifficulty.trap?.visualPassed) || 0;
  const trapB = (base.byDifficulty && base.byDifficulty.trap?.visualPassed) || 0;
  const trapNetWin = trapC - trapB;
  const labels = new Set([...Object.keys(current.errorModes || {}), ...Object.keys(base.errorModes || {})]);
  let modeDiff = 0;
  const modeDetail = {};
  for (const l of labels) {
    const d = (base.errorModes?.[l] || 0) - (current.errorModes?.[l] || 0);
    modeDetail[l] = d;
    if (d > 0) modeDiff += d;
  }
  const reasons = [];
  if (trapNetWin >= 2) reasons.push(`①A类trap净胜${trapNetWin}题≥2`);
  if (modeDiff >= 3) reasons.push(`②错误模式计数差${modeDiff}次≥3`);
  return { trapNetWin, modeDiff, modeDetail, reasons, passed: reasons.length > 0 };
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('eval/verdict.mjs');
if (isMain) {
  const { readFileSync } = await import('node:fs');
  const [cur, base] = process.argv.slice(2);
  if (!cur || !base) { console.error('用法: node eval/verdict.mjs <current> <base>（示例见文件头注释）'); process.exit(2); }
  const v = compareVerdict(JSON.parse(readFileSync(cur, 'utf8')), JSON.parse(readFileSync(base, 'utf8')));
  console.log(JSON.stringify(v, null, 2));
  console.error(v.passed ? `✓ 教材增量成立：${v.reasons.join('；')}` : `✗ 12 题规模下未检出增量（trap 净胜 ${v.trapNetWin}，模式差 ${v.modeDiff}）`);
}
