// af-mobile UI —— L3 体积预算验证脚本
// 用法：node scripts/size-check.mjs
// 依据 docs/design/l3-detailed-design.md §8.5 CI 体积监控（数字与下方 BUDGET 一致）
//   单组件 JS gzip ≤ 2.8KB   PR 阻断（CSS 计入 L1+L2 总预算，不单测）
//   基类 AfElement gzip     ≤ 2.0KB  PR 阻断
//   全部 30 组件 + 基类 gzip ≤ 23.0KB PR 阻断
//   按需引入 2 组件 gzip    ≤ 6.5KB   warn
//   (核心运行时 state+fetch+router+i18n+page+bind ≤ 6.8KB，独立预算不计入 total)
// 实现：esbuild 打包+minify，Node zlib 测 gzip（原生，无 gzip-size 依赖）
import { build, transform } from 'esbuild';
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
// v1.6.0 调整（i18n 国际化）：
//   base 1.2→1.5KB：AfElement 新增 _applyI18n + localechange 订阅/清理
//   perComponent 2.6→2.8KB：16 个组件新增 static i18n 映射表
//   total 19.5→20.5KB：基类增量 + 16 组件映射表增量
//   coreRuntime 3.7→5.2KB：新增 i18n.js（字典 + API ~1.1KB）+ 容差
// v3.0 调整（state.js Owner pattern，Phase 1 W1）：
//   coreRuntime 5.2→5.4KB：state.js 新增 createRoot/getOwner/untrack + computed tempEffect 引用 + _pendingSubs Map，移除 bus 死代码（净 +0.2KB）
// v3.1 调整（Phase 3 组件补齐，用户已确认）：
//   css 8.0→8.2KB：新增 af-badge 宿主样式（data-corner/dot/color 变体，wc-light-no-style 合规）
//   total 20.5→21.0KB：新增 af-badge 组件（21 组件 + 基类），预留 af-rate/af-calendar/af-cascade-picker 余量
// v3.2 调整（Phase 3 组件补齐，用户已确认）：
//   total 21.0→21.3KB：新增 af-rate 组件（22 组件 + 基类，复用 L2 .rate 纯 CSS 配方，JS 仅 0.72KB gzip）
// v3.3 调整（Phase 3 组件补齐，用户已确认）：
//   total 21.3→23.0KB：新增 af-calendar（Shadow DOM 日历，1.73KB gzip）+ 预留 af-cascade-picker 余量
// v3.4 调整（Phase 3 组件补齐）：
//   total 23.0 预算不变：新增 af-notice-bar（复用 L2 .notice 纯 CSS 配方，JS 仅 0.32KB gzip，优化实现压回 22.994KB ≤ 23KB）
// v3.5 调整（IP-7 组件补齐，用户已确认）：
//   total 23.0→23.6KB：新增 af-progress/af-steps（复用 L2 纯 CSS 配方）+ af-countdown，全量实测 23.519KB
// v3.6 调整（destroyPage 全局销毁位点，用户已确认）：
//   total 23.6→23.7KB：page.js 未 external（index.js 导出 createPage/destroyPage），新增 destroyPage 约 +100B gzip，实测 23.615KB
// v3.7 调整（definePage 全局单例移除，用户已确认）：
//   删除 definePage/destroyPage/clearPageState/getTransition/getKeepAlive，index.js 仅导出 createPage，total 实测回落
// v3.8 调整（P2+性能修复，用户已确认）：
//   total 23.7→23.8KB：af-list 虚拟滚动重渲染后补设 aria-activedescendant（跨屏回归，无障碍 bug 修复）
//   + bind.js 复杂对象优先走组件 property 赋值（:bind 大数组避免 JSON.stringify 往返），增量约 +24B gzip
// v3.9 调整（体积优化 A+B+D+E+F，用户已确认，total 23.135→19.982KB 达成 <20KB 目标）：
//   修复测量泄漏：external 未覆盖组件内 '../lib/i18n.js'、page.js 内 './state.js' 等路径变体，
//   i18n/page/bind/router/state 曾被误计入 total（约 -3.1KB）；page+bind 纳入 coreRuntime 独立预算
//   base 1.5→2.0KB：焦点陷阱/滚动锁/_listen 事件登记下沉基类（组件侧净删更多，实测 1.951KB）
//   total 23.8→20.0KB：泄漏修复 + defineProp 紧凑签名 + _listen 删手写解绑（实测 19.982KB，锚定 20KB 红线）
//   coreRuntime 5.4→6.8KB：新增 page.js+bind.js（createPage 页面运行时，实测 6.591KB）
//   onDemand2 5.5→6.5KB：i18n 泄漏修复后按需场景实测 6.041KB（warn 级）
// v3.10 调整（App 骨架 + register minify-safe，用户已确认）：
//   CSS 8.2→8.3KB：新增 .page-col/.scroll-y App 骨架配方（解决多页面应用布局缺口，AI 反复违规私建 class 的根因）
//   total 20.0→20.1KB：ea9f365 register/registerAll 改用显式 REGISTRY 字面量数组（minify-safe，P0 修复——
//     旧实现依赖 Function.name 推导 tag，esbuild 压缩类名后生产构建组件无法注册），实测 20.090KB
// v4.0 调整（Quiet Precision 设计刷新，用户已确认）：
//   CSS 8.3→9.0KB：token 体系升级（品牌色阶/display 字号/10px+圆角/双层阴影）+ 新配方（.display/.eyebrow/.section/.section-title）
//     + 控件精修（按钮渐变辉光/输入框 focus ring/卡片边框），实测 8.909KB
// v4.1 调整（原子类缺口补齐 + CSS 预算口径修正，用户已确认）：
//   新增 6 个缺口原子类：fi/shrink-0/lh-tight/lh-normal/bg-card/ellipsis（消费端高频，原先只能违规私建）
//   CSS 预算口径修正：raw 拼接 gzip → esbuild minify 后 gzip（与消费端 vite 构建一致，原口径虚高约 3.3KB 掩盖真实增长）
//   预算 9.0→6.0KB（minify 口径），原子类补齐后实测 ~5.6KB
// v4.3 调整（支付组件对 af-number-keyboard + af-password-input，用户已确认）：
//   total 20.4→23.0KB：新增 2 组件（30 组件 + 基类），预估 +2.5KB 含容差
// v4.4 调整（P1 监听器注册表加固 + 体积压回，走 AGENTS §2 失败处理表「优化实现」路径，未动任何预算）：
//   _listen 新增死条目惰性回收 + (target,type,handler,capture) 去重后 base 一度 2.070KB 超限；
//   escapeHtml/html 拆分至 lib/html.js（共享运行时模块，非生命周期核心），CORE_MODULES 登记 'html'，
//   基类一行再导出保持全部既有 import 路径兼容——base 回落 ≤ 2KB，total 不升（lib 共享模块本就不计入 total）
const BUDGET = {
  css: 7.0,            // KB，L1+L2 CSS（tokens+recipes+atomic，minify 后 gzip 口径；v1.6.1 上调 6.0→7.0：新增 40 个高视觉 class，用户已确认，实测 ~6.9KB）
  perComponent: 2.8,   // KB，单组件 JS（+i18n 映射表）
  base: 2.0,           // KB，AfElement 基类（焦点陷阱/滚动锁/_listen 事件登记下沉，v3.9）
  total: 23.0,         // KB，30 组件 + 基类（v4.3：新增 af-number-keyboard/af-password-input，20.4 上调容纳）
  onDemand2: 6.5,      // KB，按需 2 组件（warn，含 ARIA + 安全增强）
  coreRuntime: 6.8,    // KB，router+state+fetch+i18n+page+bind，独立预算不计入 total（v3.9 纳入 page/bind）
  // charts 子库（charts-sublibrary-detailed-design.md §7）：独立入口 ./charts，不计入 total
  chartsRuntime: 4.5,  // KB，charts 内核（scale+geometry+render+chart-theme+tooltip+chart-base，Phase 2 radar/funnel 复用）
  chartsPerComponent: 2.8, // KB，单图表组件（同主库 perComponent 语义）
  chartsTotal: 15.0,   // KB，charts 全量（Phase 1 预估 ~11KB，预留 Phase 2 radar+funnel ~2.5KB + 容差）
  // chat 子库（src/chat，独立入口 @af-mobile/ui/chat，不计入主库 total）：AI 对话会话核心（OpenAI SSE + 工具循环）
  chatRuntime: 2.5,    // KB，session+message+stream+tool 内核 + ct.* 字典（独立预算；v2.1.0 富内容后实测 2.157KB，regenerate/resend/think 解析 +209B）
  // chatUI 3.0→3.3（v2.0.0 实施）：af-chat 为复合容器（气泡流+composer+chips+错误重试+回底+卡片渲染管线）。
  // chatUI 3.3→4.6（v2.1.0 富内容，D-013 用户确认）：markdown 安全子集渲染（lib/md.js，escape-first）+ 代码块复制
  //   + 思考折叠（原生 details）+ 消息操作行（复制/重新生成）+ 忙碌排队 + 草稿事件；实测 4.514KB，
  //   含 v2.0.0 遗留欠账 147B（auto-grow/三点占位/clear/retry 已落地未调预算）。
  // 总量约束：chat 子库合计 ≤ 7.1KB（docs/design/af-chat-rich-features-design.md，覆盖旧版 §9 的 5.5KB）
  chatUI: 4.6,         // KB，af-chat 组件 + render 渲染器 + md 渲染器（UI 层；基类/with-i18n/i18n 与主库共享 external，session 经 property 注入不静态依赖）
  // k 渲染层（src/k，独立入口 @af-mobile/ui/k，不计入主库 total）：html`` 声明式模板 + 细粒度响应式绑定
  // 响应式核心复用 lib/state.js（external 共享，不重复计费）；实测 1.399KB，与 chat 内核同量级
  kRuntime: 2.0,       // KB，html``+Show/For/Switch+render/clean（B3 实验：代码量 -23%，会话成本 -24%）
  // blocks 子库（src/blocks，独立入口 @af-mobile/ui/blocks，不计入主库 total）：L3.5 业务积木
  // A/B 实验期 5 个（product-grid/order-list/auth-form/product-card/setting-group）；
  // 基类/i18n 与主库共享 external。auth-form 为最复杂 Block（双 variant+校验+倒计时+28 条双语文典），
  // 实测字典占 ~0.6KB 为 gzip 地板，单 Block 上限取 2.1KB（设计文档 §9.1"复杂 Block 可至 2KB"+字典容差）
  blocksBase: 2.0,         // KB，list-block 共享基座（五态机 + 键盘导航 + 点击委托）
  blocksPerComponent: 2.1, // KB，单 Block（auth-form 实测 2.010KB，字典地板）
  blocksTotal: 12.0,       // KB，5 Block + 基座 + 入口（设计文档 42 Block 全量 ≤ 15KB 的实验期子集预算）
};

