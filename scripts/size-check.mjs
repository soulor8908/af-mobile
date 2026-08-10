// AIFlow UI —— L3 体积预算验证脚本
// 用法：node scripts/size-check.mjs
// 依据 docs/design/l3-detailed-design.md §8.5 CI 体积监控（数字与下方 BUDGET 一致）
//   单组件 JS gzip ≤ 2.5KB   PR 阻断（CSS 计入 L1+L2 总预算，不单测）
//   基类 AfElement gzip     ≤ 0.85KB  PR 阻断
//   全部 20 组件 + 基类 gzip ≤ 19.5KB PR 阻断
//   按需引入 2 组件 gzip    ≤ 5.0KB   warn
// 实现：esbuild 打包+minify，Node zlib 测 gzip（原生，无 gzip-size 依赖）
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../');
const SRC = join(ROOT, 'src');

// 预算（L1+L2 来自 L4 §0.3 实测校准；L3 来自 L3 §8.5）
// v1.0.1 调整：基类含 escapeHtml 防 XSS（P0 安全），total 含 P0 修复（定位/焦点/转义）
// v1.0.2 调整：af-swiper 含 loop clone 无缝循环（P1-2），total 上调至 11.5KB
// v1.2.0 调整：新增 af-switch/af-search-bar/af-skeleton-page（IP-4/5/6），total 上调至 14KB
// v1.3.1 调整：
//   CSS 4.2→4.9KB：prefers-reduced-motion 降级（无障碍）+ --palette-* 抽象（主题正确性）+ af-list/af-backtop 宿主样式（wc-light-no-style 合规）
//   base 0.85→1.1KB：html 安全模板标签 + escapeHtml 命名实体（P0 XSS 防护）
//   perComponent 2.5→2.6KB：af-picker 含 ARIA listbox + scroll-snap + 键盘导航（无障碍）
// v1.3.2 调整：base 1.1→1.2KB，Number 类型空串回退 default（P2-3，避免 Number("")=0 导致除零）
// v1.3.3 调整：css 4.9→5.0KB，新增 skeleton 变体类（skeleton-circle/w-*/h-*，移除骨架屏内联 style）
// v1.4.0 调整：
//   CSS 5.0→5.2KB：新增 .upload-trigger/.upload-grid 配方 + .input:user-invalid 自动错误态（Constraint Validation API 联动）
//   CSS 5.2→5.3KB：upload 配方 gzip 实测 5.218KB，微调预算容纳
//   total 14→14.5KB：新增 af-upload 组件（IP-7）
// v1.4.1 调整：
//   CSS 5.3→5.5KB：af-img 内联 style 迁移到 recipes.css 宿主规则（P2-5 wc-light-no-style 合规）
// v1.5.0 调整：
//   CSS 5.5→8.0KB：新增 8 个纯 CSS 配方（checkbox/radio/spinner/progress/collapse/notice/rate/steps/segmented）
//   共 32 个新 class，零 JS 依赖，加完即用（recipe 70→102）+ 6 个 Light DOM 组件宿主样式
//   total 14.5→19.5KB：新增 6 个 Light DOM 组件（navbar/tabbar/stepper/field/pull-refresh/swipe-cell）
const BUDGET = {
  css: 8.0,            // KB，L1+L2 CSS（tokens+recipes+atomic，含 v1.5.0 新增 8 个纯 CSS 配方 + 6 个组件宿主样式）
  perComponent: 2.6,   // KB，单组件 JS（CSS 计入 L1+L2 总预算）
  base: 1.2,           // KB，AfElement 基类（含 html/escapeHtml XSS 防护 + Number 空串回退）
  total: 19.5,         // KB，20 组件 + 基类（含 P0 安全 + P1 loop clone + v1.2.0 新增 3 组件 + v1.4.0 af-upload + v1.5.0 新增 6 个 Light DOM 组件）
  onDemand2: 5.5,      // KB，按需 2 组件（warn，含 ARIA + 安全增强）
  coreRuntime: 3.7,     // KB，router(2.0)+state(0.7)+fetch(0.8)+容差(0.2)，独立预算不计入 total
};

const KB = 1024;
const fmt = (b) => (b / KB).toFixed(3) + 'KB';

// esbuild minify 单文件（external 掉基类/theme，只测本组件代码）
async function minifyGz(entry, external = []) {
  const res = await build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: 'esm',
    minify: true,
    legalComments: 'none',
    external,
    absWorkingDir: ROOT,
  });
  const code = res.outputFiles[0].text;
  return { gz: gzipSync(Buffer.from(code)).length, codeSize: code.length };
}

