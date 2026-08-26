// af-mobile UI —— L3 组件汇总导出
// ESM 命名导出 + Tree Shaking + sideEffects:false
// 使用方式：按需注册（唯一合法方式，禁止全量注册 / UMD / 全局对象）
//   import { AfList, AfDialog } from '@af-mobile/ui';
//   customElements.define('af-list', AfList);
//   customElements.define('af-dialog', AfDialog);
// 或：await register('af-list', 'af-dialog')（懒加载 import()：只把用到的组件打进分包，Tree Shaking 友好）

export { AfElement, escapeHtml, html } from './lib/af-element.js';
export { getTheme, setTheme, toggleTheme, initTheme } from './lib/theme.js';

// ===== gen:entry:start（由 scripts/gen-entry.mjs 自动生成，勿手改；新增组件后跑 npm run entry）
import { AfActionSheet } from './components/af-action-sheet.js';
import { AfBacktop } from './components/af-backtop.js';
import { AfBadge } from './components/af-badge.js';
import { AfCalendar } from './components/af-calendar.js';
import { AfCascadePicker } from './components/af-cascade-picker.js';
import { AfCountdown } from './components/af-countdown.js';
import { AfDialog } from './components/af-dialog.js';
import { AfDropdown } from './components/af-dropdown.js';
import { AfField } from './components/af-field.js';
import { AfImg } from './components/af-img.js';
import { AfList } from './components/af-list.js';
import { AfNavbar } from './components/af-navbar.js';
import { AfNoticeBar } from './components/af-notice-bar.js';
import { AfNumberKeyboard } from './components/af-number-keyboard.js';
import { AfPasswordInput } from './components/af-password-input.js';
import { AfPicker } from './components/af-picker.js';
import { AfProgress } from './components/af-progress.js';
import { AfPullRefresh } from './components/af-pull-refresh.js';
import { AfRate } from './components/af-rate.js';
import { AfSearchBar } from './components/af-search-bar.js';
import { AfSkeletonPage } from './components/af-skeleton-page.js';
import { AfStepper } from './components/af-stepper.js';
import { AfSteps } from './components/af-steps.js';
import { AfSwipeCell } from './components/af-swipe-cell.js';
import { AfSwiper } from './components/af-swiper.js';
import { AfSwitch } from './components/af-switch.js';
import { AfTabbar } from './components/af-tabbar.js';
import { AfTabs } from './components/af-tabs.js';
import { AfToast } from './components/af-toast.js';
import { AfUpload } from './components/af-upload.js';

export { AfActionSheet, AfBacktop, AfBadge, AfCalendar, AfCascadePicker, AfCountdown, AfDialog, AfDropdown, AfField, AfImg, AfList, AfNavbar, AfNoticeBar, AfNumberKeyboard, AfPasswordInput, AfPicker, AfProgress, AfPullRefresh, AfRate, AfSearchBar, AfSkeletonPage, AfStepper, AfSteps, AfSwipeCell, AfSwiper, AfSwitch, AfTabbar, AfTabs, AfToast, AfUpload };
// ===== gen:entry:end

// ===== gen:registry:start（由 scripts/gen-entry.mjs 自动生成，勿手改；新增组件后跑 npm run entry）
// 显式 tag→Ctor 注册表：不依赖 Function.name（minify 下类名会被压缩为 a/b/c，
// 基于 name 的推导会失效）。改用字面量 tag 字符串，任何打包器压缩下都稳定。
// 仅用于内省/工具链（eval、minify 安全测试）；register 走下方 LAZY 懒加载，不引用本表
// （未被引用时连同 30 个 ctor import 一并被 Tree Shaking 摇掉）。
export const REGISTRY = [
  ['af-action-sheet', AfActionSheet],
  ['af-backtop', AfBacktop],
  ['af-badge', AfBadge],
  ['af-calendar', AfCalendar],
  ['af-cascade-picker', AfCascadePicker],
  ['af-countdown', AfCountdown],
  ['af-dialog', AfDialog],
  ['af-dropdown', AfDropdown],
  ['af-field', AfField],
  ['af-img', AfImg],
  ['af-list', AfList],
  ['af-navbar', AfNavbar],
  ['af-notice-bar', AfNoticeBar],
  ['af-number-keyboard', AfNumberKeyboard],
  ['af-password-input', AfPasswordInput],
  ['af-picker', AfPicker],
  ['af-progress', AfProgress],
  ['af-pull-refresh', AfPullRefresh],
  ['af-rate', AfRate],
  ['af-search-bar', AfSearchBar],
  ['af-skeleton-page', AfSkeletonPage],
  ['af-stepper', AfStepper],
  ['af-steps', AfSteps],
  ['af-swipe-cell', AfSwipeCell],
  ['af-swiper', AfSwiper],
  ['af-switch', AfSwitch],
  ['af-tabbar', AfTabbar],
  ['af-tabs', AfTabs],
  ['af-toast', AfToast],
  ['af-upload', AfUpload],
];
// ===== gen:registry:end

