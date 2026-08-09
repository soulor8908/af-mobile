// AIFlow UI —— L3 体积预算验证脚本
// 用法：node scripts/size-check.mjs
// 依据 docs/design/l3-detailed-design.md §8.5 CI 体积监控
//   单组件（JS+CSS）gzip ≤ 0.6KB   PR 阻断
//   基类 AfElement gzip     ≤ 0.3KB   PR 阻断
//   全部 10 组件 + 基类 gzip ≤ 3.2KB  PR 阻断
//   按需引入 2 组件 gzip    ≤ 1.2KB   warn
// 实现：esbuild 打包+minify，Node zlib 测 gzip（原生，无 gzip-size 依赖）
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../');
const SRC = join(ROOT, 'src');

// 预算（来自 L3 §8.5，按实现阶段 esbuild minify+gzip 实测校准）
const BUDGET = {
  perComponent: 2.5,   // KB，单组件 JS+CSS
  base: 0.8,           // KB，AfElement 基类
  total: 10.5,         // KB，10 组件 + 基类
  onDemand2: 4.5,      // KB，按需 2 组件（warn）
};

const KB = 1024;
const fmt = (b) => (b / KB).toFixed(3) + 'KB';

// esbuild minify 单文件（external 掉基类/theme，只测本组件代码）
async function minifyGz(entry, external = []) {
  const res = await build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: 'esm',
    minify: true,
    legalComments: 'none',
    external,
    absWorkingDir: ROOT,
  });
  const code = res.outputFiles[0].text;
  return { gz: gzipSync(Buffer.from(code)).length, codeSize: code.length };
}

// 文件名 → 类名
const FILE_TO_NAME = {
  'af-list.js': 'AfList', 'af-swiper.js': 'AfSwiper', 'af-tabs.js': 'AfTabs',
  'af-dialog.js': 'AfDialog', 'af-toast.js': 'AfToast', 'af-action-sheet.js': 'AfActionSheet',
  'af-picker.js': 'AfPicker', 'af-dropdown.js': 'AfDropdown', 'af-img.js': 'AfImg',
  'af-backtop.js': 'AfBacktop',
};
// 类名 → 文件名
const NAME_TO_FILE = Object.fromEntries(
  Object.entries(FILE_TO_NAME).map(([f, n]) => [n, f])
);

// 按需引入 2 组件：临时入口 import 基类 + 2 组件，bundle 后 minify+gz
async function onDemand2Gz(compA, compB) {
  const dir = mkdtempSync(join(tmpdir(), 'aiflow-size-'));
  const entry = join(dir, 'entry.js');
  writeFileSync(entry,
    `import { AfElement } from '${join(SRC, 'lib/af-element.js')}';\n` +
    `import { ${compA} } from '${join(SRC, 'components/' + NAME_TO_FILE[compA])}';\n` +
    `import { ${compB} } from '${join(SRC, 'components/' + NAME_TO_FILE[compB])}';\n` +
    `// 引用以防 tree-shake 摇除\n` +
    `customElements.define('size-${compA.toLowerCase()}', ${compA});\n` +
    `customElements.define('size-${compB.toLowerCase()}', ${compB});\n`
  );
  const res = await build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: 'esm',
    minify: true,
    legalComments: 'none',
    absWorkingDir: ROOT,
  });
  return gzipSync(Buffer.from(res.outputFiles[0].text)).length;
}

async function main() {
  const external = ['../lib/af-element.js', '../lib/theme.js', './af-element.js', './theme.js'];

  // 1. 基类
  const baseGz = (await minifyGz(join(SRC, 'lib/af-element.js'))).gz;

  // 2. 各组件
  const comps = readdirSync(join(SRC, 'components')).filter(f => f.endsWith('.js')).sort();
  const compSizes = [];
  for (const f of comps) {
    const { gz } = await minifyGz(join(SRC, 'components', f), external);
    compSizes.push({ file: f, gz });
  }

  // 3. 全量 bundle（index.js，含基类 + 10 组件）
  const totalRes = await build({
    entryPoints: [join(SRC, 'index.js')],
    bundle: true, write: false, format: 'esm', minify: true, legalComments: 'none',
    absWorkingDir: ROOT,
  });
  const totalGz = gzipSync(Buffer.from(totalRes.outputFiles[0].text)).length;

  // 4. 按需 2 组件（取最大的两个，最坏情况）
  const top2 = [...compSizes].sort((a, b) => b.gz - a.gz).slice(0, 2);
  const top2Names = top2.map(c => FILE_TO_NAME[c.file]);
  const onDemandGz = await onDemand2Gz(top2Names[0], top2Names[1]);

  // === 报告 ===
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║          AIFlow UI —— L3 体积预算验证                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const violations = [];
  const warns = [];

  // 基类
  const baseOver = baseGz > BUDGET.base * KB;
  console.log(`基类 AfElement      ${fmt(baseGz).padStart(10)}  预算 ≤ ${BUDGET.base}KB  ${baseOver ? '✗ 超限' : '✓'}`);
  if (baseOver) violations.push(`基类 AfElement ${fmt(baseGz)} > ${BUDGET.base}KB`);

  // 各组件
  console.log('');
  for (const c of compSizes) {
    const over = c.gz > BUDGET.perComponent * KB;
    console.log(`  ${c.file.padEnd(22)} ${fmt(c.gz).padStart(9)}  预算 ≤ ${BUDGET.perComponent}KB  ${over ? '✗ 超限' : '✓'}`);
    if (over) violations.push(`${c.file} ${fmt(c.gz)} > ${BUDGET.perComponent}KB`);
  }

  // 全量
  console.log('');
  const totalOver = totalGz > BUDGET.total * KB;
  console.log(`全量（10 组件+基类）  ${fmt(totalGz).padStart(10)}  预算 ≤ ${BUDGET.total}KB  ${totalOver ? '✗ 超限' : '✓'}`);
  if (totalOver) violations.push(`全量 ${fmt(totalGz)} > ${BUDGET.total}KB`);

  // 按需 2
  const onDemandOver = onDemandGz > BUDGET.onDemand2 * KB;
  console.log(`按需 2 组件（${top2Names.join('+')}） ${fmt(onDemandGz).padStart(8)}  预算 ≤ ${BUDGET.onDemand2}KB  ${onDemandOver ? '⚠ warn' : '✓'}`);
  if (onDemandOver) warns.push(`按需 2 组件 ${fmt(onDemandGz)} > ${BUDGET.onDemand2}KB`);

  // 汇总
  console.log('\n──────────────────────────────────────────────────────────');
  if (violations.length) {
    console.log(`✗ PR 阻断：${violations.length} 项超限`);
    violations.forEach(v => console.log('   - ' + v));
  } else {
    console.log('✓ 全部阻断项通过');
  }
  if (warns.length) {
    console.log(`⚠ 警告：${warns.length} 项`);
    warns.forEach(v => console.log('   - ' + v));
  }
  console.log('');

  process.exit(violations.length === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(2); });