const KB = 1024;
const fmt = (b) => (b / KB).toFixed(3) + 'KB';

// 核心运行时模块：所有组件侧测量（total / 单组件 / 按需 / 基类）一律 external，不计入组件体积
// 路径变体：index.js 写 './lib/x.js'，组件写 '../lib/x.js'，lib 内部互引写 './x.js'——漏一种就会被误打包（v3.9 前的测量泄漏根源）
const CORE_MODULES = ['router', 'state', 'fetch', 'i18n', 'resource', 'theme', 'page', 'bind', 'data-ref', 'html'];
const CORE_EXT = CORE_MODULES.flatMap((m) => [`./lib/${m}.js`, `../lib/${m}.js`, `./${m}.js`]);

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
  'af-picker.js': 'AfPicker', 'af-cascade-picker.js': 'AfCascadePicker', 'af-dropdown.js': 'AfDropdown', 'af-img.js': 'AfImg',
  'af-backtop.js': 'AfBacktop', 'af-badge.js': 'AfBadge', 'af-calendar.js': 'AfCalendar', 'af-switch.js': 'AfSwitch', 'af-search-bar.js': 'AfSearchBar',
  'af-skeleton-page.js': 'AfSkeletonPage', 'af-upload.js': 'AfUpload',
  'af-navbar.js': 'AfNavbar', 'af-tabbar.js': 'AfTabbar', 'af-stepper.js': 'AfStepper',
  'af-field.js': 'AfField', 'af-pull-refresh.js': 'AfPullRefresh', 'af-swipe-cell.js': 'AfSwipeCell',
  'af-rate.js': 'AfRate',
  'af-notice-bar.js': 'AfNoticeBar',
  'af-progress.js': 'AfProgress',
  'af-steps.js': 'AfSteps',
  'af-countdown.js': 'AfCountdown',
  'af-number-keyboard.js': 'AfNumberKeyboard',
  'af-password-input.js': 'AfPasswordInput',
};
// 类名 → 文件名
const NAME_TO_FILE = Object.fromEntries(
  Object.entries(FILE_TO_NAME).map(([f, n]) => [n, f])
);

