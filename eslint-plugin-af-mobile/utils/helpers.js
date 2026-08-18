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

// 编辑距离（Levenshtein）：最近邻建议用，候选集小（<200）无需提前剪枝
function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

// 最近邻建议：返回 " Did you mean 'xxx'?" 或 ''（无足够接近的候选）
// 阈值随长度放宽：≤3 字符允许 1 距离，更长允许 2
export function suggestNearest(name, candidates) {
  const max = name.length <= 3 ? 1 : 2;
  let best = null, bestDist = max + 1;
  for (const c of candidates) {
    if (Math.abs(c.length - name.length) > max) continue;
    const d = levenshtein(name, c);
    if (d < bestDist) { best = c; bestDist = d; }
  }
  return best ? ` Did you mean '${best}'?` : '';
}
