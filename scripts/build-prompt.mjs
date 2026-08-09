// AIFlow UI —— System Prompt 构建器（§2.3 / D3 / D9）
// 两个注入点：
//   {{{ WHITELIST_INJECTION_POINT }}}       ← whitelist-v1.json + CSS 分组注释 → 105 class 分组列表
//   {{{ PROJECT_EXTENSION_INJECTION_POINT }}} ← recipes.project.css 的 /* === N. 用途 === */ 注释块
// 用法：
//   node scripts/build-prompt.mjs                          # 输出到 stdout
//   node scripts/build-prompt.mjs -o prompt/system-prompt.md
//   node scripts/build-prompt.mjs --project ./aiflow-ui/recipes.project.css
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = join(ROOT, 'prompt/system-prompt.template.md');
const WHITELIST = join(ROOT, 'eslint-plugin-aiflow/utils/whitelist-v1.json');
const RECIPES_CSS = join(ROOT, 'src/recipes.css');
const ATOMIC_CSS = join(ROOT, 'src/atomic.css');
const DEFAULT_OUT = join(ROOT, 'prompt/system-prompt.md');

// 解析 CLI 参数
const args = process.argv.slice(2);
let outPath = null;
let projectRecipes = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '-o' || args[i] === '--output') outPath = args[++i];
  else if (args[i] === '--project') projectRecipes = args[++i];
  else if (args[i] === '--stdout') outPath = null;
  else if (args[i] === '-h' || args[i] === '--help') {
    console.error('Usage: build-prompt.mjs [-o OUT] [--project PATH] [--stdout]');
    process.exit(0);
  }
}

