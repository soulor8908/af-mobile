// af-mobile UI —— CSS 按需裁剪核心（零依赖，构建期）
//
// 这里是 CSS 裁剪的**唯一真源**：`scripts/css-tree-shake.mjs`（CLI/测试）与
// `src/vite.js` 的 afMobileShakeCss 插件（消费端构建）都从本文件取逻辑，禁止各自实现。
//
// 为什么不直接 import postcss：
//   本文件随 npm 包发布（package.json files 含 src），而 postcss 仅是 devDependency。
//   因此本文件只**操作传入的 postcss 对象**（walkRules / walkAtRules / walkDecls），
//   由调用方负责 parse —— CLI 侧自己 parse，Vite 侧由 Vite 自身的 postcss 管道提供。
//
// 裁剪语义：
//   1. selector 含 [data-role] → 保留（Light DOM 组件内部结构，宿主样式必须留）
//   2. selector 含 af-xxx 标签 → 保留（组件宿主样式）
//   3. selector 无 .class → 保留（:root / * / body）
//   4. selector 含 .class → 所有 .class 都在「已用集合」才保留
//   5. 未被引用的 @keyframes 删除；空的 @layer/@media 容器清理
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// 扫描源码时纳入的文件扩展名
export const SOURCE_EXT = /\.(html|js|mjs|cjs|ts|tsx|jsx|vue|svelte|md)$/;

// 递归收集目录下源码文件（跳过 node_modules / dist / .git / 点目录）
export function walkSources(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git' || e.name.startsWith('.')) continue;
      walkSources(p, out);
    } else if (SOURCE_EXT.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

// 扫描消费端源码，提取 class="..." / className="..." 中的静态 class 名
export function scanUsedClasses(srcDir) {
  const used = new Set();
  const re = /class(?:Name)?\s*=\s*["'`]([^"'`]+)["'`]/g;
  for (const f of walkSources(srcDir)) {
    let content;
    try { content = readFileSync(f, 'utf8'); } catch { continue; }
    let m;
    while ((m = re.exec(content))) {
      for (const c of m[1].split(/\s+/)) if (c) used.add(c);
    }
  }
  return used;
}

// 从 CSS 文本反推全部 class 名，作为 safelist 的字典
// 取 CSS 而非白名单 json：零依赖、无同步闸门，且自动跟随 CSS 变化（防漂移）
export function collectCssClasses(css) {
  const dict = new Set();
  for (const m of css.matchAll(/\.(-?[a-zA-Z_][a-zA-Z0-9_-]*)/g)) dict.add(m[1]);
  return dict;
}

// safelist：扫描源码中**所有引号字符串字面量**，与 dict 取交集
// 目的：救回动态拼接的 class（如 class="a ${x ? 'b' : ''}" 里的 b）——纯静态正则抓不到
// 代价不对称：误报只多留几十字节，漏报则样式静默失效，故宁可保守
export function scanSafelistClasses(srcDir, dict) {
  const safe = new Set();
  if (!dict || !dict.size) return safe;
  const re = /['"`]([^'"`\n]{1,40})['"`]/g;
  for (const f of walkSources(srcDir)) {
    let content;
    try { content = readFileSync(f, 'utf8'); } catch { continue; }
    let m;
    while ((m = re.exec(content))) {
      for (const t of m[1].split(/\s+/)) if (dict.has(t)) safe.add(t);
    }
  }
  return safe;
}

// 静态扫描 + safelist 兜底，合并出最终「已用 class 集合」
export function collectUsedClasses(srcDir, dict) {
  const used = scanUsedClasses(srcDir);
  for (const c of scanSafelistClasses(srcDir, dict)) used.add(c);
  return used;
}

// 判断单个 selector 是否保留（语义见文件头 1~4）
export function shouldKeepSelector(selector, usedClasses) {
  if (/\[data-role/.test(selector)) return true;
  if (/\baf-[a-z]/.test(selector)) return true;
  const classes = [...selector.matchAll(/\.([a-z][a-z0-9-]*)/g)].map((m) => m[1]);
  if (classes.length === 0) return true;
  return classes.every((c) => usedClasses.has(c));
}

// 从 animation / animation-name 值中提取动画名，排除时长与关键字
const ANIM_KEYWORDS = new Set([
  'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'step-start', 'step-end',
  'infinite', 'alternate', 'alternate-reverse', 'reverse', 'normal',
  'none', 'forwards', 'backwards', 'both', 'running', 'paused',
  'initial', 'inherit', 'unset',
]);
export function extractAnimationNames(value) {
  return value.split(/\s*,\s*/).flatMap((part) =>
    part.split(/\s+/).filter((t) =>
      /^[a-z][a-z0-9-]*$/i.test(t) && !ANIM_KEYWORDS.has(t.toLowerCase()) && !/^\d/.test(t)
    )
  );
}

// 核心：就地裁剪 postcss Root（调用方负责 parse）
export function shakeRoot(root, usedClasses) {
  const usedAnimations = new Set();

  root.walkRules((rule) => {
    const kept = rule.selectors.filter((sel) => shouldKeepSelector(sel, usedClasses));
    if (kept.length === 0) {
      rule.remove();
    } else if (kept.length < rule.selectors.length) {
      rule.selectors = kept;
    }
    if (kept.length > 0) {
      rule.walkDecls((decl) => {
        if (decl.prop === 'animation' || decl.prop === 'animation-name') {
          for (const n of extractAnimationNames(decl.value)) usedAnimations.add(n);
        }
      });
    }
  });

  root.walkAtRules('keyframes', (atRule) => {
    if (!usedAnimations.has(atRule.params)) atRule.remove();
  });

  // 递归清理空的 @layer / @media 容器
  // 注意：`@layer a, b, c;` 是声明语句（无 body，nodes 为 undefined），必须跳过
  let changed = true;
  while (changed) {
    changed = false;
    root.walkAtRules((atRule) => {
      if ((atRule.name === 'layer' || atRule.name === 'media') && Array.isArray(atRule.nodes) && atRule.nodes.length === 0) {
        atRule.remove();
        changed = true;
      }
    });
  }

  return root;
}
