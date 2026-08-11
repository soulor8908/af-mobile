// 校验 d.ts 与源码组件数一致，防手工类型声明漂移
// 四源对齐：src/components/af-*.js + src/blocks/af-*.js == src/index.js import Af* 数 == src/index.d.ts export class Af* 数
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];

// A. 源码组件文件（L3 组件 + L3.5 Block）
const fileToClass = (f) => {
  const base = f.replace(/\.js$/, '');           // af-list
  const parts = base.split('-').slice(1);         // ['list']
  return 'Af' + parts.map(p => p[0].toUpperCase() + p.slice(1)).join(''); // AfList
};
const componentFiles = readdirSync(join(root, 'src/components')).filter(f => /^af-.*\.js$/.test(f));
const srcClasses = componentFiles.map(fileToClass);
const blocksDir = join(root, 'src/blocks');
if (existsSync(blocksDir)) {
  const blockFiles = readdirSync(blocksDir).filter(f => /^af-.*\.js$/.test(f));
  srcClasses.push(...blockFiles.map(fileToClass));
}

// B. src/index.js import 的组件类名
const indexJs = readFileSync(join(root, 'src/index.js'), 'utf8');
const indexImports = [...indexJs.matchAll(/^import\s+\{\s*(Af[A-Za-z]+)\s*\}\s+from/gm)]
  .map(m => m[1]);

// C. src/index.d.ts export class 的组件类名
const dts = readFileSync(join(root, 'src/index.d.ts'), 'utf8');
const dtsClasses = [...dts.matchAll(/^export\s+class\s+(Af[A-Za-z]+)\s+extends/gm)]
  .map(m => m[1]);

// 比对
const cmp = (label, arr, ref) => {
  for (const c of ref) if (!arr.includes(c)) problems.push(`${label} 缺失: ${c}`);
};
cmp('src/index.js', indexImports, srcClasses);
cmp('src/index.d.ts', dtsClasses, srcClasses);
cmp('src/components+blocks', srcClasses, indexImports);

if (problems.length) {
  console.error('✗ types-sync 失败（d.ts / index.js / src/components+blocks 四源不一致）:');
  for (const p of problems) console.error('  - ' + p);
  console.error(`\n  src/components+blocks: ${srcClasses.length} (${srcClasses.join(', ')})`);
  console.error(`  src/index.js:          ${indexImports.length} (${indexImports.join(', ')})`);
  console.error(`  src/index.d.ts:        ${dtsClasses.length} (${dtsClasses.join(', ')})`);
  process.exit(1);
}
console.log(`✓ types-sync: 四源一致，${srcClasses.length} 个组件/Block 类`);

