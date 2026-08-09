#!/usr/bin/env node
// AIFlow UI —— 构建脚本：生成 dist/ 产物
// 产物：
//   dist/index.js         ESM bundle（全量组件，Tree Shaking 友好的源码已支持，此处给个全量 bundle 入口）
//   dist/aiflow-ui.umd.js UMD bundle（CDN/unpkg 直引，含全部组件 + 自动注册）
//   dist/index.css        全量 CSS（tokens+recipes+atomic，@import 内联）
//   dist/index.d.ts       类型声明（复制 src/index.d.ts）
import { build, transform } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');

// 确保 dist 目录存在
mkdirSync(DIST, { recursive: true });

console.log('╔══════════════════════════════════════════════╗');
console.log('║     AIFlow UI —— 构建 dist 产物             ║');
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
  absWorkingDir: ROOT,
});
console.log('✓ dist/index.js (ESM bundle)');

// ---------- 2. dist/aiflow-ui.umd.js（IIFE bundle，自动注册全组件） ----------
// 命名 UMD 沿用历史习惯（unpkg/jsdelivr 字段指向此文件）；实为 IIFE（esbuild 无 UMD，IIFE 足够 CDN 直引场景）
// 入口：bundle 全部组件并自动调用 registerAll()
const umdEntryCode = `
import { registerAll } from '${join(SRC, 'index.js').replace(/\\/g, '/')}';
if (typeof window !== 'undefined') {
  registerAll();
}
`;
const umdEntryPath = join(DIST, '_umd-entry.js');
writeFileSync(umdEntryPath, umdEntryCode);
await build({
  entryPoints: [umdEntryPath],
  bundle: true,
  outfile: join(DIST, 'aiflow-ui.umd.js'),
  format: 'iife',
  globalName: 'AiflowUI',
  platform: 'browser',
  target: ['es2020'],
  legalComments: 'none',
  sourcemap: false,
  minify: true,
  absWorkingDir: ROOT,
});
console.log('✓ dist/aiflow-ui.umd.js (UMD, auto-register)');

// ---------- 3. dist/index.css（内联 @import 的全量 CSS） ----------
// 把 tokens.css + recipes.css + atomic.css 拼接内联为单文件
const cssFiles = ['tokens.css', 'recipes.css', 'atomic.css'];
let cssConcat = '/* AIFlow UI —— dist/index.css（构建产物，勿手改。源码见 src/*.css） */\n';
for (const f of cssFiles) {
  const content = readFileSync(join(SRC, f), 'utf8');
  // 去掉 @import（已内联）与文件头注释（保留 @layer）
  const cleaned = content.replace(/@import\s+['"][^'"]+['"]\s*;?\s*/g, '');
  cssConcat += cleaned + '\n';
}
const { code: cssMin } = await transform(cssConcat, { loader: 'css', minify: true, target: ['es2020'] });
writeFileSync(join(DIST, 'index.css'), cssMin);
console.log('✓ dist/index.css (CSS inlined + minified)');

// ---------- 4. dist/index.d.ts（类型声明复制） ----------
copyFileSync(join(SRC, 'index.d.ts'), join(DIST, 'index.d.ts'));
console.log('✓ dist/index.d.ts (types)');

// 清理临时 UMD 入口
import('node:fs').then(({ rmSync }) => {
  if (existsSync(umdEntryPath)) rmSync(umdEntryPath);
});

console.log('\n──────────────────────────────────────────────');
console.log('✓ 构建完成：dist/index.js, dist/aiflow-ui.umd.js, dist/index.css, dist/index.d.ts');
