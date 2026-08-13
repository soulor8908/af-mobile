// 校验 d.ts 与源码组件数一致，防手工类型声明漂移
// 三源对齐：src/components/af-*.js 文件数 == src/index.js import Af* 数 == src/index.d.ts export class Af* 数
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];

// A. 源码组件文件
// 排除 af-data.js：L3.5 Block 层数据源元素（见 l3.5-block-detailed-design.md），
// 非 L3 的 20 个注册组件之一，不参与 index.js/index.d.ts 三源对齐（由 aiflow-ui/page 子包生态独立消费）
const srcFiles = readdirSync(join(root, 'src/components'))
  .filter(f => /^af-.*\.js$/.test(f) && f !== 'af-data.js');
const srcClasses = srcFiles.map(f => {
  const base = f.replace(/\.js$/, '');           // af-list
  const parts = base.split('-').slice(1);         // ['list']
  return 'Af' + parts.map(p => p[0].toUpperCase() + p.slice(1)).join(''); // AfList
});

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
cmp('src/components', srcClasses, indexImports);

if (problems.length) {
  console.error('✗ types-sync 失败（d.ts / index.js / src/components 三源不一致）:');
  for (const p of problems) console.error('  - ' + p);
  console.error(`\n  src/components: ${srcClasses.length} (${srcClasses.join(', ')})`);
  console.error(`  src/index.js:   ${indexImports.length} (${indexImports.join(', ')})`);
  console.error(`  src/index.d.ts: ${dtsClasses.length} (${dtsClasses.join(', ')})`);
  process.exit(1);
}
console.log(`✓ types-sync: 三源一致，${srcClasses.length} 个组件类`);