// 按需引入 2 组件：临时入口 import 基类 + 2 组件，bundle 后 minify+gz
async function onDemand2Gz(compA, compB) {
  const dir = mkdtempSync(join(tmpdir(), 'af-mobile-size-'));
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
    // 核心运行时模块 external 掉（i18n/page/bind 等，见 CORE_EXT 注释）
    external: CORE_EXT,
  });
  return gzipSync(Buffer.from(res.outputFiles[0].text)).length;
}

// charts 内核：scale+geometry+render+chart-theme+tooltip+chart-base 合计 gzip
// （external 掉主库基类/with-i18n/i18n，与 coreRuntime 同法防 tree-shake）
async function measureChartsRuntime() {
  const dir = mkdtempSync(join(tmpdir(), 'af-mobile-charts-'));
  const entry = join(dir, 'entry.js');
  const toPosix = (p) => p.replace(/\\/g, '/');
  const lib = (f) => toPosix(join(SRC, 'charts/lib', f));
  writeFileSync(entry,
    `import { niceTicks, linear } from '${lib('scale.js')}';\n` +
    `import { linePath, areaPath, arcPath, polar, fmtNum } from '${lib('geometry.js')}';\n` +
    `import { svgEl, bindResize, bindLazy } from '${lib('render.js')}';\n` +
    `import { CHART_COLORS, seriesColor, seriesOpacity, CHART_CSS } from '${lib('chart-theme.js')}';\n` +
    `import { createTooltip, nearestIndex } from '${lib('tooltip.js')}';\n` +
    `import { AfChart } from '${lib('chart-base.js')}';\n` +
    `// 引用以防 tree-shake 摇除\n` +
    `globalThis.__afMobile_charts = [niceTicks, linear, linePath, areaPath, arcPath, polar, fmtNum, svgEl, bindResize, bindLazy, CHART_COLORS, seriesColor, seriesOpacity, CHART_CSS, createTooltip, nearestIndex, AfChart];\n`
  );
  const res = await build({
    entryPoints: [entry],
    bundle: true, write: false, format: 'esm', minify: true, legalComments: 'none',
    absWorkingDir: ROOT,
    external: ['../../lib/af-element.js', '../../lib/with-i18n.js', '../../lib/i18n.js'],
  });
  return gzipSync(Buffer.from(res.outputFiles[0].text)).length;
}

