// @af-mobile/ui/k —— k 渲染层：html`` 声明式模板 + 响应式绑定（可选层，独立入口）
// 用法：
//   import { html, signal, render } from '@af-mobile/ui/k';
//   const n = signal(0);
//   const un = render(html`<p @click=${() => n.set(v => v + 1)}>${() => n()}</p>`, '#app');
//   un(); // 卸载并清理全部副作用
//
// 与主库 html``（返回转义字符串，配 innerHTML）不同：本层 html`` 返回真实 DOM，
// 插值不进入 HTML 解析（无 XSS 面），signal 以 getter 形式传入即细粒度更新。

export {
  html, Show, For, Switch, render, clean,
  signal, computed, effect, batch, createRoot, untrack,
} from './flow.js';