// ===== gen:lazy:start（由 scripts/gen-entry.mjs 自动生成，勿手改；新增组件后跑 npm run entry）
// 懒注册表：tag → 动态 import()。路径/导出名为字面量 → 打包器可静态分析，
// register 页面只携带用到的组件（Tree Shaking + 按需分包）。
// dist 单文件构建（bundle 无 splitting）时 esbuild 会内联这些 import()，脚本直引行为不变。
const L = (path, key) => () => import(path).then((m) => m[key]);
const LAZY = {
  'af-action-sheet': L('./components/af-action-sheet.js', 'AfActionSheet'),
  'af-backtop': L('./components/af-backtop.js', 'AfBacktop'),
  'af-badge': L('./components/af-badge.js', 'AfBadge'),
  'af-calendar': L('./components/af-calendar.js', 'AfCalendar'),
  'af-cascade-picker': L('./components/af-cascade-picker.js', 'AfCascadePicker'),
  'af-countdown': L('./components/af-countdown.js', 'AfCountdown'),
  'af-dialog': L('./components/af-dialog.js', 'AfDialog'),
  'af-dropdown': L('./components/af-dropdown.js', 'AfDropdown'),
  'af-field': L('./components/af-field.js', 'AfField'),
  'af-img': L('./components/af-img.js', 'AfImg'),
  'af-list': L('./components/af-list.js', 'AfList'),
  'af-navbar': L('./components/af-navbar.js', 'AfNavbar'),
  'af-notice-bar': L('./components/af-notice-bar.js', 'AfNoticeBar'),
  'af-number-keyboard': L('./components/af-number-keyboard.js', 'AfNumberKeyboard'),
  'af-password-input': L('./components/af-password-input.js', 'AfPasswordInput'),
  'af-picker': L('./components/af-picker.js', 'AfPicker'),
  'af-progress': L('./components/af-progress.js', 'AfProgress'),
  'af-pull-refresh': L('./components/af-pull-refresh.js', 'AfPullRefresh'),
  'af-rate': L('./components/af-rate.js', 'AfRate'),
  'af-search-bar': L('./components/af-search-bar.js', 'AfSearchBar'),
  'af-skeleton-page': L('./components/af-skeleton-page.js', 'AfSkeletonPage'),
  'af-stepper': L('./components/af-stepper.js', 'AfStepper'),
  'af-steps': L('./components/af-steps.js', 'AfSteps'),
  'af-swipe-cell': L('./components/af-swipe-cell.js', 'AfSwipeCell'),
  'af-swiper': L('./components/af-swiper.js', 'AfSwiper'),
  'af-switch': L('./components/af-switch.js', 'AfSwitch'),
  'af-tabbar': L('./components/af-tabbar.js', 'AfTabbar'),
  'af-tabs': L('./components/af-tabs.js', 'AfTabs'),
  'af-toast': L('./components/af-toast.js', 'AfToast'),
  'af-upload': L('./components/af-upload.js', 'AfUpload'),
};
// ===== gen:lazy:end

// 变参按需注册（懒加载）：await register('af-list') 或 register('af-list', 'af-dialog')，与 no-register-all 规则推荐用法一致
// 铁律：禁止全量注册（原 registerAll 已移除）——只注册页面实际用到的组件，保证 Tree Shaking
// 返回 Promise：渲染前 await，确保 property 绑定在元素 upgrade 之后设置
export async function register(...names) {
  await Promise.all(names.map(async (name) => {
    const load = LAZY[name];
    if (!load) throw new Error(`[@af-mobile/ui] unknown component: ${name}`);
    if (!customElements.get(name)) customElements.define(name, await load());
  }));
}

// ============================================================
// 核心运行时（按需 import，不计入组件体积预算）
// ============================================================
export { signal, computed, effect, batch, createRoot, getOwner, untrack } from './lib/state.js';
export {
  fetchPage, FetchError, TimeoutError, HttpError, AbortError,
  addInterceptor, removeInterceptor, invalidateCache, clearCache,
  registerBackend, unregisterBackend,
  setCacheAdapter, localStorageAdapter,
} from './lib/fetch.js';
export { createResource } from './lib/resource.js';
export {
  route, go, back, forward, beforeEach, afterEach, notFound, current, start, RouterError,
} from './lib/router.js';
export { createPage } from './lib/page.js';

// ============================================================
// 核心运行时：i18n（国际化，按需 import，不计入组件体积预算）
// ============================================================
export { t, getLocale, setLocale, initLocale, addMessages, messages } from './lib/i18n.js';