// 核心运行时：router + state + fetch + i18n 合计 gzip（独立预算，不计入 total）
// 注意：package.json 的 sideEffects 只列了 "**/*.css"，src/lib/*.js 被视为无副作用，
// bare import 会被 esbuild tree-shake 摇除。因此用具名导入 + globalThis 引用强制保留代码
// （与 onDemand2Gz 用 customElements.define 防摇除同理）。
async function measureCoreRuntime() {
  const dir = mkdtempSync(join(tmpdir(), 'af-mobile-core-'));
  const entry = join(dir, 'entry.js');
  const toPosix = (p) => p.replace(/\\/g, '/');
  writeFileSync(entry,
    `import { signal, computed, effect, batch, createRoot, getOwner, untrack } from '${toPosix(join(SRC, 'lib/state.js'))}';\n` +
    `import { createResource } from '${toPosix(join(SRC, 'lib/resource.js'))}';\n` +
    `import { fetchPage, FetchError, TimeoutError, HttpError, AbortError, addInterceptor, removeInterceptor, invalidateCache, clearCache, setCacheAdapter, localStorageAdapter } from '${toPosix(join(SRC, 'lib/fetch.js'))}';\n` +
    `import { route, go, back, forward, beforeEach, afterEach, notFound, current, start } from '${toPosix(join(SRC, 'lib/router.js'))}';\n` +
    `import { t, getLocale, setLocale, initLocale, addMessages, messages } from '${toPosix(join(SRC, 'lib/i18n.js'))}';\n` +
    `import { createPage } from '${toPosix(join(SRC, 'lib/page.js'))}';\n` +
    `// 引用以防 tree-shake 摇除\n` +
    `globalThis.__afMobile_core = [signal, computed, effect, batch, createRoot, getOwner, untrack, createResource, fetchPage, FetchError, TimeoutError, HttpError, AbortError, addInterceptor, removeInterceptor, invalidateCache, clearCache, setCacheAdapter, localStorageAdapter, route, go, back, forward, beforeEach, afterEach, notFound, current, start, t, getLocale, setLocale, initLocale, addMessages, messages, createPage];\n`
  );
  const res = await build({
    entryPoints: [entry],
    bundle: true, write: false, format: 'esm', minify: true, legalComments: 'none',
    absWorkingDir: ROOT,
  });
  return gzipSync(Buffer.from(res.outputFiles[0].text)).length;
}