// 文件名 → 类名
const FILE_TO_NAME = {
  'af-list.js': 'AfList', 'af-swiper.js': 'AfSwiper', 'af-tabs.js': 'AfTabs',
  'af-dialog.js': 'AfDialog', 'af-toast.js': 'AfToast', 'af-action-sheet.js': 'AfActionSheet',
  'af-picker.js': 'AfPicker', 'af-dropdown.js': 'AfDropdown', 'af-img.js': 'AfImg',
  'af-backtop.js': 'AfBacktop', 'af-switch.js': 'AfSwitch', 'af-search-bar.js': 'AfSearchBar',
  'af-skeleton-page.js': 'AfSkeletonPage', 'af-upload.js': 'AfUpload',
  'af-navbar.js': 'AfNavbar', 'af-tabbar.js': 'AfTabbar', 'af-stepper.js': 'AfStepper',
  'af-field.js': 'AfField', 'af-pull-refresh.js': 'AfPullRefresh', 'af-swipe-cell.js': 'AfSwipeCell',
};
// 类名 → 文件名
const NAME_TO_FILE = Object.fromEntries(
  Object.entries(FILE_TO_NAME).map(([f, n]) => [n, f])
);

// 按需引入 2 组件：临时入口 import 基类 + 2 组件，bundle 后 minify+gz
async function onDemand2Gz(compA, compB) {
  const dir = mkdtempSync(join(tmpdir(), 'aiflow-size-'));
  const entry = join(dir, 'entry.js');
  // Windows 下 join 返回反斜杠，嵌入 JS 字符串会被当转义字符吞掉，统一转成正斜杠
  const toPosix = (p) => p.replace(/\\/g, '/');
  writeFileSync(entry,
    `import { AfElement } from '${toPosix(join(SRC, 'lib/af-element.js'))}';\n` +
    `import { ${compA} } from '${toPosix(join(SRC, 'components/' + NAME_TO_FILE[compA]))}';\n` +
    `import { ${compB} } from '${toPosix(join(SRC, 'components/' + NAME_TO_FILE[compB]))}';\n` +
    `// 引用以防 tree-shake 摇除\n` +
    `customElements.define('size-${compA.toLowerCase()}', ${compA});\n` +
    `customElements.define('size-${compB.toLowerCase()}', ${compB});\n`
  );
  const res = await build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: 'esm',
    minify: true,
    legalComments: 'none',
    absWorkingDir: ROOT,
  });
  return gzipSync(Buffer.from(res.outputFiles[0].text)).length;
}

// 核心运行时：router + state + fetch 合计 gzip（独立预算，不计入 total）
// 注意：package.json 的 sideEffects 只列了 "**/*.css"，src/lib/*.js 被视为无副作用，
// bare import 会被 esbuild tree-shake 摇除。因此用具名导入 + globalThis 引用强制保留代码
// （与 onDemand2Gz 用 customElements.define 防摇除同理）。
async function measureCoreRuntime() {
  const dir = mkdtempSync(join(tmpdir(), 'aiflow-core-'));
  const entry = join(dir, 'entry.js');
  const toPosix = (p) => p.replace(/\\/g, '/');
  writeFileSync(entry,
    `import { signal, computed, effect, batch, bus } from '${toPosix(join(SRC, 'lib/state.js'))}';\n` +
    `import { fetchPage, FetchError, TimeoutError, HttpError, AbortError, addInterceptor, removeInterceptor, invalidateCache, clearCache } from '${toPosix(join(SRC, 'lib/fetch.js'))}';\n` +
    `import { route, go, back, forward, beforeEach, afterEach, notFound, current, start } from '${toPosix(join(SRC, 'lib/router.js'))}';\n` +
    `// 引用以防 tree-shake 摇除\n` +
    `globalThis.__aiflow_core = [signal, computed, effect, batch, bus, fetchPage, FetchError, TimeoutError, HttpError, AbortError, addInterceptor, removeInterceptor, invalidateCache, clearCache, route, go, back, forward, beforeEach, afterEach, notFound, current, start];\n`
  );
  const res = await build({
    entryPoints: [entry],
    bundle: true, write: false, format: 'esm', minify: true, legalComments: 'none',
    absWorkingDir: ROOT,
  });
  return gzipSync(Buffer.from(res.outputFiles[0].text)).length;
}

