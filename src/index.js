// af-mobile UI —— L3 组件汇总导出
// ESM 命名导出 + Tree Shaking + sideEffects:false
// 使用方式：按需注册（唯一合法方式，禁止全量注册 / UMD / 全局对象）
//   import { AfList, AfDialog } from '@af-mobile/ui';
//   customElements.define('af-list', AfList);
//   customElements.define('af-dialog', AfDialog);
// 或：register('af-list', 'af-dialog')

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

export { AfList, AfSwiper, AfTabs, AfDialog, AfToast, AfActionSheet, AfPicker, AfCascadePicker, AfDropdown, AfImg, AfBacktop, AfBadge, AfCalendar, AfSwitch, AfSearchBar, AfSkeletonPage, AfUpload, AfNavbar, AfTabbar, AfStepper, AfField, AfPullRefresh, AfSwipeCell, AfRate, AfNoticeBar, AfProgress, AfSteps, AfCountdown };

// 显式 tag→Ctor 注册表：不依赖 Function.name（minify 下类名会被压缩为 a/b/c，
// 基于 name 的推导会失效）。改用字面量 tag 字符串，任何打包器压缩下都稳定。
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
];

// 变参按需注册：register('af-list') 或 register('af-list', 'af-dialog')，与 no-register-all 规则推荐用法一致
// 铁律：禁止全量注册（原 registerAll 已移除）——只注册页面实际用到的组件，保证 Tree Shaking
export function register(...names) {
  for (const name of names) {
    const entry = REGISTRY.find(([tag]) => tag === name);
    if (!entry) throw new Error(`[@af-mobile/ui] unknown component: ${name}`);
    const Ctor = entry[1];
    if (!customElements.get(name)) customElements.define(name, Ctor);
  }
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
