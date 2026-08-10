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
      // selector 内可能夹带行内注释 /* ... */，先剥离再做独占 class 判定
      const cleaned = sel.replace(/\/\*[\s\S]*?\*\//g, '');
      // selector 列表按 , 分割
      const parts2 = cleaned.split(',');
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
// 组内小计数从实际提取的 class 数派生，覆盖 CSS 注释里的手敲数字（防漂移）
export function buildWhitelistSection(wl, recipeGroups, atomicGroups) {
  // CSS 分组里出现过的 class 集合
  const groupedRecipe = new Set(recipeGroups.flatMap(g => g.classes));
  const groupedAtomic = new Set(atomicGroups.flatMap(g => g.classes));
  // whitelist 里有但 CSS 分组未归类的（状态修饰符等）
  const looseRecipe = wl.classes.recipe.filter(c => !groupedRecipe.has(c));
  const looseAtomic = wl.classes.atomic.filter(c => !groupedAtomic.has(c));

  // 分组名去掉手敲的计数（如"按钮（7）"→"按钮"），改用派生计数
  const cleanName = (name) => name.replace(/\s*[（(]\d+[）)]\s*$/, '');

  const lines = [];
  lines.push('## L2 配方（' + wl.classes.recipe.length + ' 个，按用途分组）');
  lines.push('');
  for (const g of recipeGroups) {
    lines.push('**' + cleanName(g.name) + '（' + g.classes.length + '）：** ' + g.classes.map(c => '`' + c + '`').join(' '));
  }
  if (looseRecipe.length) {
    lines.push('**状态修饰符（' + looseRecipe.length + '，与其他 class 组合使用）：** ' + looseRecipe.map(c => '`' + c + '`').join(' '));
  }
  lines.push('');
  lines.push('## L2 原子（' + wl.classes.atomic.length + ' 个，按用途分组）');
  lines.push('');
  for (const g of atomicGroups) {
    lines.push('**' + cleanName(g.name) + '（' + g.classes.length + '）：** ' + g.classes.map(c => '`' + c + '`').join(' '));
  }
  if (looseAtomic.length) {
    lines.push('**其他（' + looseAtomic.length + '）：** ' + looseAtomic.map(c => '`' + c + '`').join(' '));
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
// L3 组件简表元数据（与 src/components/af-*.js 一一对应，属性/事件以源码 defineProp/emit 为准）
// 新增组件时在此追加一行；CI 的 check-whitelist-sync 会校验三方一致，防漂移
const COMPONENT_META = [
  { tag: 'af-list', purpose: '长列表虚拟滚动', props: 'data, page-size, refresh', events: 'af-list:loadmore, af-list:itemclick, af-list:refresh' },
  { tag: 'af-swiper', purpose: '轮播/滑动', props: 'autoplay, loop, active-index', events: 'af-swiper:change' },
  { tag: 'af-tabs', purpose: '标签页', props: 'tabs, active-index', events: 'af-tabs:change' },
  { tag: 'af-dialog', purpose: '模态框', props: 'title, close-on-esc, close-on-backdrop, variant', events: 'af-dialog:open, af-dialog:close' },
  { tag: 'af-toast', purpose: '轻提示（单例）', props: 'duration', events: 'af-toast:dismiss' },
  { tag: 'af-action-sheet', purpose: '底部操作面板', props: 'options, title, show-cancel', events: 'af-action-sheet:select, af-action-sheet:close' },
  { tag: 'af-picker', purpose: '滚轮选择器', props: 'columns, values, title', events: 'af-picker:change, af-picker:confirm' },
  { tag: 'af-dropdown', purpose: '下拉菜单', props: 'options, value, placeholder', events: 'af-dropdown:select' },
  { tag: 'af-img', purpose: '懒加载图片', props: 'src, alt, placeholder-src, fail-src, variant', events: 'af-img:load, af-img:error' },
  { tag: 'af-backtop', purpose: '回到顶部', props: 'threshold, target, position', events: 'af-backtop:click, af-backtop:show, af-backtop:hide' },
  { tag: 'af-switch', purpose: '开关', props: 'checked, disabled, loading, size', events: 'af-switch:change' },
  { tag: 'af-search-bar', purpose: '搜索栏', props: 'value, placeholder, clearable, debounce', events: 'af-search-bar:input, af-search-bar:search, af-search-bar:clear' },
  { tag: 'af-skeleton-page', purpose: '整页骨架屏', props: 'variant', events: '—' },
  { tag: 'af-upload', purpose: '文件上传', props: 'accept, multiple, max-size, max-count, button-text', events: 'af-upload:change, af-upload:error' },
  { tag: 'af-navbar', purpose: '顶部导航栏', props: 'title, show-back, back-text', events: 'af-navbar:back' },
  { tag: 'af-tabbar', purpose: '底部标签栏', props: 'tabs, active-index, fixed', events: 'af-tabbar:change' },
  { tag: 'af-stepper', purpose: '数量选择器', props: 'value, min, max, step, disabled', events: 'af-stepper:change' },
  { tag: 'af-field', purpose: '结构化表单字段', props: 'label, icon, type, value, placeholder, help, error', events: 'af-field:input, af-field:change' },
  { tag: 'af-pull-refresh', purpose: '下拉刷新容器', props: 'refreshing', events: 'af-pull-refresh:refresh' },
  { tag: 'af-swipe-cell', purpose: '滑动单元格', props: 'disabled', events: 'af-swipe-cell:action' },
];

// 生成 L3 组件简表 markdown（注入模板，替代硬编码表格，防与源码漂移）
export function buildComponentTableSection(meta = COMPONENT_META) {
  const lines = [
    '| 组件 | 用途 | 核心属性 | 核心事件 |',
    '|---|---|---|---|',
  ];
  for (const c of meta) {
    lines.push(`| \`<${c.tag}>\` | ${c.purpose} | ${c.props} | ${c.events} |`);
  }
  return lines.join('\n');
}

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
  const compTableSection = buildComponentTableSection();
  let output = tpl
    .replaceAll('<!-- {{{ WHITELIST_INJECTION_POINT }}} -->', wlSection)
    .replaceAll('<!-- {{{ COMPONENT_TABLE_INJECTION_POINT }}} -->', compTableSection)
    .replaceAll('{{{ TOKEN_COUNT }}}', String(wl.tokens.length))
    .replaceAll('{{{ RECIPE_COUNT }}}', String(wl.classes.recipe.length))
    .replaceAll('{{{ ATOMIC_COUNT }}}', String(wl.classes.atomic.length))
    .replaceAll('{{{ TOTAL_CLASS_COUNT }}}', String(wl.classes.recipe.length + wl.classes.atomic.length))
    .replaceAll('{{{ COMPONENT_COUNT }}}', String(wl.components.length));

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