// 从 CSS 源码读取 /* === 分组名 === */ 注释块，提取该分组下"独占规则集"的 .class 名
// 即只取 selector 列表里全是 .class 形态的规则集（.foo { ... } / .foo, .bar { ... }）
// 排除 .list > .cell + .cell 这种后代/兄弟组合选择器里的 class（避免误归类）
export function extractGroupsFromCss(css) {
  // 按 /* === 分组名 === */ 注释切分
  const reComment = /\/\*\s*===\s*(.+?)\s*===\s*\*\//g;
  const names = [];
  let m;
  while ((m = reComment.exec(css))) names.push(m[1]);
  const parts = css.split(/\/\*\s*===\s*.+?\s*===\s*\*\//);
  // parts[0] 是首个分组前的内容，parts[i+1] 是第 i 个分组后的内容
  const groups = [];
  for (let i = 0; i < names.length; i++) {
    const body = parts[i + 1] || '';
    // 匹配 "selector { " 这种规则集，selector 部分到 { 之前
    const rules = [...body.matchAll(/([^{}]*?)\{/g)].map(x => x[1]);
    const classes = [];
    for (const sel of rules) {
      // selector 列表按 , 分割
      const parts2 = sel.split(',');
      const allSimple = parts2.every(p => /^\s*\.[a-z][a-z0-9-]*\s*$/.test(p));
      if (!allSimple) continue;
      for (const p of parts2) {
        const c = p.trim().slice(1);
        if (c) classes.push(c);
      }
    }
    if (classes.length) {
      const seen = new Set();
      const uniq = classes.filter(c => seen.has(c) ? false : (seen.add(c), true));
      groups.push({ name: names[i], classes: uniq });
    }
  }
  return groups;
}

// 从 recipes.project.css 解析 /* === N. 用途 === */ 注释块（含正文说明）
export function extractProjectExtensions(css) {
  const items = [];
  const re = /\/\*\s*===\s*(\d+)\.\s*(.+?)\s*===\s*\*\/([\s\S]*?)(?=\/\*\s*===\s*\d+\.|$)/g;
  let m;
  while ((m = re.exec(css))) {
    const num = Number(m[1]);
    const desc = m[2].trim();
    const body = m[3] || '';
    const classes = [...body.matchAll(/\.([a-z][a-z0-9-]*)/g)].map(x => x[1]);
    const seen = new Set();
    const uniq = classes.filter(c => seen.has(c) ? false : (seen.add(c), true));
    items.push({ num, desc, classes: uniq });
  }
  return items;
}

// 构造 whitelist 注入段
// 优先用 CSS 分组（人类可读），再把 whitelist 里有但 CSS 分组没归类的 class
// （如状态修饰符 .tab-item.active 中的 active）追加到"状态修饰符"分组
export function buildWhitelistSection(wl, recipeGroups, atomicGroups) {
  // CSS 分组里出现过的 class 集合
  const groupedRecipe = new Set(recipeGroups.flatMap(g => g.classes));
  const groupedAtomic = new Set(atomicGroups.flatMap(g => g.classes));
  // whitelist 里有但 CSS 分组未归类的（状态修饰符等）
  const looseRecipe = wl.classes.recipe.filter(c => !groupedRecipe.has(c));
  const looseAtomic = wl.classes.atomic.filter(c => !groupedAtomic.has(c));

  const lines = [];
  lines.push('## L2 配方（' + wl.classes.recipe.length + ' 个，按用途分组）');
  lines.push('');
  for (const g of recipeGroups) {
    lines.push('**' + g.name + '：** ' + g.classes.map(c => '`' + c + '`').join(' '));
  }
  if (looseRecipe.length) {
    lines.push('**状态修饰符（与其他 class 组合使用）：** ' + looseRecipe.map(c => '`' + c + '`').join(' '));
  }
  lines.push('');
  lines.push('## L2 原子（' + wl.classes.atomic.length + ' 个，按用途分组）');
  lines.push('');
  for (const g of atomicGroups) {
    lines.push('**' + g.name + '：** ' + g.classes.map(c => '`' + c + '`').join(' '));
  }
  if (looseAtomic.length) {
    lines.push('**其他：** ' + looseAtomic.map(c => '`' + c + '`').join(' '));
  }
  lines.push('');
  lines.push('## L3 真组件标签（' + wl.components.length + ' 个）');
  lines.push('');
  lines.push(wl.components.map(c => '`<' + c + '>`').join(' '));
  lines.push('');
  lines.push('## L1 Token 变量（' + wl.tokens.length + ' 个，必须用 var(--*) 引用）');
  lines.push('');
  lines.push(wl.tokens.map(t => '`' + t + '`').join(' '));
  lines.push('');
  lines.push('## 禁止内联 style 的属性（' + wl.forbiddenInlineStyle.length + ' 个）');
  lines.push('');
  lines.push(wl.forbiddenInlineStyle.map(p => '`' + p + '`').join(' '));
  return lines.join('\n');
}

// 构造项目级扩展注入段
export function buildProjectExtensionSection(items) {
  if (!items.length) return '';
  const lines = ['# 项目级扩展（来自 recipes.project.css）'];
  lines.push('以下 class 已登记为本项目专属白名单，可正常使用：');
  for (const it of items) {
    const cls = it.classes.map(c => '`.' + c + '`').join('、');
    lines.push(`${it.num}. ${it.desc}${cls ? '：' + cls : ''}`);
  }
  return lines.join('\n');
}

// 主流程
function main() {
  const tpl = readFileSync(TEMPLATE, 'utf8');
  const wl = JSON.parse(readFileSync(WHITELIST, 'utf8'));
  const recipeGroups = extractGroupsFromCss(readFileSync(RECIPES_CSS, 'utf8'));
  const atomicGroups = extractGroupsFromCss(readFileSync(ATOMIC_CSS, 'utf8'));

  const wlSection = buildWhitelistSection(wl, recipeGroups, atomicGroups);
  let output = tpl.replace('<!-- {{{ WHITELIST_INJECTION_POINT }}} -->', wlSection);

  // 项目级扩展（可选）
  let extSection = '';
  if (projectRecipes && existsSync(projectRecipes)) {
    const items = extractProjectExtensions(readFileSync(projectRecipes, 'utf8'));
    extSection = buildProjectExtensionSection(items);
  }
  output = output.replace('<!-- {{{ PROJECT_EXTENSION_INJECTION_POINT }}} -->', extSection);

  if (outPath) {
    writeFileSync(outPath, output);
    console.error('✓ written: ' + outPath);
  } else {
    process.stdout.write(output);
  }
}

// 只在直接运行时执行
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
