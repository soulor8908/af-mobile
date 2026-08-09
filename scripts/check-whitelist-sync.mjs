// AIFlow UI —— L4 §6.2 三源同步检查（CI Step 1）
// 三源：
//   A = 源码扫描（CSS/JS 实际存在的 class/component/token）
//   B = whitelist-v1.json 声明的条目
//   C = 构建后 Prompt 中的白名单（注入结果）
// 双向 diff（D10）：
//   A \ B → 源码有但 whitelist 未登记
//   B \ A → whitelist 有但源码不存在
//   B \ C → whitelist 有但 Prompt 未注入
// 用法：node scripts/check-whitelist-sync.mjs
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildWhitelistFromSources } from './gen-whitelist.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WL_PATH = join(ROOT, 'eslint-plugin-aiflow/utils/whitelist-v1.json');

// 差集：在 A 但不在 B
export function diff(a, b) {
  const bs = new Set(b);
  return a.filter(x => !bs.has(x));
}

// 计算 B \ C：whitelist 条目是否注入到 Prompt
//   class → `class`（带反引号）
//   component → `<tag>`（带反引号和尖括号）
//   token → `--xxx`（带反引号）
export function findMissingInPrompt(B, C) {
  const missing = [];
  for (const c of [...B.classes.recipe, ...B.classes.atomic]) {
    if (!C.includes('`' + c + '`')) {
      missing.push(`class '${c}' 在 whitelist 但 Prompt 未注入`);
    }
  }
  for (const c of B.components) {
    if (!C.includes('`<' + c + '>`')) {
      missing.push(`component '${c}' 在 whitelist 但 Prompt 未注入`);
    }
  }
  for (const t of B.tokens) {
    if (!C.includes('`' + t + '`')) {
      missing.push(`token '${t}' 在 whitelist 但 Prompt 未注入`);
    }
  }
  return missing;
}

// 计算三源同步差异（A↔B + B→C）
// 入参：A（源码扫描）、B（whitelist）、C（Prompt 注入结果字符串）
// 返回：problems 数组（空数组 = 完全同步）
export function computeSyncProblems(A, B, C) {
  const aMinusB = [
    ...diff(A.classes.recipe, B.classes.recipe).map(c => `recipe class '${c}' 在源码但未登记 whitelist`),
    ...diff(A.classes.atomic, B.classes.atomic).map(c => `atomic class '${c}' 在源码但未登记 whitelist`),
    ...diff(A.components, B.components).map(c => `component '${c}' 在源码但未登记 whitelist`),
    ...diff(A.tokens, B.tokens).map(t => `token '${t}' 在源码但未登记 whitelist`),
  ];
  const bMinusA = [
    ...diff(B.classes.recipe, A.classes.recipe).map(c => `recipe class '${c}' 在 whitelist 但源码不存在`),
    ...diff(B.classes.atomic, A.classes.atomic).map(c => `atomic class '${c}' 在 whitelist 但源码不存在`),
    ...diff(B.components, A.components).map(c => `component '${c}' 在 whitelist 但源码不存在`),
    ...diff(B.tokens, A.tokens).map(t => `token '${t}' 在 whitelist 但源码不存在`),
  ];
  const bMinusC = findMissingInPrompt(B, C);
  return [...aMinusB, ...bMinusA, ...bMinusC];
}

// 跑 build-prompt.mjs 拿到 C（注入后的 Prompt 字符串）
export function buildPromptC() {
  const res = spawnSync('node', [join(ROOT, 'scripts/build-prompt.mjs')], { encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error('build-prompt.mjs 失败：' + (res.stderr || res.stdout));
  }
  return res.stdout;
}

function main() {
  const A = buildWhitelistFromSources();
  const B = JSON.parse(readFileSync(WL_PATH, 'utf8'));
  let C;
  try {
    C = buildPromptC();
  } catch (e) {
    console.error('✗ ' + e.message);
    process.exit(2);
  }

  const problems = computeSyncProblems(A, B, C);

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  L4 §6.2 三源同步检查                            ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`A（源码扫描）    recipe ${A.classes.recipe.length} + atomic ${A.classes.atomic.length} = ${A.classes.recipe.length + A.classes.atomic.length} class, ${A.components.length} 组件, ${A.tokens.length} token`);
  console.log(`B（whitelist）   recipe ${B.classes.recipe.length} + atomic ${B.classes.atomic.length} = ${B.classes.recipe.length + B.classes.atomic.length} class, ${B.components.length} 组件, ${B.tokens.length} token`);
  console.log(`C（Prompt 注入） 长度 ${C.length} 字符`);

  const aMinusB = [
    ...diff(A.classes.recipe, B.classes.recipe).map(c => `recipe class '${c}' 在源码但未登记 whitelist`),
    ...diff(A.classes.atomic, B.classes.atomic).map(c => `atomic class '${c}' 在源码但未登记 whitelist`),
    ...diff(A.components, B.components).map(c => `component '${c}' 在源码但未登记 whitelist`),
    ...diff(A.tokens, B.tokens).map(t => `token '${t}' 在源码但未登记 whitelist`),
  ];
  const bMinusA = [
    ...diff(B.classes.recipe, A.classes.recipe).map(c => `recipe class '${c}' 在 whitelist 但源码不存在`),
    ...diff(B.classes.atomic, A.classes.atomic).map(c => `atomic class '${c}' 在 whitelist 但源码不存在`),
    ...diff(B.components, A.components).map(c => `component '${c}' 在 whitelist 但源码不存在`),
    ...diff(B.tokens, A.tokens).map(t => `token '${t}' 在 whitelist 但源码不存在`),
  ];
  const bMinusC = findMissingInPrompt(B, C);

  const report = (label, items) => {
    console.log(`\n── ${label} ──`);
    if (!items.length) { console.log('✓ 通过'); return; }
    for (const x of items) console.log('  ✗ ' + x);
  };

  report('A \\ B（源码有但 whitelist 未登记）', aMinusB);
  report('B \\ A（whitelist 有但源码不存在）', bMinusA);
  report('B \\ C（whitelist 有但 Prompt 未注入）', bMinusC);

  console.log('\n──────────────────────────────────────────────────');
  if (problems.length === 0) {
    console.log('✓ 三源同步通过');
    process.exit(0);
  } else {
    console.log(`✗ ${problems.length} 项不同步`);
    console.log('  修复：');
    console.log('  - A/B 不同步：运行 `npm run whitelist` 重新生成 whitelist-v1.json');
    console.log('  - B/C 不同步：运行 `npm run prompt` 重新构建 system-prompt.md');
    process.exit(1);
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