// chat 子库内核：session + message + stream + tool + i18n 字典 合计 gzip（独立入口 @af-mobile/ui/chat，不计入主库 total）
// 框架无关（无 DOM/CSS/第三方依赖），纯函数式，同一套 防 tree-shake 引用法
// ct.* 字典在 chat/i18n.js（addMessages 注册，不占主库核心运行时），随入口发布 → 计入本口径
async function measureChatRuntime() {
  const dir = mkdtempSync(join(tmpdir(), 'af-mobile-chat-'));
  const entry = join(dir, 'entry.js');
  const toPosix = (p) => p.replace(/\\/g, '/');
  const chat = (f) => toPosix(join(SRC, 'chat', f));
  writeFileSync(entry,
    `import { createSession } from '${chat('session.js')}';\n` +
    `import { createMessage } from '${chat('message.js')}';\n` +
    `import { parseSSE } from '${chat('stream.js')}';\n` +
    `import { defineTool } from '${chat('tool.js')}';\n` +
    `import '${chat('i18n.js')}';\n` +
    `// 引用以防 tree-shake 摇除\n` +
    `globalThis.__afMobile_chat = [createSession, createMessage, parseSSE, defineTool];\n`
  );
  const res = await build({
    entryPoints: [entry],
    bundle: true, write: false, format: 'esm', minify: true, legalComments: 'none',
    absWorkingDir: ROOT,
    external: ['../lib/i18n.js'], // i18n 运行时与主库共享（chat/i18n.js 仅注册 ct.* 字典）
  });
  return gzipSync(Buffer.from(res.outputFiles[0].text)).length;
}

// chat 子库 UI 层：af-chat 组件 + render 渲染器（随 @af-mobile/ui/chat 入口发布，不计入主库 total）
// 基类 af-element/with-i18n/i18n 与主库共享，external 掉（与主库组件测量口径一致）
// 注意：直接从组件文件导入（不经 chat/index.js）——组件对 session 是 property 注入而非静态 import，
// 从 index.js 导入会把 session/message/stream/tool 一并打进 chatUI 口径
async function measureChatUI() {
  const dir = mkdtempSync(join(tmpdir(), 'af-mobile-chat-ui-'));
  const entry = join(dir, 'entry.js');
  const toPosix = (p) => p.replace(/\\/g, '/');
  writeFileSync(entry,
    `import { AfChat } from '${toPosix(join(SRC, 'chat/components/af-chat.js'))}';\n` +
    `// 引用以防 tree-shake 摇除\n` +
    `globalThis.__afMobile_chatUI = [AfChat];\n`
  );
  const res = await build({
    entryPoints: [entry],
    bundle: true, write: false, format: 'esm', minify: true, legalComments: 'none',
    absWorkingDir: ROOT,
    external: [...CORE_EXT, '../../lib/af-element.js', '../../lib/with-i18n.js'],
  });
  return gzipSync(Buffer.from(res.outputFiles[0].text)).length;
}

