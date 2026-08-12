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
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
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
// v1.6.0 调整（i18n 国际化）：
//   base 1.2→1.5KB：AfElement 新增 _applyI18n + localechange 订阅/清理
//   perComponent 2.6→2.8KB：16 个组件新增 static i18n 映射表
//   total 19.5→20.5KB：基类增量 + 16 组件映射表增量
//   coreRuntime 3.7→5.2KB：新增 i18n.js（字典 + API ~1.1KB）+ 容差(0.6)
// v1.7.0 调整（definePage 运行时）：
//   total 20.5→21.0KB：新增 af-data 组件（~1.4KB）- page/bind 外移到 coreRuntime
//   coreRuntime 5.2→7.0KB：新增 page.js（definePage 8 原语 ~1.5KB）+ bind.js（:bind 管道 ~1.0KB），独立预算不计入 total
//   新增 blocks 预算：L3.5 Block 层独立体积监控（不计入 total，与组件层分离）
// v1.7.1 调整（Block 体积治理）：
//   删除 blocksTotal 预算（反模式：测全量 bundle 但消费端从不全量加载，预算本身是误导）
//   删除 registerAllBlocks() 函数（反模式：诱导全量加载，Block 只能按需 import + define）
//   新增 blocksOnDemand3 预算：按需 3 Block bundle ≤6KB（模拟复杂页面真实场景，基类共享后增量极小）
//   单 Block ≤ 1.6KB 保留（防个别 Block 失控）
// v1.7.2 调整（page 子包解耦）：
//   coreRuntime 7.0→4.5KB：page.js + bind.js 移到 aiflow-ui/page 子包，主包核心运行时只剩 router+state+fetch+i18n
//   新增 pageSubpackage 预算：aiflow-ui/page 子包（page.js + bind.js + data-ref.js）独立监控 ≤2.5KB
//   af-data 改 import data-ref.js（轻量 Map），不再拖入 bind.js → page.js 链
// v1.7.3 调整（CSS 分层 + 按需 import）：
//   recipes.css 拆为 4 层：core/form/feedback/display
//   CSS 总预算 8.0→8.5KB：分层后单文件 gzip 字典不共享，略涨（实际 8.303KB）
//   新增 4 个分层独立预算：core 3.5 / form 2.2 / feedback 1.8 / display 1.9
//   消费端按需 import 'aiflow-ui/css/core' 等，首屏 CSS 从 8KB 降到 ~3KB
const BUDGET = {
  css: 8.5,            // KB，L1+L2 CSS 总预算（tokens+recipes-{core,form,feedback,display}+atomic，分层后 gzip 字典不共享，略涨）
  cssCore: 3.5,        // KB，recipes-core.css（按钮/容器/文本/列表/导航/布局/宿主，所有页面必引）
  cssForm: 2.2,        // KB，recipes-form.css（表单/checkbox/radio/af-field/af-stepper 宿主）
  cssFeedback: 1.8,    // KB，recipes-feedback.css（空态/骨架/标签/徽标/toast/spinner/progress/notice）
  cssDisplay: 1.9,     // KB，recipes-display.css（折叠/评分/步骤/分段）
  perComponent: 2.8,   // KB，单组件 JS（+i18n 映射表）
  base: 1.5,           // KB，AfElement 基类（+_applyI18n + localechange 订阅）
  total: 21.0,         // KB，21 组件 + 基类（含 af-data，page/bind 已移到子包）
  onDemand2: 5.5,      // KB，按需 2 组件（warn，含 ARIA + 安全增强）
  coreRuntime: 4.5,    // KB，router+state+fetch+i18n（page/bind 移到子包，独立预算不计入 total）
  pageSubpackage: 2.5, // KB，aiflow-ui/page 子包（page.js+bind.js+data-ref.js，独立预算不计入 total）
  perBlock: 1.6,       // KB，单 L3.5 Block JS（独立预算，不计入 total，含五态/a11y 容差）
  blocksOnDemand3: 6.0,// KB，按需 3 Block bundle（模拟复杂页面真实场景，含基类共享）
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
  'af-data.js': 'AfData',
};
// 类名 → 文件名
const NAME_TO_FILE = Object.fromEntries(
  Object.entries(FILE_TO_NAME).map(([f, n]) => [n, f])
);

