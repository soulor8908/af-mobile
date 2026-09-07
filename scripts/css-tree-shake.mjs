// af-mobile UI —— CSS Tree Shaking CLI（生产构建时裁剪未用规则）
// 用法：
//   node scripts/css-tree-shake.mjs --src <消费端源码目录> --css <af-mobile css 入口> [--out <输出文件>]
//   不传 --out 则输出到 stdout
//
// 裁剪逻辑的**唯一真源在 src/css-shake.js**（随包发布，零依赖）；本文件只负责
// parse（postcss 是 devDependency，不可进入发布包）+ CLI 参数处理。
// Vite 消费端走 src/vite.js 的 afMobileShakeCss 插件，与本 CLI 共用同一套裁剪语义。
import postcss from 'postcss';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  shakeRoot,
  scanUsedClasses,
  collectCssClasses,
  collectUsedClasses,
  extractAnimationNames,
} from '../src/css-shake.js';

export { scanUsedClasses, collectCssClasses, collectUsedClasses, extractAnimationNames };

// 输入 CSS 字符串 + 用到的 class 集合，返回裁剪后 CSS
export function shakeCss(css, usedClasses) {
  return shakeRoot(postcss.parse(css), usedClasses).toString();
}

// 把 af-mobile 的 @import 内联（CLI 侧离线处理；Vite 侧由 Vite 的 postcss-import 完成）
function inlineImports(cssFile) {
  const dir = dirname(cssFile);
  const css = readFileSync(cssFile, 'utf8');
  return css.replace(/@import\s+['"]([^'"]+)['"]\s*;?/g, (m, ref) => {
    try {
      return inlineImports(join(dir, ref));
    } catch {
      return '';
    }
  });
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../');

function main() {
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : null;
  };
  const srcDir = getArg('--src');
  const cssPath = getArg('--css') || join(ROOT, 'src/index.css');
  const outPath = getArg('--out');

  if (!srcDir) {
    console.error('用法：node scripts/css-tree-shake.mjs --src <消费端源码目录> --css <css 入口> [--out <输出>]');
    process.exit(1);
  }

  const css = inlineImports(cssPath);
  const used = collectUsedClasses(srcDir, collectCssClasses(css));
  const before = css.length;
  const shaken = shakeCss(css, used);
  const after = shaken.length;

  if (outPath) {
    writeFileSync(outPath, shaken);
    console.log('✓ CSS tree-shake 完成');
    console.log(`  扫描目录：${srcDir}`);
    console.log(`  用到 class：${used.size} 个`);
    console.log(`  裁剪前：${before} 字节 → 裁剪后：${after} 字节（-${((1 - after / before) * 100).toFixed(1)}%）`);
    console.log(`  输出：${outPath}`);
  } else {
    process.stdout.write(shaken);
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