// k 渲染层（独立入口 @af-mobile/ui/k，不计入主库 total）：html``+Show/For/Switch+render/clean
// D-001=B：入口另含 res/route 原语（createResource + router 全套）
// 共享运行时 lib/state.js、lib/resource.js、lib/router.js 与主库同模块单份，external 掉（防重复计费）
async function measureKRuntime() {
  const dir = mkdtempSync(join(tmpdir(), 'af-mobile-k-'));
  const entry = join(dir, 'entry.js');
  const toPosix = (p) => p.replace(/\\/g, '/');
  writeFileSync(entry,
    `import { html, Show, For, Switch, render, clean, createResource, route, go, current, start } from '${toPosix(join(SRC, 'k/index.js'))}';\n` +
    `// 引用以防 tree-shake 摇除\n` +
    `globalThis.__afMobile_k = [html, Show, For, Switch, render, clean, createResource, route, go, current, start];\n`
  );
  const res = await build({
    entryPoints: [entry],
    bundle: true, write: false, format: 'esm', minify: true, legalComments: 'none',
    absWorkingDir: ROOT,
    external: [
      '../lib/state.js', './state.js',
      '../lib/resource.js', './resource.js',
      '../lib/router.js', './router.js',
    ],
  });
  return gzipSync(Buffer.from(res.outputFiles[0].text)).length;
}

