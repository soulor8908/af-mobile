// af-mobile UI —— ESLint 规则共享工具
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
