#!/usr/bin/env node
// AIFlow UI —— 发布前检查脚本
// 用法：node scripts/publish-check.mjs
// 检查项：1. npm pack 内容 2. Tree Shaking 效果 3. whitelist 同步 4. 体积预算
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../');
const SRC = join(ROOT, 'src');
const KB = 1024;
const fmt = (b) => (b / KB).toFixed(3) + 'KB';

let passed = 0, failed = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
  ok ? passed++ : failed++;
}

console.log('\n╔══════════════════════════════════════════════╗');
console.log('║     AIFlow UI —— 发布前检查                 ║');
console.log('╚══════════════════════════════════════════════╝\n');

// 1. npm pack 内容检查
console.log('── 1. npm pack 内容 ──');
const packFiles = execSync('npm pack --dry-run 2>&1', { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .filter(l => l.includes('src/') || l.includes('eslint-plugin'));
check('npm pack 包含 src/', packFiles.some(l => l.includes('src/')), `${packFiles.length} 个文件`);

// 2. Tree Shaking 效果验证
console.log('\n── 2. Tree Shaking 验证 ──');
async function treeShakeCheck() {
  const dir = join(ROOT, 'node_modules/.cache/publish-check');
  const entry = join(dir, 'entry.js');
  // Windows 下 join 返回反斜杠，嵌入 JS 字符串会被当转义字符吞掉，统一转成正斜杠
  const toPosix = (p) => p.replace(/\\/g, '/');
  // 只引入 2 个组件，验证未引入的组件被摇除
  const entryCode = `
    import { AfDialog, AfToast } from '${toPosix(join(SRC, 'index.js'))}';
    customElements.define('test-dialog', AfDialog);
    customElements.define('test-toast', AfToast);
  `;
  const { mkdirSync, writeFileSync } = await import('node:fs');
  mkdirSync(dir, { recursive: true });
  writeFileSync(entry, entryCode);
  const res = await build({
    entryPoints: [entry],
    bundle: true, write: false, format: 'esm', minify: true,
    legalComments: 'none', absWorkingDir: ROOT,
  });
  const code = res.outputFiles[0].text;
  const gz = gzipSync(Buffer.from(code)).length;
  // 检查未引入的组件是否被摇除
  const allComps = readdirSync(join(SRC, 'components')).map(f => f.replace('.js', ''));
  const included = allComps.filter(c => code.includes(c.replace('af-', 'Af').replace(/-(\w)/g, (_, c) => c.toUpperCase())));
  const excluded = allComps.filter(c => !included.includes(c));
  check('Tree Shaking 摇除未引入组件', excluded.length >= 7, `${excluded.length}/${allComps.length} 个被摇除`);
  check('按需 2 组件体积', gz < 4.5 * KB, fmt(gz));
}

// 3. whitelist 同步检查
console.log('\n── 3. whitelist 同步 ──');
function whitelistCheck() {
  const before = readFileSync(join(ROOT, 'eslint-plugin-aiflow/utils/whitelist-v1.json'), 'utf8');
  execSync('node scripts/gen-whitelist.mjs', { cwd: ROOT });
  const after = readFileSync(join(ROOT, 'eslint-plugin-aiflow/utils/whitelist-v1.json'), 'utf8');
  check('whitelist 与源码同步', before === after);
}

// 4. sideEffects 检查
console.log('\n── 4. package.json 配置 ──');
function pkgCheck() {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  check('sideEffects: false', pkg.sideEffects === false);
  check('type: module', pkg.type === 'module');
  check('exports 配置存在', !!pkg.exports);
  check('files 含 dist/', Array.isArray(pkg.files) && pkg.files.includes('dist'));
  check('unpkg 指向 UMD', pkg.unpkg && pkg.unpkg.includes('umd'));
}

// 5. dist 产物检查（prepublishOnly 会先跑 build，此处验证产物存在）
console.log('\n── 5. dist 产物 ──');
function distCheck() {
  const distFiles = ['dist/index.js', 'dist/aiflow-ui.umd.js', 'dist/index.css', 'dist/index.d.ts'];
  for (const f of distFiles) {
    const p = join(ROOT, f);
    const exists = existsSync(p);
    const size = exists ? statSync(p).size : 0;
    check(`dist/${f.split('/').pop()}`, exists, exists ? fmt(size) : '缺失');
  }
}

// 执行
await treeShakeCheck();
whitelistCheck();
pkgCheck();
distCheck();

// 汇总
console.log('\n──────────────────────────────────────────────');
console.log(`结果：${passed} 通过，${failed} 失败`);
process.exit(failed === 0 ? 0 : 1);