async function main() {
  // 核心运行时模块（CORE_EXT）在基类/组件/onDemand2 测量中均 external 掉
  // af-cascade-picker 复用 af-picker（子类继承滚轮内核）：af-picker 单独测一次，级联组件只测增量
  const external = [...CORE_EXT, '../lib/af-element.js', './af-element.js', './af-picker.js', '../components/af-picker.js'];

  // 0. L1+L2 CSS（tokens+recipes+atomic 拼接后 minify + gzip，与消费端 vite 构建口径一致）
  const cssFiles = ['tokens.css', 'recipes.css', 'atomic.css'];
  const cssConcat = cssFiles.map(f => readFileSync(join(SRC, f))).join('\n');
  const { code: cssMin } = await transform(cssConcat, { loader: 'css', minify: true });
  const cssGz = gzipSync(Buffer.from(cssMin)).length;

  // 1. 基类（核心运行时模块 external，见 CORE_EXT）
  const baseGz = (await minifyGz(join(SRC, 'lib/af-element.js'), CORE_EXT)).gz;

  // 2. 各组件
  const comps = readdirSync(join(SRC, 'components')).filter(f => f.endsWith('.js')).sort();
  const compSizes = [];
  for (const f of comps) {
    const { gz } = await minifyGz(join(SRC, 'components', f), external);
    compSizes.push({ file: f, gz });
  }

  // 3. 全量 bundle（index.js，含基类 + 30 组件，不含 coreRuntime）
  // coreRuntime（router/state/fetch/i18n/resource/theme/page/bind）独立预算，external 掉避免计入 total
  const totalRes = await build({
    entryPoints: [join(SRC, 'index.js')],
    bundle: true, write: false, format: 'esm', minify: true, legalComments: 'none',
    absWorkingDir: ROOT,
    external: CORE_EXT,
  });
  const totalGz = gzipSync(Buffer.from(totalRes.outputFiles[0].text)).length;

  // 4. 按需 2 组件（取最大的两个，最坏情况）
  const top2 = [...compSizes].sort((a, b) => b.gz - a.gz).slice(0, 2);
  const top2Names = top2.map(c => FILE_TO_NAME[c.file]);
  const onDemandGz = await onDemand2Gz(top2Names[0], top2Names[1]);

  // 5. 核心运行时（router + state + fetch）
  const coreGz = await measureCoreRuntime();

  // 6. charts 子库（独立入口，不计入主库 total）
  //    内核 external 掉主库基类/i18n（属主库与 coreRuntime）；组件 external 掉基类 + charts 内核
  const chartsExternal = ['../../lib/af-element.js', '../../lib/with-i18n.js', '../../lib/i18n.js',
    '../lib/chart-base.js', '../lib/scale.js', '../lib/geometry.js', '../lib/render.js',
    '../lib/chart-theme.js', '../lib/tooltip.js'];
  const chartsComps = readdirSync(join(SRC, 'charts/components')).filter(f => f.endsWith('.js')).sort();
  const chartCompSizes = [];
  for (const f of chartsComps) {
    const { gz } = await minifyGz(join(SRC, 'charts/components', f), chartsExternal);
    chartCompSizes.push({ file: f, gz });
  }
  const chartsRuntimeGz = await measureChartsRuntime();
  const chartsTotalRes = await build({
    entryPoints: [join(SRC, 'charts/index.js')],
    bundle: true, write: false, format: 'esm', minify: true, legalComments: 'none',
    absWorkingDir: ROOT,
    external: ['../lib/af-element.js', '../lib/with-i18n.js', '../lib/i18n.js'],
  });
  const chartsTotalGz = gzipSync(Buffer.from(chartsTotalRes.outputFiles[0].text)).length;

  // === 报告 ===
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║          af-mobile UI —— 体积预算验证                      ║');
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
  console.log(`全量（30 组件+基类）  ${fmt(totalGz).padStart(10)}  预算 ≤ ${BUDGET.total}KB  ${totalOver ? '✗ 超限' : '✓'}`);
  if (totalOver) violations.push(`全量 ${fmt(totalGz)} > ${BUDGET.total}KB`);

  // 按需 2
  const onDemandOver = onDemandGz > BUDGET.onDemand2 * KB;
  console.log(`按需 2 组件（${top2Names.join('+')}） ${fmt(onDemandGz).padStart(8)}  预算 ≤ ${BUDGET.onDemand2}KB  ${onDemandOver ? '⚠ warn' : '✓'}`);
  if (onDemandOver) warns.push(`按需 2 组件 ${fmt(onDemandGz)} > ${BUDGET.onDemand2}KB`);

  // 核心运行时
  console.log('');
  const coreOver = coreGz > BUDGET.coreRuntime * KB;
  console.log(`核心运行时（state+fetch+router+i18n+page+bind） ${fmt(coreGz).padStart(4)}  预算 ≤ ${BUDGET.coreRuntime}KB  ${coreOver ? '✗ 超限' : '✓'}`);
  if (coreOver) violations.push(`核心运行时 ${fmt(coreGz)} > ${BUDGET.coreRuntime}KB`);

  // charts 子库（独立入口 ./charts，不计入主库 total）
  console.log('\n── charts 子库（@af-mobile/ui/charts，独立预算）──');
  const chartsRuntimeOver = chartsRuntimeGz > BUDGET.chartsRuntime * KB;
  console.log(`charts 内核（6 模块）   ${fmt(chartsRuntimeGz).padStart(10)}  预算 ≤ ${BUDGET.chartsRuntime}KB  ${chartsRuntimeOver ? '✗ 超限' : '✓'}`);
  if (chartsRuntimeOver) violations.push(`charts 内核 ${fmt(chartsRuntimeGz)} > ${BUDGET.chartsRuntime}KB`);
  for (const c of chartCompSizes) {
    const over = c.gz > BUDGET.chartsPerComponent * KB;
    console.log(`  ${c.file.padEnd(22)} ${fmt(c.gz).padStart(9)}  预算 ≤ ${BUDGET.chartsPerComponent}KB  ${over ? '✗ 超限' : '✓'}`);
    if (over) violations.push(`charts/${c.file} ${fmt(c.gz)} > ${BUDGET.chartsPerComponent}KB`);
  }
  const chartsTotalOver = chartsTotalGz > BUDGET.chartsTotal * KB;
  console.log(`charts 全量（${chartCompSizes.length} 组件+内核）${fmt(chartsTotalGz).padStart(9)}  预算 ≤ ${BUDGET.chartsTotal}KB  ${chartsTotalOver ? '✗ 超限' : '✓'}`);
  if (chartsTotalOver) violations.push(`charts 全量 ${fmt(chartsTotalGz)} > ${BUDGET.chartsTotal}KB`);

  // chat 子库（独立入口 ./chat，不计入主库 total）
  console.log('\n── chat 子库（@af-mobile/ui/chat，独立预算）──');
  const chatRuntimeGz = await measureChatRuntime();
  const chatRuntimeOver = chatRuntimeGz > BUDGET.chatRuntime * KB;
  console.log(`chat 内核（session+message+stream+tool+i18n）${fmt(chatRuntimeGz).padStart(4)}  预算 ≤ ${BUDGET.chatRuntime}KB  ${chatRuntimeOver ? '✗ 超限' : '✓'}`);
  if (chatRuntimeOver) violations.push(`chat 内核 ${fmt(chatRuntimeGz)} > ${BUDGET.chatRuntime}KB`);
  const chatUIGz = await measureChatUI();
  const chatUIOver = chatUIGz > BUDGET.chatUI * KB;
  console.log(`chat UI（af-chat+render）  ${fmt(chatUIGz).padStart(10)}  预算 ≤ ${BUDGET.chatUI}KB  ${chatUIOver ? '✗ 超限' : '✓'}`);
  if (chatUIOver) violations.push(`chat UI ${fmt(chatUIGz)} > ${BUDGET.chatUI}KB`);

  // k 渲染层（独立入口 ./k，不计入主库 total）
  console.log('\n── k 渲染层（@af-mobile/ui/k，独立预算）──');
  const kGz = await measureKRuntime();
  const kOver = kGz > BUDGET.kRuntime * KB;
  console.log(`k 渲染层（html模板+控制流）  ${fmt(kGz).padStart(10)}  预算 ≤ ${BUDGET.kRuntime}KB  ${kOver ? '✗ 超限' : '✓'}`);
  if (kOver) violations.push(`k 渲染层 ${fmt(kGz)} > ${BUDGET.kRuntime}KB`);

  // blocks 子库（独立入口 ./blocks，不计入主库 total）：基类/i18n external 共享，基座单测
  console.log('\n── blocks 子库（@af-mobile/ui/blocks，独立预算）──');
  const blocksLibExternal = ['../lib/af-element.js', '../lib/with-i18n.js', '../lib/i18n.js'];
  const { gz: blocksBaseGz } = await minifyGz(join(SRC, 'blocks/list-block.js'), blocksLibExternal);
  const blocksBaseOver = blocksBaseGz > BUDGET.blocksBase * KB;
  console.log(`list-block 基座     ${fmt(blocksBaseGz).padStart(10)}  预算 ≤ ${BUDGET.blocksBase}KB  ${blocksBaseOver ? '✗ 超限' : '✓'}`);
  if (blocksBaseOver) violations.push(`blocks 基座 ${fmt(blocksBaseGz)} > ${BUDGET.blocksBase}KB`);
  const blocksComps = readdirSync(join(SRC, 'blocks')).filter(f => /^af-.*\.js$/.test(f)).sort();
  for (const f of blocksComps) {
    const { gz } = await minifyGz(join(SRC, 'blocks', f), [...blocksLibExternal, './list-block.js']);
    const over = gz > BUDGET.blocksPerComponent * KB;
    console.log(`  ${f.padEnd(22)} ${fmt(gz).padStart(9)}  预算 ≤ ${BUDGET.blocksPerComponent}KB  ${over ? '✗ 超限' : '✓'}`);
    if (over) violations.push(`blocks/${f} ${fmt(gz)} > ${BUDGET.blocksPerComponent}KB`);
  }
  const blocksTotalRes = await build({
    entryPoints: [join(SRC, 'blocks/index.js')],
    bundle: true, write: false, format: 'esm', minify: true, legalComments: 'none',
    absWorkingDir: ROOT,
    external: blocksLibExternal,
  });
  const blocksTotalGz = gzipSync(Buffer.from(blocksTotalRes.outputFiles[0].text)).length;
  const blocksTotalOver = blocksTotalGz > BUDGET.blocksTotal * KB;
  console.log(`blocks 全量（${blocksComps.length} Block+基座）${fmt(blocksTotalGz).padStart(9)}  预算 ≤ ${BUDGET.blocksTotal}KB  ${blocksTotalOver ? '✗ 超限' : '✓'}`);
  if (blocksTotalOver) violations.push(`blocks 全量 ${fmt(blocksTotalGz)} > ${BUDGET.blocksTotal}KB`);

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