async function main() {
  const external = ['../lib/af-element.js', '../lib/theme.js', './af-element.js', './theme.js'];

  // 0. L1+L2 CSS（tokens+recipes+atomic 拼接后 gzip）
  const cssFiles = ['tokens.css', 'recipes.css', 'atomic.css'];
  const cssConcat = cssFiles.map(f => readFileSync(join(SRC, f))).join('\n');
  const cssGz = gzipSync(cssConcat).length;

  // 1. 基类
  const baseGz = (await minifyGz(join(SRC, 'lib/af-element.js'))).gz;

  // 2. 各组件
  const comps = readdirSync(join(SRC, 'components')).filter(f => f.endsWith('.js')).sort();
  const compSizes = [];
  for (const f of comps) {
    const { gz } = await minifyGz(join(SRC, 'components', f), external);
    compSizes.push({ file: f, gz });
  }

  // 3. 全量 bundle（index.js，含基类 + 14 组件，不含 coreRuntime）
  // coreRuntime（router/state/fetch）独立预算，external 掉避免计入 total
  const totalRes = await build({
    entryPoints: [join(SRC, 'index.js')],
    bundle: true, write: false, format: 'esm', minify: true, legalComments: 'none',
    absWorkingDir: ROOT,
    external: ['./lib/router.js', './lib/state.js', './lib/fetch.js'],
  });
  const totalGz = gzipSync(Buffer.from(totalRes.outputFiles[0].text)).length;

  // 4. 按需 2 组件（取最大的两个，最坏情况）
  const top2 = [...compSizes].sort((a, b) => b.gz - a.gz).slice(0, 2);
  const top2Names = top2.map(c => FILE_TO_NAME[c.file]);
  const onDemandGz = await onDemand2Gz(top2Names[0], top2Names[1]);

  // 5. 核心运行时（router + state + fetch）
  const coreGz = await measureCoreRuntime();

  // === 报告 ===
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║          AIFlow UI —— 体积预算验证                      ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const violations = [];
  const warns = [];

  // L1+L2 CSS
  const cssOver = cssGz > BUDGET.css * KB;
  console.log(`L1+L2 CSS            ${fmt(cssGz).padStart(10)}  预算 ≤ ${BUDGET.css}KB  ${cssOver ? '✗ 超限' : '✓'}`);
  if (cssOver) violations.push(`L1+L2 CSS ${fmt(cssGz)} > ${BUDGET.css}KB`);

  // 基类
  const baseOver = baseGz > BUDGET.base * KB;
  console.log(`基类 AfElement      ${fmt(baseGz).padStart(10)}  预算 ≤ ${BUDGET.base}KB  ${baseOver ? '✗ 超限' : '✓'}`);
  if (baseOver) violations.push(`基类 AfElement ${fmt(baseGz)} > ${BUDGET.base}KB`);

  // 各组件
  console.log('');
  for (const c of compSizes) {
    const over = c.gz > BUDGET.perComponent * KB;
    console.log(`  ${c.file.padEnd(22)} ${fmt(c.gz).padStart(9)}  预算 ≤ ${BUDGET.perComponent}KB  ${over ? '✗ 超限' : '✓'}`);
    if (over) violations.push(`${c.file} ${fmt(c.gz)} > ${BUDGET.perComponent}KB`);
  }

  // 全量
  console.log('');
  const totalOver = totalGz > BUDGET.total * KB;
  console.log(`全量（20 组件+基类）  ${fmt(totalGz).padStart(10)}  预算 ≤ ${BUDGET.total}KB  ${totalOver ? '✗ 超限' : '✓'}`);
  if (totalOver) violations.push(`全量 ${fmt(totalGz)} > ${BUDGET.total}KB`);

  // 按需 2
  const onDemandOver = onDemandGz > BUDGET.onDemand2 * KB;
  console.log(`按需 2 组件（${top2Names.join('+')}） ${fmt(onDemandGz).padStart(8)}  预算 ≤ ${BUDGET.onDemand2}KB  ${onDemandOver ? '⚠ warn' : '✓'}`);
  if (onDemandOver) warns.push(`按需 2 组件 ${fmt(onDemandGz)} > ${BUDGET.onDemand2}KB`);

  // 核心运行时
  console.log('');
  const coreOver = coreGz > BUDGET.coreRuntime * KB;
  console.log(`核心运行时（state+fetch+router） ${fmt(coreGz).padStart(8)}  预算 ≤ ${BUDGET.coreRuntime}KB  ${coreOver ? '✗ 超限' : '✓'}`);
  if (coreOver) violations.push(`核心运行时 ${fmt(coreGz)} > ${BUDGET.coreRuntime}KB`);

  // 汇总
  console.log('\n──────────────────────────────────────────────────────────');
  if (violations.length) {
    console.log(`✗ PR 阻断：${violations.length} 项超限`);
    violations.forEach(v => console.log('   - ' + v));
  } else {
    console.log('✓ 全部阻断项通过');
  }
  if (warns.length) {
    console.log(`⚠ 警告：${warns.length} 项`);
    warns.forEach(v => console.log('   - ' + v));
  }
  console.log('');

  process.exit(violations.length === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(2); });
