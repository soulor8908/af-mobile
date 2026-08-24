// af-mobile UI —— L3 组件汇总导出
// ESM 命名导出 + Tree Shaking + sideEffects:false
// 使用方式：按需注册（唯一合法方式，禁止全量注册 / UMD / 全局对象）
//   import { AfList, AfDialog } from '@af-mobile/ui';
//   customElements.define('af-list', AfList);
//   customElements.define('af-dialog', AfDialog);
// 或：await register('af-list', 'af-dialog')（懒加载 import()：只把用到的组件打进分包，Tree Shaking 友好）

export { AfElement, escapeHtml, html } from './lib/af-element.js';
export { getTheme, setTheme, toggleTheme, initTheme } from './lib/theme.js';

import { AfList } from './components/af-list.js';
import { AfSwiper } from './components/af-swiper.js';
import { AfTabs } from './components/af-tabs.js';
import { AfDialog } from './components/af-dialog.js';
import { AfToast } from './components/af-toast.js';
import { AfActionSheet } from './components/af-action-sheet.js';
import { AfPicker } from './components/af-picker.js';
import { AfCascadePicker } from './components/af-cascade-picker.js';
import { AfDropdown } from './components/af-dropdown.js';
import { AfImg } from './components/af-img.js';
import { AfBacktop } from './components/af-backtop.js';
import { AfBadge } from './components/af-badge.js';
import { AfCalendar } from './components/af-calendar.js';
import { AfSwitch } from './components/af-switch.js';
import { AfSearchBar } from './components/af-search-bar.js';
import { AfSkeletonPage } from './components/af-skeleton-page.js';
import { AfUpload } from './components/af-upload.js';
import { AfNavbar } from './components/af-navbar.js';
import { AfTabbar } from './components/af-tabbar.js';
import { AfStepper } from './components/af-stepper.js';
import { AfField } from './components/af-field.js';
import { AfPullRefresh } from './components/af-pull-refresh.js';
import { AfSwipeCell } from './components/af-swipe-cell.js';
import { AfRate } from './components/af-rate.js';
import { AfNoticeBar } from './components/af-notice-bar.js';
import { AfProgress } from './components/af-progress.js';
import { AfSteps } from './components/af-steps.js';
import { AfCountdown } from './components/af-countdown.js';
import { AfNumberKeyboard } from './components/af-number-keyboard.js';
import { AfPasswordInput } from './components/af-password-input.js';

export { AfList, AfSwiper, AfTabs, AfDialog, AfToast, AfActionSheet, AfPicker, AfCascadePicker, AfDropdown, AfImg, AfBacktop, AfBadge, AfCalendar, AfSwitch, AfSearchBar, AfSkeletonPage, AfUpload, AfNavbar, AfTabbar, AfStepper, AfField, AfPullRefresh, AfSwipeCell, AfRate, AfNoticeBar, AfProgress, AfSteps, AfCountdown, AfNumberKeyboard, AfPasswordInput };

// 显式 tag→Ctor 注册表：不依赖 Function.name（minify 下类名会被压缩为 a/b/c，
// 基于 name 的推导会失效）。改用字面量 tag 字符串，任何打包器压缩下都稳定。
// 仅用于内省/工具链（eval、minify 安全测试）；register 走下方 LAZY 懒加载，不引用本表
// （未被引用时连同 30 个 ctor import 一并被 Tree Shaking 摇掉）。
export const REGISTRY = [
  ['af-list', AfList],
  ['af-swiper', AfSwiper],
  ['af-tabs', AfTabs],
  ['af-dialog', AfDialog],
  ['af-toast', AfToast],
  ['af-action-sheet', AfActionSheet],
  ['af-picker', AfPicker],
  ['af-cascade-picker', AfCascadePicker],
  ['af-dropdown', AfDropdown],
  ['af-img', AfImg],
  ['af-backtop', AfBacktop],
  ['af-badge', AfBadge],
  ['af-calendar', AfCalendar],
  ['af-switch', AfSwitch],
  ['af-search-bar', AfSearchBar],
  ['af-skeleton-page', AfSkeletonPage],
  ['af-upload', AfUpload],
  ['af-navbar', AfNavbar],
  ['af-tabbar', AfTabbar],
  ['af-stepper', AfStepper],
  ['af-field', AfField],
  ['af-pull-refresh', AfPullRefresh],
  ['af-swipe-cell', AfSwipeCell],
  ['af-rate', AfRate],
  ['af-notice-bar', AfNoticeBar],
  ['af-progress', AfProgress],
  ['af-steps', AfSteps],
  ['af-countdown', AfCountdown],
  ['af-number-keyboard', AfNumberKeyboard],
  ['af-password-input', AfPasswordInput],
];

// 懒注册表：tag → 动态 import()。路径/导出名为字面量 → 打包器可静态分析，
// register 页面只携带用到的组件（Tree Shaking + 按需分包）。
// dist 单文件构建（bundle 无 splitting）时 esbuild 会内联这些 import()，脚本直引行为不变。
const L = (path, key) => () => import(path).then((m) => m[key]);
const LAZY = {
  'af-list': L('./components/af-list.js', 'AfList'),
  'af-swiper': L('./components/af-swiper.js', 'AfSwiper'),
  'af-tabs': L('./components/af-tabs.js', 'AfTabs'),
  'af-dialog': L('./components/af-dialog.js', 'AfDialog'),
  'af-toast': L('./components/af-toast.js', 'AfToast'),
  'af-action-sheet': L('./components/af-action-sheet.js', 'AfActionSheet'),
  'af-picker': L('./components/af-picker.js', 'AfPicker'),
  'af-cascade-picker': L('./components/af-cascade-picker.js', 'AfCascadePicker'),
  'af-dropdown': L('./components/af-dropdown.js', 'AfDropdown'),
  'af-img': L('./components/af-img.js', 'AfImg'),
  'af-backtop': L('./components/af-backtop.js', 'AfBacktop'),
  'af-badge': L('./components/af-badge.js', 'AfBadge'),
  'af-calendar': L('./components/af-calendar.js', 'AfCalendar'),
  'af-switch': L('./components/af-switch.js', 'AfSwitch'),
  'af-search-bar': L('./components/af-search-bar.js', 'AfSearchBar'),
  'af-skeleton-page': L('./components/af-skeleton-page.js', 'AfSkeletonPage'),
  'af-upload': L('./components/af-upload.js', 'AfUpload'),
  'af-navbar': L('./components/af-navbar.js', 'AfNavbar'),
  'af-tabbar': L('./components/af-tabbar.js', 'AfTabbar'),
  'af-stepper': L('./components/af-stepper.js', 'AfStepper'),
  'af-field': L('./components/af-field.js', 'AfField'),
  'af-pull-refresh': L('./components/af-pull-refresh.js', 'AfPullRefresh'),
  'af-swipe-cell': L('./components/af-swipe-cell.js', 'AfSwipeCell'),
  'af-rate': L('./components/af-rate.js', 'AfRate'),
  'af-notice-bar': L('./components/af-notice-bar.js', 'AfNoticeBar'),
  'af-progress': L('./components/af-progress.js', 'AfProgress'),
  'af-steps': L('./components/af-steps.js', 'AfSteps'),
  'af-countdown': L('./components/af-countdown.js', 'AfCountdown'),
  'af-number-keyboard': L('./components/af-number-keyboard.js', 'AfNumberKeyboard'),
  'af-password-input': L('./components/af-password-input.js', 'AfPasswordInput'),
};

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
