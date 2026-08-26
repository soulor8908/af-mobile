// i18n 治理闸门：静态引用的 key 必须已注册 + zh-CN/en-US 字典必须对齐
// 防 v1.7.0 pc.* 类事故（blocks 组件映射表引用了未注册 key，运行时把裸 key 渲染给用户）
// 检查内容：
//   1. 引用完整性：src/**/*.js 中所有形如 'xx.yy' 的 key 引用（static i18n 映射 / t() 调用）
//      必须存在于任一字典（主字典 / addMessages 注册）
//   2. 语言对齐：zh-CN 与 en-US 字典 key 集合完全一致，缺失侧逐条列出
//   3. 结构合法：字典块花括号必须配对（字符串感知扫描，容忍值内 {n} 占位符）
// key 形态约定：{组件缩写固定2位小写字母}.{后缀}，见 src/lib/i18n.js 头注释。
// 收紧为恰好 2 位以排除选择器串（如 af-picker 的 'div.title'）误报
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const KEY_RE = /['"]([a-z]{2}\.[a-z][\w]*)['"]/g;
const DEF_RE = /['"]([a-z]{2}\.[a-z][\w]*)['"]\s*:/g;
const RANGE_RE = /(?:['"](zh-CN|en-US)['"]\s*:\s*\{|addMessages\(\s*['"](zh-CN|en-US)['"]\s*,\s*\{)/g;

// 字符串感知的花括号配对：从 startIdx 的 '{' 扫到匹配 '}'，返回其下标；不配对返回 -1
export function matchBrace(code, startIdx) {
  let depth = 0;
  let quote = null;
  for (let i = startIdx; i < code.length; i++) {
    const c = code[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '\'' || c === '"') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

// 提取单文件字典：返回 { dicts: {locale:Set}, ranges: [{locale,start,end}] }
// 区间覆盖两种形态：主字典 'zh-CN': {...} 与 addMessages('zh-CN', {...})
export function extractDictionaries(code) {
  const dicts = { 'zh-CN': new Set(), 'en-US': new Set() };
  const ranges = [];
  RANGE_RE.lastIndex = 0;
  let m;
  while ((m = RANGE_RE.exec(code))) {
    const open = m.index + m[0].length - 1;
    const close = matchBrace(code, open);
    if (close < 0) throw new Error(`字典花括号不匹配 @ index ${open}`);
    const locale = m[1] || m[2];
    ranges.push({ locale, start: open, end: close });
    const body = code.slice(open, close + 1);
    DEF_RE.lastIndex = 0;
    let d;
    while ((d = DEF_RE.exec(body))) dicts[locale].add(d[1]);
  }
  return { dicts, ranges };
}

// 扫描单文件中字典区间外的 key 引用（去重，保持首现顺序）
// 字典区间内的命中是「定义」不是「引用」；动态拼接的 key（模板串）不在静态扫描能力内
export function scanRefs(code, ranges = []) {
  const out = [];
  const seen = new Set();
  KEY_RE.lastIndex = 0;
  let m;
  while ((m = KEY_RE.exec(code))) {
    if (ranges.some((r) => m.index > r.start && m.index < r.end)) continue;
    if (!seen.has(m[1])) { seen.add(m[1]); out.push(m[1]); }
  }
  return out;
}

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.js$/.test(f)) out.push(p);
  }
  return out;
}

export function runCheck(srcDir = 'src') {
  const problems = [];
  const zh = new Set();
  const en = new Set();
  const refKeys = new Map();
  for (const file of walk(join(root, srcDir))) {
    const code = readFileSync(file, 'utf8');
    let parsed;
    try {
      parsed = extractDictionaries(code);
    } catch (e) {
      problems.push(`[${relative(root, file)}] ${e.message}`);
      continue;
    }
    for (const k of parsed.dicts['zh-CN']) zh.add(k);
    for (const k of parsed.dicts['en-US']) en.add(k);
    for (const k of scanRefs(code, parsed.ranges)) {
      if (!refKeys.has(k)) refKeys.set(k, relative(root, file));
    }
  }
  for (const [k, file] of refKeys) {
    if (!zh.has(k) && !en.has(k)) problems.push(`未注册 key '${k}'（${file} 引用，无任何字典定义，运行时渲染裸 key）`);
  }
  for (const k of zh) if (!en.has(k)) problems.push(`语言不对齐：'${k}' 缺失于 en-US`);
  for (const k of en) if (!zh.has(k)) problems.push(`语言不对齐：'${k}' 缺失于 zh-CN`);
  problems.sort();
  return { ok: problems.length === 0, problems, stats: { refs: refKeys.size, zh: zh.size, en: en.size } };
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  const { ok, problems, stats } = runCheck();
  if (!ok) {
    console.error('✗ i18n-check 失败:');
    for (const p of problems) console.error('  - ' + p);
    console.error(`\n  引用 key ${stats.refs} 个 / zh-CN ${stats.zh} 条 / en-US ${stats.en} 条`);
    process.exit(1);
  }
  console.log(`✓ i18n-check: 引用 ${stats.refs} 个 key 全部已注册，zh-CN(${stats.zh}) ↔ en-US(${stats.en}) 对齐`);
}
