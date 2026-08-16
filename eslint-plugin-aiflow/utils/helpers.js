// AIFlow UI —— ESLint 规则共享工具
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const whitelistPath = resolve(__dirname, 'whitelist-v1.json');
const whitelist = JSON.parse(readFileSync(whitelistPath, 'utf8'));

// 所有合法 class 集合（recipe + atomic）
export const ALL_CLASSES = new Set([
  ...whitelist.classes.recipe,
  ...whitelist.classes.atomic,
]);

// 所有合法组件 tagName 集合
export const ALL_COMPONENTS = new Set(whitelist.components);

// 从字符串中提取所有 class="xxx" 的 class 列表
export function extractClassLists(str) {
  const results = [];
  const re = /class\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(str))) {
    const classes = m[1].split(/\s+/).filter(Boolean);
    if (classes.length) results.push({ classes, offset: m.index, raw: m[0] });
  }
  return results;
}

// 从字符串中提取所有 class='xxx'（单引号）的 class 列表
export function extractClassListsSingle(str) {
  const results = [];
  const re = /class\s*=\s*'([^']*)'/g;
  let m;
  while ((m = re.exec(str))) {
    const classes = m[1].split(/\s+/).filter(Boolean);
    if (classes.length) results.push({ classes, offset: m.index, raw: m[0] });
  }
  return results;
}

// 合并提取双引号和单引号的 class
export function extractAllClassLists(str) {
  return [...extractClassLists(str), ...extractClassListsSingle(str)];
}

// 从字符串中提取所有自定义元素标签 <af-xxx>
export function extractCustomElements(str) {
  const results = [];
  const re = /<([a-z]+-[a-z-]+)/g;
  let m;
  while ((m = re.exec(str))) results.push(m[1]);
  return results;
}

// 解析 recipes.project.css 约定块 /* === N. 用途 === */ 内的 class 名（项目级扩展，设计 §3.1）
// 与 build-prompt.mjs 的 extractProjectExtensions 同一约定：块外 CSS 不登记（强制文档化）
export function projectClassesFromCss(css) {
  const classes = [];
  const seen = new Set();
  const blockRe = /\/\*\s*===\s*\d+\.\s*[^*]+?===\s*\*\/([\s\S]*?)(?=\n\s*\n|\/\*\s*===\s*\d+\.|$)/g;
  let m;
  while ((m = blockRe.exec(css || ''))) {
    for (const c of m[1].matchAll(/\.([a-z][a-z0-9-]*)/g)) {
      if (!seen.has(c[1])) { seen.add(c[1]); classes.push(c[1]); }
    }
  }
  return classes;
}

// 读取约定文件并提取 class（相对 cwd 解析）；文件缺失/读取失败 → []（lint 配置不崩，AGENTS #6）
export function loadProjectClasses(cssPath) {
  try {
    return projectClassesFromCss(readFileSync(resolve(process.cwd(), cssPath), 'utf8'));
  } catch {
    return [];
  }
}