// Block 文件名 → 类名（动态生成，新增 Block 自动适配）
const fileToBlockClass = (f) => {
  const base = f.replace(/\.js$/, '');
  const parts = base.split('-').slice(1);
  return 'Af' + parts.map(p => p[0].toUpperCase() + p.slice(1)).join('');
};
const toPosixBlock = (p) => p.replace(/\\/g, '/');

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
    // i18n.js/page.js/bind.js 属 coreRuntime，按需引入场景也 external 掉
    external: ['./lib/i18n.js', '../lib/i18n.js', './lib/page.js', '../lib/page.js', './lib/bind.js', '../lib/bind.js'],
  });
  return gzipSync(Buffer.from(res.outputFiles[0].text)).length;
}

// 核心运行时：router + state + fetch + i18n 合计 gzip（独立预算，不计入 total）
// v1.7.2：page.js + bind.js 移到 aiflow-ui/page 子包，主包核心运行时不含 definePage/:bind
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
    `import { t, getLocale, setLocale, initLocale, addMessages, messages } from '${toPosix(join(SRC, 'lib/i18n.js'))}';\n` +
    `// 引用以防 tree-shake 摇除\n` +
    `globalThis.__aiflow_core = [signal, computed, effect, batch, bus, fetchPage, FetchError, TimeoutError, HttpError, AbortError, addInterceptor, removeInterceptor, invalidateCache, clearCache, route, go, back, forward, beforeEach, afterEach, notFound, current, start, t, getLocale, setLocale, initLocale, addMessages, messages];\n`
  );
  const res = await build({
    entryPoints: [entry],
    bundle: true, write: false, format: 'esm', minify: true, legalComments: 'none',
    absWorkingDir: ROOT,
  });
  return gzipSync(Buffer.from(res.outputFiles[0].text)).length;
}

// aiflow-ui/page 子包：page.js + bind.js + data-ref.js 合计 gzip（独立预算，不计入 total）
// 消费端：import { definePage, initBind } from 'aiflow-ui/page'
// 依赖主包的 state.js/router.js（在 coreRuntime 预算内），此处 external 掉避免重复计入
async function measurePageSubpackage() {
  const dir = mkdtempSync(join(tmpdir(), 'aiflow-page-'));
  const entry = join(dir, 'entry.js');
  const toPosix = (p) => p.replace(/\\/g, '/');
  writeFileSync(entry,
    `import { definePage, state, derived, actions, clearPageState, getTransition, getKeepAlive } from '${toPosix(join(SRC, 'lib/page.js'))}';\n` +
    `import { initBind, registerDataRef, unregisterDataRef } from '${toPosix(join(SRC, 'lib/bind.js'))}';\n` +
    `// 引用以防 tree-shake 摇除\n` +
    `globalThis.__aiflow_page = [definePage, state, derived, actions, clearPageState, getTransition, getKeepAlive, initBind, registerDataRef, unregisterDataRef];\n`
  );
  const res = await build({
    entryPoints: [entry],
    bundle: true, write: false, format: 'esm', minify: true, legalComments: 'none',
    absWorkingDir: ROOT,
    external: ['./state.js', '../lib/state.js', './router.js', '../lib/router.js'],
  });
  return gzipSync(Buffer.from(res.outputFiles[0].text)).length;
}

