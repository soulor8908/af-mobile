// af-mobile UI —— System Prompt 构建器（§2.3 / D3 / D9）
// 两个注入点：
//   {{{ WHITELIST_INJECTION_POINT }}}       ← whitelist-v1.json + CSS 分组注释 → 105 class 分组列表
//   {{{ PROJECT_EXTENSION_INJECTION_POINT }}} ← recipes.project.css 的 /* === N. 用途 === */ 注释块
// 用法：
//   node scripts/build-prompt.mjs                          # 输出到 stdout
//   node scripts/build-prompt.mjs -o prompt/system-prompt.md
//   node scripts/build-prompt.mjs --project ./af-mobile/recipes.project.css
//   node scripts/build-prompt.mjs --model claude          # 拼模型特化头
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAsset } from './resolve-asset.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// 资产经双候选解析：开发态读仓库源，打包发布态读包内 assets 快照（pkg-publish 设计 §3.2）
const TEMPLATE = resolveAsset('prompt/system-prompt.template.md');
const WHITELIST = resolveAsset('eslint-plugin-af-mobile/utils/whitelist-v1.json');
const RECIPES_CSS = resolveAsset('src/recipes.css');
const ATOMIC_CSS = resolveAsset('src/atomic.css');
const MODEL_DIR = resolveAsset('prompt/models');
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
      // selector 列表按 , 分割；允许 :pseudo 后缀（如 .input-err:focus），取基类归类
      const parts2 = cleaned.split(',');
      const allSimple = parts2.every(p => /^\s*\.[a-z][a-z0-9-]*(?::[a-z-]+(?:\([^)]*\))?)?\s*$/.test(p));
      if (!allSimple) continue;
      for (const p of parts2) {
        const c = p.trim().slice(1).split(':')[0];
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

// 语义旁车表：只给"名字不自明/高频漏用"的 class 一行说明（全量 desc 会膨胀 prompt）
// AI 用例复盘：.segmented 被漏掉重造、.empty 手写居中空态，均为纯语义缺失
// 注意：class 名必须在 whitelist-v1.json 中存在（CI B→C 同步兜底）
const CLASS_DESC = [
  ['segmented', '分段控制器（iOS 风格 N 选一），配 seg-it / seg-blk'],
  ['cob', '底部操作栏（通用：确认/提交/下一步，不限于收银场景），cob-fx 自动适配 tabbar 与 safe-area'],
  ['input-bar', '底部固定输入栏（评论/聊天），input-bar-fx 自动适配 safe-area'],
  ['safe-top', '安全区 padding 工具：自建 fixed/sticky 元素规避刘海'],
  ['safe-bottom', '安全区 padding 工具：自建固定元素规避 Home Indicator'],
  ['empty', '空态占位（列表无数据/搜索无结果），勿手写居中提示'],
  ['actions', '按钮组容器（卡片/表单底部操作区），内部配 .btn'],
  ['stats-grid', '数据统计网格（数字+标签卡片）'],
  ['hero', '首屏主视觉区（大标题+副文案），eyebrow 为其上方小标签'],
  ['tag', '状态标签，配 tag-ok / tag-warn / tag-danger 语义色'],
  ['spinner', '加载中旋转图标（spinner-sm / spinner-lg），配 .empty 可做加载态'],
  ['sheet', '底部弹出层容器（自定义 action-sheet 内容时用）'],
  ['input-err', '输入框错误态红框，form-err 为表单行错误文案'],
];

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
  // 语义旁车表：只列 whitelist 内存在的条目（防 CLASS_DESC 与 whitelist 漂移）
  const known = new Set([...wl.classes.recipe, ...wl.classes.atomic]);
  const descRows = CLASS_DESC.filter(([c]) => known.has(c));
  if (descRows.length) {
    lines.push('');
    lines.push('### 易漏 class 语义速查');
    lines.push('');
    for (const [c, d] of descRows) lines.push('- `' + c + '`：' + d);
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
  { tag: 'af-cascade-picker', purpose: '级联选择器', props: 'tree, values, title', events: 'af-picker:change, af-picker:confirm' },
  { tag: 'af-dropdown', purpose: '下拉菜单', props: 'options, value, placeholder', events: 'af-dropdown:select' },
  { tag: 'af-img', purpose: '懒加载图片', props: 'src, alt, placeholder-src, fail-src, variant', events: 'af-img:load, af-img:error' },
  { tag: 'af-backtop', purpose: '回到顶部', props: 'threshold, target, position', events: 'af-backtop:click, af-backtop:show, af-backtop:hide' },
  { tag: 'af-badge', purpose: '徽标角标', props: 'content, max, dot, color', events: '—' },
  { tag: 'af-calendar', purpose: '日历', props: 'value, month, min, max', events: 'af-calendar:select, af-calendar:monthchange' },
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
  { tag: 'af-rate', purpose: '评分', props: 'value, max, readonly, size', events: 'af-rate:change' },
  { tag: 'af-notice-bar', purpose: '公告通知栏', props: 'text, scroll', events: '—' },
  { tag: 'af-progress', purpose: '进度条', props: 'value, max, color', events: '—' },
  { tag: 'af-steps', purpose: '步骤条', props: 'steps, current', events: '—' },
  { tag: 'af-countdown', purpose: '倒计时', props: 'time, autostart', events: 'af-countdown:change, af-countdown:end' },
  { tag: 'af-number-keyboard', purpose: '数字键盘（支付/验证码，配 af-password-input）', props: 'value, maxlength, random, title', events: 'af-number-keyboard:input, af-number-keyboard:delete, af-number-keyboard:complete, af-number-keyboard:close' },
  { tag: 'af-password-input', purpose: '密码/验证码格子输入（配 af-number-keyboard）', props: 'value, length, mask, focused', events: 'af-password-input:complete' },
  { tag: 'af-chart-line', purpose: '折线/面积/散点/迷你图（charts 子库）', props: 'data, labels, series, variant, smooth, show-axis, height, legend, loading, error', events: 'af-chart-line:select, af-chart-line:retry' },
  { tag: 'af-chart-bar', purpose: '柱状/条形/堆叠/分组图（charts 子库）', props: 'data, labels, series, variant, max-count, height, legend, loading, error', events: 'af-chart-bar:select, af-chart-bar:retry' },
  { tag: 'af-chart-pie', purpose: '饼/环形/半环/玫瑰图（charts 子库）', props: 'data, variant, inner-radius, center-text, height, legend, loading, error', events: 'af-chart-pie:select, af-chart-pie:retry' },
  { tag: 'af-chart-radar', purpose: '雷达图，多维能力画像，单/双主体对比（charts 子库）', props: 'data, series, shape, height, legend, loading, error', events: 'af-chart-radar:select, af-chart-radar:retry' },
  { tag: 'af-chart-funnel', purpose: '漏斗图，转化漏斗 + 层间转化率（charts 子库）', props: 'data, show-rate, height, legend, loading, error', events: 'af-chart-funnel:select, af-chart-funnel:retry' },
];

// 生成 L3 组件简表 markdown（注入模板，替代硬编码表格，防与源码漂移）
// components 非空时按需只生成指定组件行（组件 API 按需加载）
export function buildComponentTableSection(meta = COMPONENT_META, components = []) {
  const rows = components.length
    ? COMPONENT_META.filter(c => components.includes(c.tag))
    : COMPONENT_META;
  const lines = [
    '| 组件 | 用途 | 核心属性 | 核心事件 |',
    '|---|---|---|---|',
  ];
  for (const c of rows) {
    lines.push(`| \`<${c.tag}>\` | ${c.purpose} | ${c.props} | ${c.events} |`);
  }
  // 表尾注脚：方法签名与事件 payload 不进简表（防膨胀），指路包内类型声明单一真相源
  lines.push('');
  lines.push('注：方法签名与事件 payload 见包内 `src/index.d.ts`（已安装项目读 `node_modules/@af-mobile/ui/src/index.d.ts`，一次读全，禁止逐个读组件源码）。');
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

// ===== 2B 模块化：Few-shot 动态检索 =====
// 需求关键词 → page 模式（与模板「模式选择决策树」同源）
const FEWSHOT_KEYWORDS = {
  'page-login': ['登录', '注册', '验证码', '找回密码'],
  'page-list': ['列表', '浏览', '商品列表', '订单列表', '消息列表'],
  'page-detail': ['详情', '展示', '文章详情', '商品详情'],
  'page-form': ['表单', '报名', '反馈', '地址', '录入'],
  'page-search': ['搜索', '筛选'],
  'page-profile': ['个人中心', '设置', '我的'],
  'page-empty': ['空态', '无权限', '网络错误', '404'],
};

// 从需求描述检索应注入的 few-shot 类别；无命中返回 null（不缩小，回退全量）
export function pickCategories(userPrompt) {
  if (!userPrompt) return null;
  const found = new Set();
  for (const [cat, kws] of Object.entries(FEWSHOT_KEYWORDS)) {
    if (kws.some(k => userPrompt.includes(k))) found.add(cat);
  }
  return found.size ? [...found] : null;
}

// 从模板按类别过滤 Few-shot 示例块（动态检索）；categories 为空则原样返回
export function filterFewshots(tpl, categories) {
  if (!categories || !categories.length) return tpl;
  const need = new Set(categories);
  const start = tpl.indexOf('# Few-shot 示例');
  if (start === -1) return tpl;
  const nextH = tpl.indexOf('\n# ', start + 1);
  const end = nextH === -1 ? tpl.length : nextH;
  const section = tpl.slice(start, end);
  // 按 '## 示例 N：page-xxx' 切块，保留未命中的前缀（章节标题行）
  const parts = section.split(/(?=## 示例 \d+：)/);
  const kept = [parts[0]];
  for (let i = 1; i < parts.length; i++) {
    const m = /## 示例 \d+：(page-[a-z-]+)/.exec(parts[i]);
    if (m && need.has(m[1])) kept.push(parts[i]);
  }
  return tpl.slice(0, start) + kept.join('') + tpl.slice(end);
}

// ===== 2B 模块化：buildPrompt（Prompt 即 API）=====
// 角色（固定）+ 白名单（半固定）+ 组件 API（按需）+ Few-shot（动态检索）+ 模型特化 + 主题扩展 组合
// 无参 buildPrompt() = 全量（等价旧构建，CI 快照用）
// buildPrompt({ userPrompt }) = 按需求关键词自动裁剪 few-shot
// buildPrompt({ components, categories }) = 显式指定组件表与 few-shot
// buildPrompt({ model }) = 拼 prompt/models/{model}.md 模型特化头
// buildPrompt({ theme }) = 注入项目 Token 段（数组=[名字...] 或 对象={名字: 值}）
export function buildPrompt({ components = [], categories = null, userPrompt = '', projectRecipes = null, model = '', theme = null } = {}) {
  const tpl = readFileSync(TEMPLATE, 'utf8');
  const wl = JSON.parse(readFileSync(WHITELIST, 'utf8'));
  const recipeGroups = extractGroupsFromCss(readFileSync(RECIPES_CSS, 'utf8'));
  const atomicGroups = extractGroupsFromCss(readFileSync(ATOMIC_CSS, 'utf8'));

  const wlSection = buildWhitelistSection(wl, recipeGroups, atomicGroups);
  const compSection = buildComponentTableSection(COMPONENT_META, components);

  let out = tpl
    .replaceAll('<!-- {{{ WHITELIST_INJECTION_POINT }}} -->', wlSection)
    .replaceAll('<!-- {{{ COMPONENT_TABLE_INJECTION_POINT }}} -->', compSection);

  // 动态检索 few-shot：显式 categories 优先，否则按 userPrompt 关键词自动选
  const cats = categories || (userPrompt ? pickCategories(userPrompt) : null);
  if (cats && cats.length) out = filterFewshots(out, cats);

  // 计数占位符
  out = out
    .replaceAll('{{{ TOKEN_COUNT }}}', String(wl.tokens.length))
    .replaceAll('{{{ RECIPE_COUNT }}}', String(wl.classes.recipe.length))
    .replaceAll('{{{ ATOMIC_COUNT }}}', String(wl.classes.atomic.length))
    .replaceAll('{{{ TOTAL_CLASS_COUNT }}}', String(wl.classes.recipe.length + wl.classes.atomic.length))
    .replaceAll('{{{ COMPONENT_COUNT }}}', String(wl.components.length));

  // 项目级扩展（可选）
  let extSection = '';
  if (projectRecipes && existsSync(projectRecipes)) {
    extSection = buildProjectExtensionSection(extractProjectExtensions(readFileSync(projectRecipes, 'utf8')));
  }
  out = out.replace('<!-- {{{ PROJECT_EXTENSION_INJECTION_POINT }}} -->', extSection);

  // 主题扩展：项目自定义 token（数组=只列名字，对象=名字+默认值）
  if (theme) {
    const tokens = Array.isArray(theme) ? theme : Object.keys(theme);
    if (tokens.length) {
      const row = tokens.map(t => '`' + t + '`').join(' ');
      out = out.replace('## 禁止内联 style 的属性',
        '## 项目 Token（theme 注入，' + tokens.length + ' 个）\n\n' + row + '\n\n## 禁止内联 style 的属性');
    }
  }

  // 模型特化头：拼在 prompt 最前
  if (model) {
    const modelPath = join(MODEL_DIR, model + '.md');
    if (existsSync(modelPath)) out = readFileSync(modelPath, 'utf8') + '\n\n' + out;
  }
  return out;
}

// 主流程
function main() {
  const args = process.argv.slice(2);
  let outPath = null;
  let projectRecipes = null;
  let components = [];
  let categories = null;
  let model = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-o' || args[i] === '--output') outPath = args[++i];
    else if (args[i] === '--project') projectRecipes = args[++i];
    else if (args[i] === '--stdout') outPath = null;
    else if (args[i] === '--model') model = args[++i];
    else if (args[i] === '-h' || args[i] === '--help') {
      console.error('Usage: build-prompt.mjs [-o OUT] [--project PATH] [--stdout] [--components a,b] [--categories a,b] [--model claude|gpt4|glm]');
      process.exit(0);
    }
    else if (args[i] === '--components') components = args[++i].split(',').filter(Boolean);
    else if (args[i] === '--categories') categories = args[++i].split(',').filter(Boolean);
  }

  const output = buildPrompt({ components, categories, projectRecipes, model });

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
