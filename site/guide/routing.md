# 路由与页面

> `route / go / back / beforeEach / notFound` + `createPage` 的完整契约。
> 本文大部分「必须这样做」的条目，都来自真实消费端项目的返工教训（ai-todo / cam-scanner-h5）。

## 基本骨架

```js
import { register, route, start } from '@af-mobile/ui';
import homePage from './pages/home.js';
import detailPage from './pages/detail.js';

// 1. 按需注册页面用到的 af-* 组件（禁止 registerAll，会失去 Tree Shaking）
//    ⚠️ 不要写顶层 await register(...)：生产分包下会形成 entry ↔ chunk 循环依赖，
//    组件永不注册、页面白屏且零报错。router 首次渲染前会自动等待注册完成。
register('af-list', 'af-dialog');

// 2. 声明路由
route('/', homePage);
route('/detail/:id', detailPage);

// 3. 启动
start('#app', { hash: true });
```

## 页面函数与 createPage

页面函数签名 `(params, ctx)`，`ctx = { outlet, signal, go }`：

```js
import { createPage, escapeHtml } from '@af-mobile/ui';

export default function detailPage(params, ctx) {
  const page = createPage({
    state: { name: '' },
    actions: {
      // actions 的第一参 state 由框架自动注入，调用时不要手动传
      async load(s) { s.name = 'hello'; },
    },
  });

  ctx.outlet.innerHTML = `<p>${escapeHtml(page.state.name)}</p>`;
  page.mount(ctx.outlet);
  page.actions.load();
  return page;   // ← 返回 page 对象
}
```

### 必须返回 page 对象（框架自动接管生命周期）

页面函数**返回 `createPage()` 实例**后，框架在导航离开时自动调用它的 `unmount()`——
不需要再手写监听：

```js
// ❌ 反模式（每个页面都重复这段样板，1.10.0 起完全不需要）
ctx.signal.addEventListener('abort', () => page.unmount());

// ✅ 只要 return page，导航离开自动清理
return page;
```

也可以返回任何带 `unmount()` 的自定义清理对象，框架同样接管。

> ⚠️ 不要在页面函数内「同步 `go()` 然后 `return undefined`」。
> 直接访问一个边界 URL（如收藏的 `#/crop`）时草稿为空，这种写法会让页面函数重入
> `render()` 与外层 View Transition 打架，白屏且零报错。正确做法见下方「守卫重定向」。

### 动态 innerHTML 区域的 :attr 绑定

`:attr` / `@event` 绑定由 MutationObserver 兜底扫描，**innerHTML 重绘后依然生效**，
但重扫是空闲去抖的（`requestIdleCallback` / `setTimeout 0`）。需要「重绘后立刻生效」时显式调用：

```js
ctx.outlet.querySelector('[data-role="grid"]').innerHTML = cards;
page.refresh();   // 同步重扫，之后立即读取绑定结果是安全的
```

## 守卫重定向：beforeEach 返回字符串

**多步流程页 / 受保护页的边界 URL，一律用守卫做前置校验**，不要在页面函数里渲染到一半再跳走：

```js
import { beforeEach } from '@af-mobile/ui';
import { getDraft } from './draft.js';

// 返回字符串 = 重定向；返回 false = 阻止本次导航；返回 void/undefined = 放行
beforeEach((to, params, path) => {
  const d = getDraft();
  if ((path === '/crop' || path === '/enhance') && !d.current) return '/';
  if (path === '/detail' && !params.id) return '/';
});
```

要点：

- 重定向以 **replace** 提交——被拦下的导航不在历史里留痕迹，不会出现
  「访问受保护页 → 被弹回 → 按返回键又回受保护页再被弹回」的后退陷阱
- 校验发生在渲染**之前**，页面函数根本不会执行，比「先渲染再跳走」少一次 outlet 清空和转场

## 流程页跳转用 replace

camera → crop → enhance 这类处理流程，步骤间跳转必须 `{ replace: true }`，
否则每一步都压栈，用户按返回键会退回流程中间态而不是首页：

```js
go('/crop', { replace: true });      // ✅ 流程内步骤切换
go('/detail?id=x');                  // ✅ 流程终点/常规导航才用 push
```

## 错误兜底（1.10.0 起）

- **页面函数抛错**：视图降级为错误面板（dev 含堆栈，prod 只含 message），不再白屏。
  `go()` 的 Promise 仍会 **reject**——「不白屏」与「错误可感知」两者兼顾，调用方可 catch 做重试/上报
- **未匹配路由**：框架渲染默认「页面不存在」面板。自定义 404 用 `notFound(handler)` 覆盖：

```js
import { notFound } from '@af-mobile/ui';
notFound((path) => {
  document.querySelector('#app').innerHTML = `<p class="empty">没有这一页：${path}</p>`;
});
```

## route() 选项

```js
route('/me', mePage, {
  keepAlive: true,   // 缓存页面实例（最多 keepAliveMax 个，LRU）
  scroll: false,     // 跳转后不重置滚动位置
  meta: { auth: true },  // 透出到守卫 / afterEach / scrollBehavior
});
```

## 数据层与路由的配合

页面在 `page.actions.load()` 里拉数据即可（action 第一参是自动注入的 state）。
需要「路由变化时重拉」用 `effects.route`（unmount 时自动取消订阅）：

```js
const page = createPage({
  effects: {
    route(params) { page.actions.load(params); },
  },
});
```