async function main() {
  // i18n.js/page.js/bind.js 属于 coreRuntime（与 router/state/fetch 同级），在基类/组件/onDemand2 测量中均 external 掉
  const external = ['../lib/af-element.js', '../lib/theme.js', './af-element.js', './theme.js', '../lib/i18n.js', './i18n.js', '../lib/page.js', './page.js', '../lib/bind.js', './bind.js'];

  // 0. L1+L2 CSS（tokens + 4 层 recipes + atomic 拼接后 gzip）
  //    v1.7.3：recipes.css 拆为 4 层，构建消费端 bundle 时按需引入
  const cssFiles = ['tokens.css', 'recipes-core.css', 'recipes-form.css', 'recipes-feedback.css', 'recipes-display.css', 'atomic.css'];
  const cssConcat = cssFiles.map(f => readFileSync(join(SRC, f))).join('\n');
  const cssGz = gzipSync(cssConcat).length;

  // 0b. 4 个分层 CSS 独立预算（防某层失控，消费端按需 import）
  const cssLayerGz = {};
  for (const layer of ['core', 'form', 'feedback', 'display']) {
    cssLayerGz[layer] = gzipSync(readFileSync(join(SRC, `recipes-${layer}.css`))).length;
  }

  // 1. 基类（external i18n.js，属 coreRuntime）
  const baseGz = (await minifyGz(join(SRC, 'lib/af-element.js'), ['./i18n.js'])).gz;

  // 2. 各组件
  const comps = readdirSync(join(SRC, 'components')).filter(f => f.endsWith('.js')).sort();
  const compSizes = [];
  for (const f of comps) {
    const { gz } = await minifyGz(join(SRC, 'components', f), external);
    compSizes.push({ file: f, gz });
  }

  // 3. 全量 bundle（index.js，含基类 + 21 组件，不含 coreRuntime 和 Block）
  // coreRuntime（router/state/fetch/i18n/page/bind）独立预算，external 掉避免计入 total
  // Block（src/blocks/）独立预算（perBlock/blocksTotal），用 plugin external 掉避免计入 total
  const totalRes = await build({
    entryPoints: [join(SRC, 'index.js')],
    bundle: true, write: false, format: 'esm', minify: true, legalComments: 'none',
    absWorkingDir: ROOT,
    external: ['./lib/router.js', './lib/state.js', './lib/fetch.js', './lib/i18n.js', './lib/page.js', './lib/bind.js'],
    plugins: [{
      name: 'exclude-blocks',
      setup(b) {
        b.onResolve({ filter: /^\.\/blocks\// }, args => ({ path: args.path, external: true }));
      },
    }],
  });
  const totalGz = gzipSync(Buffer.from(totalRes.outputFiles[0].text)).length;

  // 4. 按需 2 组件（取最大的两个，最坏情况）
  const top2 = [...compSizes].sort((a, b) => b.gz - a.gz).slice(0, 2);
  const top2Names = top2.map(c => FILE_TO_NAME[c.file]);
  const onDemandGz = await onDemand2Gz(top2Names[0], top2Names[1]);

  // 5. 核心运行时（router + state + fetch + i18n，v1.7.2 起 page/bind 移到子包）
  const coreGz = await measureCoreRuntime();

  // 5b. aiflow-ui/page 子包（page.js + bind.js + data-ref.js，独立预算）
  const pageGz = await measurePageSubpackage();

  // 6. L3.5 Block 层（src/blocks/af-*.js，独立预算，不计入 total）
  //    perBlock：单 Block external 基类后测体积（防个别 Block 失控）
  //    blocksOnDemand3：按需 3 Block bundle（模拟复杂页面，基类共享后增量极小）
  //    不测全量 bundle（反模式：消费端从不全量加载 Block）
  const blocksDir = join(SRC, 'blocks');
  let blockSizes = [];
  let blocksOnDemand3Gz = 0;
  if (existsSync(blocksDir)) {
    const blockFiles = readdirSync(blocksDir).filter(f => /^af-.*\.js$/.test(f)).sort();
    const blockExternal = ['../lib/af-element.js', '../lib/theme.js', './af-element.js', './theme.js', '../lib/i18n.js', './i18n.js', '../lib/page.js', './page.js', '../lib/bind.js', './bind.js'];
    for (const f of blockFiles) {
      const { gz } = await minifyGz(join(blocksDir, f), blockExternal);
      blockSizes.push({ file: f, gz });
    }
    // 按需 3 Block bundle（取最大的 3 个，最坏情况；基类 AfElement 会被共享）
    const top3 = [...blockSizes].sort((a, b) => b.gz - a.gz).slice(0, 3);
    if (top3.length) {
      const dir2 = mkdtempSync(join(tmpdir(), 'aiflow-blocks-'));
      const entry2 = join(dir2, 'entry.js');
      const onDemand3Code = top3.map(b => {
        const cls = fileToBlockClass(b.file);
        const tag = b.file.replace(/\.js$/, '');
        return `import { ${cls} } from '${toPosixBlock(join(blocksDir, b.file))}';\ncustomElements.define('${tag}', ${cls});\n`;
      }).join('');
      writeFileSync(entry2, onDemand3Code);
      const blocksRes = await build({
        entryPoints: [entry2],
        bundle: true, write: false, format: 'esm', minify: true, legalComments: 'none',
        absWorkingDir: ROOT,
        external: blockExternal,
      });
      blocksOnDemand3Gz = gzipSync(Buffer.from(blocksRes.outputFiles[0].text)).length;
    }
  }

  // === 报告 ===
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║          AIFlow UI —— 体积预算验证                      ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const violations = [];
  const warns = [];

  // L1+L2 CSS
  const cssOver = cssGz > BUDGET.css * KB;
  console.log(`L1+L2 CSS（全量）    ${fmt(cssGz).padStart(10)}  预算 ≤ ${BUDGET.css}KB  ${cssOver ? '✗ 超限' : '✓'}`);
  if (cssOver) violations.push(`L1+L2 CSS ${fmt(cssGz)} > ${BUDGET.css}KB`);

  // 4 个分层 CSS 独立预算（消费端按需 import 'aiflow-ui/css/core' 等）
  const cssLayerBudget = { core: BUDGET.cssCore, form: BUDGET.cssForm, feedback: BUDGET.cssFeedback, display: BUDGET.cssDisplay };
  for (const layer of ['core', 'form', 'feedback', 'display']) {
    const gz = cssLayerGz[layer];
    const over = gz > cssLayerBudget[layer] * KB;
    console.log(`  recipes-${layer.padEnd(9)} ${fmt(gz).padStart(9)}  预算 ≤ ${cssLayerBudget[layer]}KB  ${over ? '✗ 超限' : '✓'}`);
    if (over) violations.push(`recipes-${layer}.css ${fmt(gz)} > ${cssLayerBudget[layer]}KB`);
  }

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
  console.log(`全量（21 组件+基类）  ${fmt(totalGz).padStart(10)}  预算 ≤ ${BUDGET.total}KB  ${totalOver ? '✗ 超限' : '✓'}`);
  if (totalOver) violations.push(`全量 ${fmt(totalGz)} > ${BUDGET.total}KB`);

  // 按需 2
  const onDemandOver = onDemandGz > BUDGET.onDemand2 * KB;
  console.log(`按需 2 组件（${top2Names.join('+')}） ${fmt(onDemandGz).padStart(8)}  预算 ≤ ${BUDGET.onDemand2}KB  ${onDemandOver ? '⚠ warn' : '✓'}`);
  if (onDemandOver) warns.push(`按需 2 组件 ${fmt(onDemandGz)} > ${BUDGET.onDemand2}KB`);

  // L3.5 Block 层（独立预算，按需 import 模式）
  if (blockSizes.length) {
    console.log('');
    for (const b of blockSizes) {
      const over = b.gz > BUDGET.perBlock * KB;
      console.log(`  ${b.file.padEnd(22)} ${fmt(b.gz).padStart(9)}  预算 ≤ ${BUDGET.perBlock}KB  ${over ? '✗ 超限' : '✓'}`);
      if (over) violations.push(`${b.file} ${fmt(b.gz)} > ${BUDGET.perBlock}KB`);
    }
    if (blocksOnDemand3Gz > 0) {
      const top3Names = [...blockSizes].sort((a, b) => b.gz - a.gz).slice(0, 3).map(b => b.file.replace(/\.js$/, ''));
      const onDemand3Over = blocksOnDemand3Gz > BUDGET.blocksOnDemand3 * KB;
      console.log(`按需 3 Block（${top3Names.join('+')}） ${fmt(blocksOnDemand3Gz).padStart(8)}  预算 ≤ ${BUDGET.blocksOnDemand3}KB  ${onDemand3Over ? '✗ 超限' : '✓'}`);
      if (onDemand3Over) violations.push(`按需 3 Block ${fmt(blocksOnDemand3Gz)} > ${BUDGET.blocksOnDemand3}KB`);
    }
  }

  // 核心运行时
  console.log('');
  const coreOver = coreGz > BUDGET.coreRuntime * KB;
  console.log(`核心运行时（state+fetch+router+i18n） ${fmt(coreGz).padStart(4)}  预算 ≤ ${BUDGET.coreRuntime}KB  ${coreOver ? '✗ 超限' : '✓'}`);
  if (coreOver) violations.push(`核心运行时 ${fmt(coreGz)} > ${BUDGET.coreRuntime}KB`);

  // aiflow-ui/page 子包
  const pageOver = pageGz > BUDGET.pageSubpackage * KB;
  console.log(`page 子包（page+bind+data-ref）     ${fmt(pageGz).padStart(10)}  预算 ≤ ${BUDGET.pageSubpackage}KB  ${pageOver ? '✗ 超限' : '✓'}`);
  if (pageOver) violations.push(`page 子包 ${fmt(pageGz)} > ${BUDGET.pageSubpackage}KB`);

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
