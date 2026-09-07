// af-mobile UI —— 发布版本号一致性闸门
//
// 为什么需要：版本号是**多份文件各自维护**的（package.json / CHANGELOG.md / 三份
// whitelist-v1.json / mcp Server version），任一处漏改都会静默漂移，且只在发布后
// 才以「消费端装到错版本 / 白名单口径不一致」的形式暴露。
// 另：changesets 若被重复执行（或并发执行），会写出多个版本章节并把版本号推高，
// 表现为「跳号 + CHANGELOG 重复」，产物看起来正常、极难发现 —— 本闸门必须拦住。
//
// 检查项：
//   1. package.json version == CHANGELOG 首个 `## x.y.z`
//   2. CHANGELOG 无重复版本标题
//   3. CHANGELOG 版本严格递减（新版本在最上）
//   4. 三份 whitelist-v1.json 的 af-mobileVersion == package.json version
//   5. mcp Server version == package.json version
//
// 用法：npm run release:check
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION_RE = /^## (\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\s*$/;
const compare = (a, b) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
};

const results = [];
const check = (ok, label, detail = '') => results.push({ ok, label, detail });

// 1~3：CHANGELOG
const changelog = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8');
const headings = changelog.split('\n').map((l) => VERSION_RE.exec(l.trim())).filter(Boolean).map((m) => m[1]);
const version = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

if (!headings.length) {
  check(false, 'CHANGELOG 至少有一个版本章节');
} else {
  check(headings[0] === version, `CHANGELOG 首个版本章节 == package.json version（${version}）`, `CHANGELOG 首个为 ${headings[0]}`);

  const dup = headings.filter((h, i) => headings.indexOf(h) !== i);
  check(dup.length === 0, 'CHANGELOG 无重复版本章节', dup.length ? `重复：${[...new Set(dup)].join(', ')}` : '');

  let mono = true;
  for (let i = 1; i < headings.length; i += 1) {
    if (compare(headings[i - 1], headings[i]) <= 0) { mono = false; break; }
  }
  check(mono, 'CHANGELOG 版本自上而下严格递减');
}

// 4：whitelist 三源版本戳
for (const f of [
  'eslint-plugin-af-mobile/utils/whitelist-v1.json',
  'mcp/assets/whitelist-v1.json',
  'prompt/assets/whitelist-v1.json',
]) {
  const p = join(ROOT, f);
  if (!existsSync(p)) { check(false, `${f} 存在`); continue; }
  // 字段名带连字符，必须括号访问（.af-mobileVersion 会被解析成 .af - mobileVersion）
  const v = JSON.parse(readFileSync(p, 'utf8'))['af-mobileVersion'];
  check(v === version, `${f} af-mobileVersion == ${version}`, `实际 ${v}`);
}

// 5：mcp Server version
const mcp = join(ROOT, 'mcp/index.mjs');
const m = readFileSync(mcp, 'utf8').match(/name:\s*'af-mobile-mcp',\s*version:\s*'([^']+)'/);
check(!!m && m[1] === version, `mcp Server version == ${version}`, m ? `实际 ${m[1]}` : '未找到版本声明');

// 输出
let failed = 0;
for (const r of results) {
  if (r.ok) {
    console.log(`✓ ${r.label}`);
  } else {
    failed += 1;
    console.error(`✗ ${r.label}${r.detail ? ` —— ${r.detail}` : ''}`);
  }
}
console.log('─'.repeat(54));
if (failed) {
  console.error(`✗ 发布版本号一致性检查失败（${failed}/${results.length}）`);
  process.exit(1);
}
console.log(`✓ 发布版本号一致性通过（${results.length}/${results.length}），version = ${version}`);
