// AIFlow UI —— L3 组件汇总导出
// ESM 命名导出 + Tree Shaking + sideEffects:false
// 使用方式 A：按需注册（推荐）
//   import { AfList, AfDialog } from 'aiflow-ui';
//   customElements.define('af-list', AfList);
//   customElements.define('af-dialog', AfDialog);
// 使用方式 B：全量注册
//   import { registerAll } from 'aiflow-ui';
//   registerAll();

export { AfElement, escapeHtml, html } from './lib/af-element.js';
export { getTheme, setTheme, toggleTheme, initTheme } from './lib/theme.js';

import { AfList } from './components/af-list.js';
import { AfSwiper } from './components/af-swiper.js';
import { AfTabs } from './components/af-tabs.js';
import { AfDialog } from './components/af-dialog.js';
import { AfToast } from './components/af-toast.js';
import { AfActionSheet } from './components/af-action-sheet.js';
import { AfPicker } from './components/af-picker.js';
import { AfDropdown } from './components/af-dropdown.js';
import { AfImg } from './components/af-img.js';
import { AfBacktop } from './components/af-backtop.js';
import { AfSwitch } from './components/af-switch.js';
import { AfSearchBar } from './components/af-search-bar.js';
import { AfSkeletonPage } from './components/af-skeleton-page.js';
import { AfUpload } from './components/af-upload.js';

export { AfList, AfSwiper, AfTabs, AfDialog, AfToast, AfActionSheet, AfPicker, AfDropdown, AfImg, AfBacktop, AfSwitch, AfSearchBar, AfSkeletonPage, AfUpload };

const REGISTRY = {
  'af-list': AfList,
  'af-swiper': AfSwiper,
  'af-tabs': AfTabs,
  'af-dialog': AfDialog,
  'af-toast': AfToast,
  'af-action-sheet': AfActionSheet,
  'af-picker': AfPicker,
  'af-dropdown': AfDropdown,
  'af-img': AfImg,
  'af-backtop': AfBacktop,
  'af-switch': AfSwitch,
  'af-search-bar': AfSearchBar,
  'af-skeleton-page': AfSkeletonPage,
  'af-upload': AfUpload,
};

export function registerAll() {
  for (const [name, ctor] of Object.entries(REGISTRY)) {
    if (!customElements.get(name)) customElements.define(name, ctor);
  }
}

export function register(name) {
  const ctor = REGISTRY[name];
  if (!ctor) throw new Error(`[aiflow-ui] unknown component: ${name}`);
  if (!customElements.get(name)) customElements.define(name, ctor);
}
