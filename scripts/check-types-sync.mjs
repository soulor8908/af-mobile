// 校验 d.ts 与源码组件数一致，防手工类型声明漂移
// 双入口三源对齐：
//   主库：src/components/af-*.js 文件数 == src/index.js import Af* 数 == src/index.d.ts export class Af* 数
//   charts 子库：src/charts/components/af-chart-*.js == src/charts/index.js import == src/charts/index.d.ts export class
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];

// 通用三源对齐（fileToClass：af-chart-line.js → AfChartLine）
const fileToClass = (f) => {
  const base = f.replace(/\.js$/, '');
  const parts = base.split('-').slice(1);
  return 'Af' + parts.map(p => p[0].toUpperCase() + p.slice(1)).join('');
};
const importClasses = (code) => [...code.matchAll(/^import\s+\{\s*(Af[A-Za-z]+)\s*\}\s+from/gm)].map(m => m[1]);
const exportClasses = (code) => [...code.matchAll(/^export\s+class\s+(Af[A-Za-z]+)\s+extends/gm)].map(m => m[1]);
const cmp3 = (label, dir, entryJs, entryDts, exclude = []) => {
  const srcFiles = readdirSync(join(root, dir)).filter(f => /^af-.*\.js$/.test(f) && !exclude.includes(f));
  const srcClasses = srcFiles.map(fileToClass);
  const imports = importClasses(readFileSync(join(root, entryJs), 'utf8'));
  const dts = exportClasses(readFileSync(join(root, entryDts), 'utf8'));
  const cmp = (who, arr, ref) => {
    for (const c of ref) if (!arr.includes(c)) problems.push(`[${label}] ${who} 缺失: ${c}`);
  };
  cmp('index.js', imports, srcClasses);
  cmp('index.d.ts', dts, srcClasses);
  cmp('src/components', srcClasses, imports);
  cmp('index.d.ts↔index.js', dts, imports);
  return { srcClasses, imports, dts };
};

// 主库（排除 af-data.js：L3.5 Block 层数据源元素，见 l3.5-block-detailed-design.md）
const main = cmp3('main', 'src/components', 'src/index.js', 'src/index.d.ts', ['af-data.js']);
// charts 子库（Phase 1：line/bar/pie）
const charts = cmp3('charts', 'src/charts/components', 'src/charts/index.js', 'src/charts/index.d.ts');
// chat 子库（af-chat 组件）
const chat = cmp3('chat', 'src/chat/components', 'src/chat/index.js', 'src/chat/index.d.ts');

if (problems.length) {
  console.error('✗ types-sync 失败（d.ts / index.js / src/components 三源不一致）:');
  for (const p of problems) console.error('  - ' + p);
  console.error(`\n  [main]   src/components: ${main.srcClasses.length} (${main.srcClasses.join(', ')})`);
  console.error(`\n  [main]   src/index.js:   ${main.imports.length} (${main.imports.join(', ')})`);
  console.error(`\n  [main]   src/index.d.ts: ${main.dts.length} (${main.dts.join(', ')})`);
  console.error(`  [charts] components:     ${charts.srcClasses.length} (${charts.srcClasses.join(', ')})`);
  console.error(`  [charts] index.js:       ${charts.imports.length} (${charts.imports.join(', ')})`);
  console.error(`  [charts] index.d.ts:     ${charts.dts.length} (${charts.dts.join(', ')})`);
  console.error(`  [chat]   components:     ${chat.srcClasses.length} (${chat.srcClasses.join(', ')})`);
  console.error(`  [chat]   index.js:       ${chat.imports.length} (${chat.imports.join(', ')})`);
  console.error(`  [chat]   index.d.ts:     ${chat.dts.length} (${chat.dts.join(', ')})`);
  process.exit(1);
}
console.log(`✓ types-sync: 三源一致，主库 ${main.srcClasses.length} + charts ${charts.srcClasses.length} + chat ${chat.srcClasses.length} 个组件类`);
