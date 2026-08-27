// af-mobile UI —— eval 组件覆盖矩阵（飞轮盲区检测）
// 考不到的组件 = AI 用错了也没人知道；本脚本对齐 eval/prompts.jsonl 考题与 whitelist 组件全集，
// 输出每组件覆盖明细与缺失清单，缺失时 exit 1（可挂 CI）。
// 覆盖判定：一条考题覆盖其 expects/asserts.sel/prompt 文本中出现的全部 af-* 组件。
// 用法：node scripts/eval-coverage.mjs
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAsset } from './resolve-asset.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROMPTS = join(ROOT, 'eval/prompts.jsonl');

const AF_TAG_RE = /af-[a-z-]+/g;

function coveredTags(entry) {
  const tags = new Set();
  for (const m of `${entry.prompt} ${(entry.expects || []).join(' ')} ${(entry.asserts || []).map(a => a.sel).join(' ')}`.matchAll(AF_TAG_RE)) {
    tags.add(m[0]);
  }
  return tags;
}

function main() {
  const wl = JSON.parse(readFileSync(resolveAsset('eslint-plugin-af-mobile/utils/whitelist-v1.json'), 'utf8'));
  const all = new Set(wl.components);
  const entries = readFileSync(PROMPTS, 'utf8')
    .split('\n').filter(l => l.trim()).map(l => JSON.parse(l));

  const byTag = new Map(); // tag -> [考题 id]
  for (const e of entries) {
    for (const t of coveredTags(e)) {
      if (!all.has(t)) continue; // 白名单外（blocks 等）不算矩阵
      if (!byTag.has(t)) byTag.set(t, []);
      byTag.get(t).push(e.id);
    }
  }

  const covered = [...all].filter(t => byTag.has(t));
  const missing = [...all].filter(t => !byTag.has(t));

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Eval 组件覆盖矩阵（prompts.jsonl × whitelist）   ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`考题 ${entries.length} 条 × 组件全集 ${all.size} 个`);
  console.log(`覆盖 ${covered.length}/${all.size}（${Math.round(covered.length / all.size * 100)}%）\n`);

  console.log('── 已覆盖 ──');
  for (const t of covered.sort()) {
    console.log(`  ✓ ${t.padEnd(22)} ← ${byTag.get(t).join(', ')}`);
  }

  if (missing.length) {
    console.log('\n── 零考题（飞轮盲区，AI 用错无人知晓）──');
    for (const t of missing.sort()) console.log(`  ✗ ${t}`);
    console.error(`\n✗ 缺失 ${missing.length} 个组件考题；修复：在 eval/prompts.jsonl 补考题（expects 必须含组件标签）`);
    process.exit(1);
  }

  console.log('\n✓ 全组件覆盖通过');
}

main();
