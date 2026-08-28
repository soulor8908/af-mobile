#!/usr/bin/env node
// af-mobile —— registry 契约闸门
// 用法：node scripts/check-registry.mjs
// 防再犯：教材/lint/白名单教的是 1.7.0 的语言，而 registry latest 停在 1.5.2 ——
// 消费端装到旧包，AI 生成的代码引用不存在的 class（静默失败，CI 全绿产品坏）。
// 检查项：1) whitelist-v1.json 声明的 af-mobileVersion 必须 == registry 上 ui 的 latest
//         2) create-af-mobile（脚手架入口）的 ui 依赖必须命中 registry 上存在的版本区间
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const npmView = (pkg, field = 'version') => {
  try {
    return execSync(`npm view ${pkg} ${field}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null; // E404（包从未发布）或离线
  }
};

let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

const wl = read('prompt/assets/whitelist-v1.json');
const declared = wl['af-mobileVersion'];
const uiLatest = npmView('@af-mobile/ui');

if (uiLatest === null) {
  check('registry 可达', false, 'npm view 失败（离线时也无法 publish，视为闸门失败）');
} else {
  check(`白名单契约：af-mobileVersion(${declared}) == registry latest(${uiLatest})`, declared === uiLatest,
    declared === uiLatest ? '' : '白名单声明的版本未发布——先发布 ui，或回退白名单版本号（否则消费端按不存在的能力生成代码）');

  // 脚手架依赖检查：create-af-mobile 的 ui 依赖区间必须包含 registry latest
  const create = read('create-af-mobile/package.json');
  const range = (create.dependencies || {})['@af-mobile/ui'];
  if (range && range.startsWith('^')) {
    const [r1, r2] = range.slice(1).split('.').map(Number);
    const [l1, l2] = uiLatest.split('.').map(Number);
    const covers = l1 === r1 && l2 >= r2;
    check(`脚手架依赖：create-af-mobile 的 @af-mobile/ui@${range} 覆盖 registry latest(${uiLatest})`, covers,
      covers ? '' : 'npm create af-mobile 会装到白名单不覆盖的旧版——需 bump create-af-mobile 并发布');
  }
}

console.log(failed === 0 ? '\n✓ registry 契约通过' : `\n✗ ${failed} 项失败`);
process.exit(failed === 0 ? 0 : 1);
