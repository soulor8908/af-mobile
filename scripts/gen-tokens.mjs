// AIFlow UI —— src/tokens.json 生成器（W3C Design Tokens Format 1.1）
// 从 src/tokens.css（权威源，CI 由 CODEOWNERS 保护，AI 不可改）解析全部 L1 token，映射为 DTCG JSON
// 设计：tokens.css 为单一真相源，本脚本生成派生的 tokens.json 供设计工具 / 消费端使用
// 用法：node scripts/gen-tokens.mjs（输出 src/tokens.json）
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'packages/ui/src');
const OUT = join(SRC, 'tokens.json');

const DESC = 'AIFlow UI L1 设计 Token（W3C Design Tokens Format 1.1）。由 src/tokens.css 自动生成，勿手改，运行 `npm run tokens` 重新生成。palette 为 light 基准值，dark 值见 palette.$extensions.aiflow.theme.dark。阴影因源为 CSS 简写字符串，采用 string 类型保证 W3C 校验兼容。';

// 剥注释后扫描 CSS 规则块（@ 规则递归展开，返回扁平 rule 列表）
export function parseCssRules(css) {
  const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  let searchFrom = 0;
  const len = code.length;
  while (searchFrom < len) {
    let depth = 0;
    let braceIdx = -1;
    for (let i = searchFrom; i < len; i++) {
      if (code[i] === '{') { if (depth === 0) { braceIdx = i; break; } depth++; }
      else if (code[i] === '}') depth--;
    }
    if (braceIdx === -1) break;
    const selector = code.slice(searchFrom, braceIdx).trim();
    let d = 1;
    let j = braceIdx + 1;
    while (j < len && d > 0) {
      if (code[j] === '{') d++;
      else if (code[j] === '}') d--;
      j++;
    }
    const body = code.slice(braceIdx + 1, j - 1);
    if (selector.startsWith('@')) rules.push(...parseCssRules(body));
    else rules.push({ selector, decls: parseDecls(body) });
    searchFrom = j;
  }
  return rules;
}

// 提取声明块中的自定义属性（--token: value;），忽略普通 CSS 属性
export function parseDecls(body) {
  const decls = [];
  const re = /(--[a-z][a-z0-9-]*)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(body))) decls.push({ name: m[1], value: m[2].trim() });
  return decls;
}

// token 名 → DTCG 分组（前缀映射，长前缀优先）
const GROUPS = [
  ['palette-', 'palette'], ['shadow-', 'shadow'], ['c-', 'color'], ['s-', 'spacing'],
  ['t-', 'typography.size'], ['lh-', 'typography.lineHeight'], ['fw-', 'typography.weight'],
  ['r-', 'radius'], ['z-', 'zIndex'], ['ease-', 'motion'], ['dur-', 'motion.duration'],
];

function splitToken(name) {
  for (const [prefix, group] of GROUPS) if (name.startsWith(prefix)) return { group, leaf: name.slice(prefix.length) };
  return null;
}

const TYPE = {
  color: 'color', spacing: 'dimension', 'typography.size': 'dimension',
  'typography.lineHeight': 'number', 'typography.weight': 'number', radius: 'dimension',
  shadow: 'string', zIndex: 'number', motion: 'cubicBezier', 'motion.duration': 'duration',
};

const NUMERIC = /^-?\d+(\.\d+)?$/;
function convertValue(type, value) {
  const alias = value.match(/^var\(--([^)]+)\)$/)?.[1];
  if (alias) return `{${alias.replace('palette-', 'palette.')}}`; // var(--palette-brand) → {palette.brand}
  if (type === 'number' && NUMERIC.test(value)) return Number(value);
  if (type === 'cubicBezier') {
    const m = value.match(/cubic-bezier\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/);
    if (m) return { x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4] };
  }
  return value;
}

function paletteType(name) {
  if (name === 'color-scheme') return 'other';
  if (name.startsWith('shadow-')) return 'string';
  return 'color';
}

function setPath(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) { cur[parts[i]] ??= {}; cur = cur[parts[i]]; }
  cur[parts[parts.length - 1]] = value;
}

// 从 CSS 字符串构建 DTCG token 树（纯函数，供测试）
export function buildTokensFromCss(css) {
  const rules = parseCssRules(css);
  const light = rules.find(r => r.selector.trim() === ':root' && r.decls.some(d => d.name.startsWith('--palette-')));
  const dark = rules.find(r => r.selector.includes('[data-theme="dark"]'));
  const pub = rules.find(r => r.selector.trim() === ':root' && r.decls.some(d => d.name.startsWith('--c-')));
  if (!light || !dark || !pub) throw new Error('tokens.css 结构异常：缺少 palette light / dark / 公共 token 块');

  const tokens = { $description: DESC };
  const palette = {};
  for (const d of light.decls) {
    const name = d.name.slice('--palette-'.length);
    const type = paletteType(name);
    palette[name] = { $type: type, $value: convertValue(type, d.value) };
  }
  const darkVals = {};
  for (const d of dark.decls) {
    const name = d.name.slice('--palette-'.length);
    darkVals[name] = convertValue(paletteType(name), d.value);
  }
  palette.$extensions = { aiflow: { theme: { dark: darkVals } } };
  tokens.palette = palette;

  for (const d of pub.decls) {
    const sp = splitToken(d.name.slice(2)); // 去 '--'
    if (!sp) continue;
    const type = TYPE[sp.group];
    setPath(tokens, `${sp.group}.${sp.leaf}`, { $type: type, $value: convertValue(type, d.value) });
  }
  return tokens;
}

// 统计叶子 token 数（排除 $extensions 主题扩展）
function countLeaves(node) {
  let n = 0;
  for (const [k, v] of Object.entries(node)) {
    if (k === '$extensions') continue;
    if (v && typeof v === 'object' && !Array.isArray(v) && '$value' in v) n++;
    else if (v && typeof v === 'object') n += countLeaves(v);
  }
  return n;
}

export function buildTokensFromSources() {
  return buildTokensFromCss(readFileSync(join(SRC, 'tokens.css'), 'utf8'));
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const tokens = buildTokensFromSources();
  writeFileSync(OUT, JSON.stringify(tokens, null, 2) + '\n');
  const groups = Object.keys(tokens).filter(k => k !== '$description');
  console.log(`✓ ${OUT}`);
  console.log(`  token 组: ${groups.join(', ')}`);
  console.log(`  token 数: ${countLeaves(tokens)}`);
}
