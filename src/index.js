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

// ===== gen:lazy:start（由 scripts/gen-entry.mjs 自动生成，勿手改；新增组件后跑 npm run entry）
// 懒注册表：tag → 动态 import()。路径与导出名为逐项内联的字面量 → 打包器可静态分析，
// register 页面只携带用到的组件（Tree Shaking + 按需分包）。
// dist 单文件构建（bundle 无 splitting）时 esbuild 会内联这些 import()，脚本直引行为不变。
const LAZY = {
  'af-action-sheet': () => import('./components/af-action-sheet.js').then((m) => m.AfActionSheet),
  'af-backtop': () => import('./components/af-backtop.js').then((m) => m.AfBacktop),
  'af-badge': () => import('./components/af-badge.js').then((m) => m.AfBadge),
  'af-calendar': () => import('./components/af-calendar.js').then((m) => m.AfCalendar),
  'af-cascade-picker': () => import('./components/af-cascade-picker.js').then((m) => m.AfCascadePicker),
  'af-countdown': () => import('./components/af-countdown.js').then((m) => m.AfCountdown),
  'af-dialog': () => import('./components/af-dialog.js').then((m) => m.AfDialog),
  'af-dropdown': () => import('./components/af-dropdown.js').then((m) => m.AfDropdown),
  'af-field': () => import('./components/af-field.js').then((m) => m.AfField),
  'af-img': () => import('./components/af-img.js').then((m) => m.AfImg),
  'af-list': () => import('./components/af-list.js').then((m) => m.AfList),
  'af-navbar': () => import('./components/af-navbar.js').then((m) => m.AfNavbar),
  'af-notice-bar': () => import('./components/af-notice-bar.js').then((m) => m.AfNoticeBar),
  'af-number-keyboard': () => import('./components/af-number-keyboard.js').then((m) => m.AfNumberKeyboard),
  'af-password-input': () => import('./components/af-password-input.js').then((m) => m.AfPasswordInput),
  'af-picker': () => import('./components/af-picker.js').then((m) => m.AfPicker),
  'af-progress': () => import('./components/af-progress.js').then((m) => m.AfProgress),
  'af-pull-refresh': () => import('./components/af-pull-refresh.js').then((m) => m.AfPullRefresh),
  'af-rate': () => import('./components/af-rate.js').then((m) => m.AfRate),
  'af-search-bar': () => import('./components/af-search-bar.js').then((m) => m.AfSearchBar),
  'af-skeleton-page': () => import('./components/af-skeleton-page.js').then((m) => m.AfSkeletonPage),
  'af-stepper': () => import('./components/af-stepper.js').then((m) => m.AfStepper),
  'af-steps': () => import('./components/af-steps.js').then((m) => m.AfSteps),
  'af-swipe-cell': () => import('./components/af-swipe-cell.js').then((m) => m.AfSwipeCell),
  'af-swiper': () => import('./components/af-swiper.js').then((m) => m.AfSwiper),
  'af-switch': () => import('./components/af-switch.js').then((m) => m.AfSwitch),
  'af-tabbar': () => import('./components/af-tabbar.js').then((m) => m.AfTabbar),
  'af-tabs': () => import('./components/af-tabs.js').then((m) => m.AfTabs),
  'af-toast': () => import('./components/af-toast.js').then((m) => m.AfToast),
  'af-upload': () => import('./components/af-upload.js').then((m) => m.AfUpload),
};
// ===== gen:lazy:end

// 组件 tag 清单（LAZY 键的派生视图）：供工具链/测试枚举全部可注册组件
// （原 REGISTRY 同步 [tag, Ctor] 表已删——无人需要同步 Ctor，仅徒增重复与产物体积）
export const COMPONENT_TAGS = Object.keys(LAZY);

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
