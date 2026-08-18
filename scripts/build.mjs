#!/usr/bin/env node
// af-mobile UI —— 构建脚本：生成 dist/ 产物
// 产物：
//   dist/index.js         ESM bundle（全量组件，Tree Shaking 友好的源码已支持，此处给个全量 bundle 入口）
//   dist/index.css        全量 CSS（tokens+recipes+atomic，@import 内联）
//   dist/index.d.ts       类型声明（复制 src/index.d.ts）
// 铁律：不生成 UMD 产物（组件一律按需引入，禁止 CDN/unpkg 直引）
import { build, transform } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');

// 确保 dist 目录存在
mkdirSync(DIST, { recursive: true });

console.log('╔══════════════════════════════════════════════╗');
console.log('║     af-mobile UI —— 构建 dist 产物             ║');
console.log('╚══════════════════════════════════════════════╝\n');

// ---------- 1. dist/index.js（ESM bundle） ----------
// 源码 src/index.js 已是 ESM 命名导出，直接 bundle 一次生成单文件产物
// 保留 import.meta（不兼容 ES5），format=esm
await build({
  entryPoints: [join(SRC, 'index.js')],
  bundle: true,
  outfile: join(DIST, 'index.js'),
  format: 'esm',
  platform: 'browser',
  target: ['es2020'],
  legalComments: 'none',
  sourcemap: false,
  minify: true, // 生产产物压缩；ESM minify 不影响打包器 Tree Shaking
  keepNames: true, // 保留类原始 name（调试友好；注册走 REGISTRY 字面量，不依赖类名）
  absWorkingDir: ROOT,
});
console.log('✓ dist/index.js (ESM bundle)');

// 注：不再生成 dist/af-mobile.umd.js（UMD = 全局引入，违反按需引入铁律，已移除）

// ---------- 2. dist/index.css（内联 @import 的全量 CSS） ----------
// 把 tokens.css + recipes.css + atomic.css 拼接内联为单文件
const cssFiles = ['tokens.css', 'recipes.css', 'atomic.css'];
let cssConcat = '/* af-mobile UI —— dist/index.css（构建产物，勿手改。源码见 src/*.css） */\n';
for (const f of cssFiles) {
  const content = readFileSync(join(SRC, f), 'utf8');
  // 去掉 @import（已内联）与文件头注释（保留 @layer）
  const cleaned = content.replace(/@import\s+['"][^'"]+['"]\s*;?\s*/g, '');
  cssConcat += cleaned + '\n';
}
const { code: cssMin } = await transform(cssConcat, { loader: 'css', minify: true, target: ['es2020'] });
writeFileSync(join(DIST, 'index.css'), cssMin);
console.log('✓ dist/index.css (CSS inlined + minified)');

// ---------- 3.5 dist/components.css（Shadow DOM 组件外部样式，CSP 外部模式使用） ----------
// 提取 Shadow DOM 组件的 const CSS 模板字符串，拼接为单文件
// 用法：设置 AfElement.cssMode='external' + cssBaseUrl 指向此文件
const shadowComponents = ['af-picker', 'af-swiper', 'af-calendar', 'af-dialog'];
let compCssConcat = '/* af-mobile UI —— dist/components.css（Shadow DOM 组件样式，CSP 外部模式使用） */\n';
for (const name of shadowComponents) {
  const code = readFileSync(join(SRC, 'components', `${name}.js`), 'utf8');
  const m = code.match(/const CSS = `([\s\S]*?)`;/);
  if (m) compCssConcat += `/* ${name} */\n${m[1]}\n`;
}
const { code: compCssMin } = await transform(compCssConcat, { loader: 'css', minify: true, target: ['es2020'] });
writeFileSync(join(DIST, 'components.css'), compCssMin);
console.log('✓ dist/components.css (Shadow component CSS, CSP external mode)');

// ---------- 4. dist/index.d.ts（类型声明复制） ----------
copyFileSync(join(SRC, 'index.d.ts'), join(DIST, 'index.d.ts'));
console.log('✓ dist/index.d.ts (types)');

console.log('\n──────────────────────────────────────────────');
console.log('✓ 构建完成：dist/index.js, dist/index.css, dist/index.d.ts');
