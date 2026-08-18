// af-mobile UI —— CSS Tree Shaking 脚本（生产构建时裁剪未用规则）
// 用法：
//   node scripts/css-tree-shake.mjs --src <消费端源码目录> --css <af-mobile css 入口> [--out <输出文件>]
//   不传 --out 则输出到 stdout
//
// 原理：
//   1. 扫描消费端 .html/.js/.ts/.jsx/.tsx/.vue/.svelte 文件，提取 class="..." / className="..." 中的 class 名
//   2. 用 postcss 解析 af-mobile CSS，遍历每条 Rule：
//      - selector 含 .class：所有 .class 必须在白名单才保留，否则丢弃该 selector
//      - selector 含 af-xxx 标签（组件宿主）：保留
//      - selector 含 [data-role]（Light DOM 组件内部结构）：保留
//      - selector 无 .class（:root / * / body）：保留
//   3. 收集保留 Rule 中引用的 @keyframes 动画名，删除未被引用的 @keyframes
//   4. 清理空的 @layer / @media 容器
//
// 与组件 tree-shaking 对齐：JS 按需 import 组件，CSS 按需裁剪配方
import postcss from 'postcss';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../');

// 递归扫描目录下所有匹配扩展名的文件
function walk(dir, exts, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      // 跳过 node_modules / dist / .git
      if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
      walk(full, exts, out);
    } else if (exts.has(extname(name).slice(1))) {
      out.push(full);
    }
  }
  return out;
}

// 扫描消费端源码，提取所有用到的 class 名
export function scanUsedClasses(srcDir) {
  const used = new Set();
  const exts = new Set(['html', 'js', 'ts', 'jsx', 'tsx', 'vue', 'svelte', 'md']);
  const files = walk(srcDir, exts);
  // class="..." / className="..." / class='...' / class`...`
  const re = /class(?:Name)?\s*=\s*["'`]([^"'`]+)["'`]/g;
  for (const f of files) {
    const content = readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(content))) {
      for (const c of m[1].split(/\s+/)) {
        if (c) used.add(c);
      }
    }
  }
  return used;
}

// 判断单个 selector 是否保留
//   - 含 [data-role] → 保留（Light DOM 组件内部结构，宿主样式必须保留）
//   - 含 af-xxx 标签 → 保留（组件宿主样式）
//   - 无 .class → 保留（:root / * / body / html 等基础规则）
//   - 含 .class：所有 .class 必须在白名单才保留
function shouldKeepSelector(selector, usedClasses) {
  if (/\[data-role/.test(selector)) return true;
  if (/\baf-[a-z]/.test(selector)) return true;
  const classes = [...selector.matchAll(/\.([a-z][a-z0-9-]*)/g)].map(m => m[1]);
  if (classes.length === 0) return true;
  return classes.every(c => usedClasses.has(c));
}

// 从 animation/animation-name 声明值中提取动画名
//   animation: spinner-rotate 0.8s linear infinite → ['spinner-rotate']
//   排除时长、缓动函数、迭代次数等关键词
const ANIM_KEYWORDS = new Set([
  'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'step-start', 'step-end',
  'infinite', 'alternate', 'alternate-reverse', 'reverse', 'normal',
  'none', 'forwards', 'backwards', 'both', 'running', 'paused',
  'initial', 'inherit', 'unset',
]);
export function extractAnimationNames(value) {
  return value.split(/\s*,\s*/).flatMap(part =>
    part.split(/\s+/).filter(t =>
      /^[a-z][a-z0-9-]*$/i.test(t) &&
      !ANIM_KEYWORDS.has(t.toLowerCase()) &&
      !/^\d/.test(t) // 排除时长如 0.8s
    )
  );
}

// 核心裁剪：输入 CSS 字符串 + 用到的 class 集合，返回裁剪后 CSS
export function shakeCss(css, usedClasses) {
  const root = postcss.parse(css);
  const usedAnimations = new Set();

  // 1. 遍历所有 Rule，按 selector 决定保留/删除
  root.walkRules(rule => {
    const kept = rule.selectors.filter(sel => shouldKeepSelector(sel, usedClasses));
    if (kept.length === 0) {
      rule.remove();
    } else if (kept.length < rule.selectors.length) {
      rule.selectors = kept;
    }
    // 收集保留规则中引用的动画名
    if (kept.length > 0) {
      rule.walkDecls(decl => {
        if (decl.prop === 'animation' || decl.prop === 'animation-name') {
          for (const n of extractAnimationNames(decl.value)) usedAnimations.add(n);
        }
      });
    }
  });

  // 2. 删除未被引用的 @keyframes
  root.walkAtRules('keyframes', atRule => {
    if (!usedAnimations.has(atRule.params)) atRule.remove();
  });

  // 3. 清理空的 @layer / @media 容器（递归清理嵌套）
  //    注意：`@layer a, b, c;` 是声明语句（无 body，nodes 为 undefined），跳过
  //    只清理块级 `@layer name { }` / `@media (...) { }` 且 nodes 为空数组的
  let changed = true;
  while (changed) {
    changed = false;
    root.walkAtRules(atRule => {
      if ((atRule.name === 'layer' || atRule.name === 'media') && Array.isArray(atRule.nodes) && atRule.nodes.length === 0) {
        atRule.remove();
        changed = true;
      }
    });
  }

  return root.toString();
}

// 把 af-mobile 的 @import 内联（postcss-import 不装，手写简单版）
function inlineImports(cssFile) {
  const dir = dirname(cssFile);
  const css = readFileSync(cssFile, 'utf8');
  return css.replace(/@import\s+['"]([^'"]+)['"]\s*;?/g, (m, ref) => {
    const full = join(dir, ref);
    try {
      return inlineImports(full);
    } catch {
      return '';  // 找不到文件则跳过
    }
  });
}

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

  const used = scanUsedClasses(srcDir);
  const css = inlineImports(cssPath);
  const before = css.length;
  const shaken = shakeCss(css, used);
  const after = shaken.length;

  if (outPath) {
    writeFileSync(outPath, shaken);
    console.log(`✓ CSS tree-shake 完成`);
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
