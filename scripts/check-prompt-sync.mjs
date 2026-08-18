// af-mobile UI —— 提交态 system-prompt.md 与运行时构建结果一致性检查（CI 闸门）
// 防止 prompt 快照过期：开发者改了 whitelist/recipes/CSS 但忘记 npm run prompt 重新生成
// 用法：node scripts/check-prompt-sync.mjs
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COMMITTED = join(ROOT, 'prompt/system-prompt.md');

function main() {
  // 运行时构建（输出到 stdout）
  const res = spawnSync('node', [join(ROOT, 'scripts/build-prompt.mjs')], { encoding: 'utf8' });
  if (res.status !== 0) {
    console.error('✗ build-prompt.mjs 失败：' + (res.stderr || res.stdout));
    process.exit(2);
  }
  const runtime = res.stdout;
  const committed = readFileSync(COMMITTED, 'utf8');

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Prompt 快照一致性检查                           ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`提交态长度：${committed.length} 字符`);
  console.log(`运行时长度：${runtime.length} 字符`);

  // 4 要素存在性检查
  const REQUIRED_SECTIONS = [
    { name: '模式选择决策树', pattern: /# 页面模式.*模式选择决策树/s },
    { name: '数据契约', pattern: /# 数据契约/ },
    { name: 'Few-shot 示例', pattern: /# Few-shot 示例/ },
    { name: '错误恢复', pattern: /# 错误恢复/ },
  ];
  const missingSections = REQUIRED_SECTIONS.filter(s => !s.pattern.test(committed));
  if (missingSections.length) {
    console.log('\n✗ 缺失 4 要素章节：');
    missingSections.forEach(s => console.log(`  - ${s.name}`));
    process.exit(1);
  }
  console.log('\n✓ 4 要素章节齐全（模式决策树/数据契约/Few-shot/错误恢复）');

  if (committed === runtime) {
    console.log('\n✓ 提交态 system-prompt.md 与运行时构建一致');
    process.exit(0);
  }

  // 找第一个差异行，给出可读的修复提示
  const cLines = committed.split('\n');
  const rLines = runtime.split('\n');
  let i = 0;
  while (i < cLines.length && i < rLines.length && cLines[i] === rLines[i]) i++;
  console.log(`\n✗ 不一致（首个差异在第 ${i + 1} 行）：`);
  if (i < cLines.length) console.log(`  提交态：${cLines[i].slice(0, 100)}`);
  if (i < rLines.length) console.log(`  运行时：${rLines[i].slice(0, 100)}`);
  console.log('\n修复：运行 `npm run prompt` 重新生成 system-prompt.md 后提交');
  process.exit(1);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
