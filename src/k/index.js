// @af-mobile/ui/k —— k 应用层：html`` 声明式模板 + 响应式绑定 + res/route 原语（独立入口）
// 用法：
//   import { html, signal, render, createResource, route, start } from '@af-mobile/ui/k';
//   const n = signal(0);
//   const un = render(html`<p @click=${() => n.set(v => v + 1)}>${() => n()}</p>`, '#app');
//   un(); // 卸载并清理全部副作用
//
// 与主库 html``（返回转义字符串，配 innerHTML）不同：本层 html`` 返回真实 DOM，
// 插值不进入 HTML 解析（无 XSS 面），signal 以 getter 形式传入即细粒度更新。
// D-001=B：应用原语（createResource / router）从 k 入口直达，用 k 写应用不求主包。

export {
  html, Show, For, Switch, render, clean,
  signal, computed, effect, batch, createRoot, untrack,
} from './flow.js';

// res：响应式资源（数据源变化自动重新拉取；effect 注册到当前 owner）
export { createResource } from '../lib/resource.js';

// route：SPA 路由（route/go/back/forward + 守卫 + notFound/current/start）
export {
  route, go, back, forward, beforeEach, afterEach, notFound, current, start, RouterError,
} from '../lib/router.js';
