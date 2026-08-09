#!/usr/bin/env node
// AIFlow UI —— 构建产物脚本
// 用法：node scripts/build.mjs
// 产物：
//   dist/index.js           ESM minified（CDN <script type="module">、Node ESM）
//   dist/aiflow-ui.umd.js   UMD minified（<script> 经典 + 全局 window.AiflowUI）
//   dist/index.css          L1+L2 CSS minified（tokens+recipes+atomic）
//   dist/index.d.ts         类型声明（从 src 复制）
// 设计要点：
//   - src/ 仍作为 bundler 主入口（Tree Shaking 友好，package.json exports.import 指向 src）
//   - dist/ 仅服务两类用户：CDN 直引 / 无 bundler 环境
//   - 不拆分单组件 dist：Tree Shaking 走 src 命名导出，无需 dist 多入口
import { build } from 'esbuild';
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');
const KB = 1024;
const fmt = (b) => (b / KB).toFixed(3) + 'KB';

console.log('\n╔══════════════════════════════════════════════╗');
console.log('║     AIFlow UI —— 构建 dist 产物              ║');
console.log('╚══════════════════════════════════════════════╝\n');

mkdirSync(DIST, { recursive: true });

// ── 1. ESM minified bundle ──
// 不拆分 chunk：13 组件 + 基类合计 ~14KB gzip，全量打包体积可控
// 保留命名导出（format: esm），UMD 单独构建给经典脚本用
console.log('── 1. ESM bundle (dist/index.js) ──');
const esmRes = await build({
  entryPoints: [join(SRC, 'index.js')],
  bundle: true,
  write: false,
  format: 'esm',
  minify: true,
  legalComments: 'none',
  sourcemap: false,
  target: ['es2020'],
  absWorkingDir: ROOT,
});
const esmCode = esmRes.outputFiles[0].text;
writeFileSync(join(DIST, 'index.js'), esmCode);
const esmGz = gzipSync(Buffer.from(esmCode)).length;
console.log(`  ✓ dist/index.js  ${fmt(esmCode.length)}  (gzip ${fmt(esmGz)})`);

// ── 2. UMD minified bundle ──
// 全局变量名 AiflowUI，供 <script src="..."> 直接使用
// UMD 需要 name（全局变量），format: iife 外层包一层 commonjs 兼容
console.log('\n── 2. UMD bundle (dist/aiflow-ui.umd.js) ──');
const umdRes = await build({
  entryPoints: [join(SRC, 'index.js')],
  bundle: true,
  write: false,
  format: 'iife',
  globalName: 'AiflowUI',
  minify: true,
  legalComments: 'none',
  sourcemap: false,
  target: ['es2020'],
  absWorkingDir: ROOT,
});
// 手工包成 UMD：兼容 CommonJS 与浏览器全局
const umdBody = umdRes.outputFiles[0].text;
const umdCode =
  `/* AIFlow UI UMD bundle — global: AiflowUI */\n` +
  `(function (root, factory) {\n` +
  `  if (typeof define === 'function' && define.amd) { define([], factory); }\n` +
  `  else if (typeof module === 'object' && module.exports) { module.exports = factory(); }\n` +
  `  else { root.AiflowUI = factory(); }\n` +
  `}(typeof self !== 'undefined' ? self : this, function () {\n` +
  `"use strict";\n` +
  umdBody + `\n` +
  `  return (typeof AiflowUI !== 'undefined') ? AiflowUI : {};\n` +
  `}));\n`;
writeFileSync(join(DIST, 'aiflow-ui.umd.js'), umdCode);
const umdGz = gzipSync(Buffer.from(umdCode)).length;
console.log(`  ✓ dist/aiflow-ui.umd.js  ${fmt(umdCode.length)}  (gzip ${fmt(umdGz)})`);

// ── 3. CSS minified bundle ──
// 用 esbuild 原生 CSS 处理：自动解析 @import、minify、保留 url() 字符串安全
console.log('\n── 3. CSS bundle (dist/index.css) ──');
const cssRes = await build({
  entryPoints: [join(SRC, 'index.css')],
  bundle: true,
  write: false,
  minify: true,
  legalComments: 'none',
  absWorkingDir: ROOT,
  loader: { '.css': 'css' },
});
const cssCode = cssRes.outputFiles[0].text;
writeFileSync(join(DIST, 'index.css'), cssCode);
const cssGz = gzipSync(Buffer.from(cssCode)).length;
console.log(`  ✓ dist/index.css  ${fmt(cssCode.length)}  (gzip ${fmt(cssGz)})`);

// ── 4. 类型声明复制 ──
console.log('\n── 4. 类型声明 (dist/index.d.ts) ──');
copyFileSync(join(SRC, 'index.d.ts'), join(DIST, 'index.d.ts'));
console.log(`  ✓ dist/index.d.ts  (从 src/index.d.ts 复制)`);

// ── 汇总 ──
console.log('\n──────────────────────────────────────────────');
console.log('构建完成：');
console.log(`  dist/index.js            ESM  ${fmt(esmCode.length)}  (gzip ${fmt(esmGz)})`);
console.log(`  dist/aiflow-ui.umd.js    UMD  ${fmt(umdCode.length)}  (gzip ${fmt(umdGz)})`);
console.log(`  dist/index.css           CSS  ${fmt(cssCode.length)}  (gzip ${fmt(cssGz)})`);
console.log(`  dist/index.d.ts          DTS  (类型声明)`);
console.log('');
