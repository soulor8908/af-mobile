# P0 生产刚需缺失 — 详细设计

> 对应 RFC §11.1（路由）/ §11.2（状态）/ §11.3（异步）/ §12.1 + §12.4（System Prompt 4 要素补全）
>
> 目标：补齐阻塞真实项目使用的 4 项生产刚需，让 af-mobile UI 能跑起完整移动端 SPA。

---

## 0. 设计背景与范围

### 0.1 RFC 草稿与生产刚需的差距

| 项 | RFC 草稿 | 缺失的关键设计 |
|---|---|---|
| Router (~1KB) | 12 行：`routes={}` + `go()` + `popstate` | `match()` 未定义；无 `:param` 解析；无 404；无异步 handler；无滚动恢复；无生命周期钩子；无 `base` 路径；无 router-view/keep-alive/转场 |
| State (~0.5KB) | 8 行：`signal(v)` + `bus=EventTarget` | 无 `computed` 派生信号；无 `effect` 自动追踪；无批量更新；无组件集成模式 |
| fetchPage (~0.5KB) | 8 行：AbortController + `r.json()` | 无 method/headers/body；无错误分类（超时/网络/HTTP）；无重试；无骨架联动；无响应类型；无去重/缓存/拦截器 |
| System Prompt | 已有 154 白名单 + 20 组件 + 25 禁令 | 缺 §12.4 的 4 要素：④模式决策树 ⑤数据契约 ⑥Few-shot ⑦错误恢复 |

### 0.2 用户确认的设计边界

| 项 | 选择 | 预算（gzip） |
|---|---|---|
| Router | 完整路由（嵌套 + lazy import + guard + router-view + keep-alive + 转场） | ~2.0KB |
| State | 完整响应式（signal + computed + effect + batch + bus） | ~0.7KB |
| fetchPage | 完整数据层（去重 + 缓存 + 拦截器 + 错误分类） | ~0.8KB |
| System Prompt | 7 通用模式 + 场景包框架 + 4 要素补全 | — |
| coreRuntime 合计 | router + state + fetch + 容差 | ≤ 3.7KB |

### 0.3 体积预算策略

`coreRuntime` 独立预算，不计入组件 `total`（14.5KB）。理由：三个模块按需 import，用户不引 router 就不付成本。Tree Shaking 友好（`sideEffects: ["**/*.css"]` 保持不变，JS 模块无副作用）。

---

## 1. 架构总览

### 1.1 模块结构

```
src/
├── lib/
│   ├── af-element.js    # 现有基类（不动）
│   ├── theme.js         # 现有主题（不动）
│   ├── router.js        # 新增：路由（~2.0KB gz）
│   ├── state.js         # 新增：信号 + 事件总线（~0.7KB gz）
│   └── fetch.js         # 新增：数据获取（~0.8KB gz）
├── index.js             # 扩展导出 router/state/fetch API
└── index.d.ts           # 扩展类型声明
```

三个模块各自独立、零相互依赖。用户可按需 import。

### 1.2 导出策略

```javascript
// src/index.js 扩展
export { route, go, back, forward, beforeEach, afterEach, notFound, current, start } from './lib/router.js';
export { signal, computed, effect, batch, bus } from './lib/state.js';
export { fetchPage, FetchError, TimeoutError, HttpError, AbortError,
         addInterceptor, removeInterceptor, invalidateCache, clearCache } from './lib/fetch.js';
```

### 1.3 与现有组件的集成原则

**不侵入组件源码**——router/state/fetch 是消费端工具，组件保持纯粹。集成通过用户侧代码完成：

```javascript
import { signal, effect, fetchPage } from '@af-mobile/ui';

const list = document.getElementById('list');
const items = signal([]);
effect(() => { list.data = items(); });  // signal 变化自动更新 list

route('/home', async () => {
  items.set(await fetchPage('/api/items'));
});
```

### 1.4 package.json 无需改动

现有 exports 已覆盖 `"./lib/*": "./src/lib/*"`，新增 3 个 lib 文件自动可访问。

---

## 2. Router 详细设计（~2.0KB gz）

### 2.1 API 表面

```javascript
// 注册
export function route(path, handler, options = {})
  // options: { children, keepAlive, scroll }

// 导航
export function go(path, options = {})
  // options: { replace, transition, direction }
export function back()
export function forward()

// 守卫
export function beforeEach(guard)        // 返回 false/string/void
export function afterEach(hook)
export function notFound(handler)

// 查询
export function current()                // { path, params, route, outlet }

// 启动
export function start(options = {})
  // options: { outlet, scrollRestoration, keepAliveMax, base }
```

### 2.2 路径匹配（:param 解析）

```javascript
function matchPath(pattern, path) {
  const pp = pattern.split('/').filter(Boolean);
  const ap = path.split('/').filter(Boolean);
  if (pp.length !== ap.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) {
      params[pp[i].slice(1)] = decodeURIComponent(ap[i]);
    } else if (pp[i] !== ap[i]) {
      return null;
    }
  }
  return params;  // null = 不匹配，object = 匹配且含参数
}
```

支持 `/users/:id` → `/users/123` → `{ id: '123' }`。不支持通配符 `*`（嵌套路由已覆盖此场景）。

### 2.3 嵌套路由

```javascript
// options.children 实现嵌套
route('/settings', renderSettingsLayout, {
  children: [
    { path: '/settings/profile', renderProfile },
    { path: '/settings/account', renderAccount },
  ]
});
```

匹配逻辑：先精确匹配，再递归 `children`。父路由 handler 先执行（渲染布局），子路由 handler 后执行（填充内容）。

### 2.4 router-view 机制

#### 2.4.1 声明式出口

```html
<!-- 顶层 outlet -->
<div id="app" data-router-outlet></div>

<!-- af-tabs 内嵌子路由 -->
<af-tabs>
  <div data-role="panel" data-router-outlet></div>
</af-tabs>
```

任何带 `data-router-outlet` 的元素都是路由出口。`start({ outlet: '#app' })` 指定顶层出口。

#### 2.4.2 嵌套路由的 outlet 链

```javascript
// 父路由返回 outlet 选择器，子路由填充其内
route('/settings', (params, ctx) => {
  ctx.outlet.innerHTML = `
    <nav class="navbar">设置</nav>
    <main data-router-outlet></main>
  `;
  return 'main[data-router-outlet]';  // 子路由填到这里
});

route('/settings/profile', (params, ctx) => {
  ctx.outlet.innerHTML = '<div class="card">个人资料</div>';
});
```

**协调逻辑**：父路由 handler 执行后，取返回值（选择器）在父 outlet 内查找子 outlet，作为子路由的 `ctx.outlet`。**父 handler 必须返回子 outlet 选择器**（若有子路由），否则子路由的 `innerHTML` 会覆盖父渲染的布局。无子路由的父 handler 不需要返回。

#### 2.4.3 keep-alive 缓存

```javascript
route('/list', listHandler, { keepAlive: true });
route('/detail/:id', detailHandler);

let _cache = new Map();  // path → { outlet, scrollTop, signal }

async function render(path) {
  // 命中缓存：直接 attach
  if (_cache.has(path)) {
    const cached = _cache.get(path);
    currentOutlet.replaceWith(cached.outlet);
    scrollTo(0, cached.scrollTop);
    return;
  }

  // 正常渲染
  const node = document.createElement('div');
  node.setAttribute('data-router-view', '');
  currentOutlet.replaceWith(node);

  const ctrl = new AbortController();
  await route.handler(params, { outlet: node, signal: ctrl.signal, go });

  if (route.keepAlive) {
    _cache.set(path, { outlet: node, scrollTop: 0, signal: ctrl });
  }
}
```

**缓存策略**：
- `keepAlive: true` 的路由离开时 DOM 节点 detach 保留，再次进入直接 attach
- 滚动位置自动记录/恢复
- signal 在缓存期间保持活跃（fetch 不中断），离开时**不 abort**（与 §2.7 导航取消的区别：keep-alive 路由保留 fetch 以填充缓存；非 keep-alive 路由离开时 abort）
- 缓存上限 5 个（LRU），超过自动销毁最旧的并 abort 其 signal
- 用户侧可配置：`start({ keepAliveMax: 10 })`

#### 2.4.4 局部转场动画

通过 View Transitions API 的命名出口实现"NavBar/TabBar 不动，仅内容区转场"：

```javascript
export function go(path, options = {}) {
  const { transition = true } = options;
  const navigate = () => {
    history.pushState({}, '', path);
    render(path);
  };
  if (transition && document.startViewTransition) {
    document.startViewTransition(navigate);
  } else {
    navigate();
  }
}
```

**CSS 侧约定**（用户在 `<style>` 里写，不在 router.js 内）：

```css
/* 持久化布局不参与转场 */
.navbar, .tabbar { view-transition-name: fixed; }
.navbar::view-transition-old(fixed),
.navbar::view-transition-new(fixed) { animation: none; }

/* 内容区滑动转场 */
[data-router-view] { view-transition-name: page-content; }
[data-router-view]::view-transition-old(page-content) { animation: slide-out-left 0.3s; }
[data-router-view]::view-transition-new(page-content) { animation: slide-in-right 0.3s; }
```

router.js 只负责调用 `startViewTransition`，**CSS 动画定义在用户侧**（0 字节 JS 成本）。

#### 2.4.5 方向推断

```javascript
let _navStack = [];

function go(path) {
  _navStack.push(path);
  document.documentElement.dataset.transition = 'forward';
  navigate(path);
}

addEventListener('popstate', () => {
  _navStack.pop();
  document.documentElement.dataset.transition = 'back';
  render(location.pathname);
});
```

CSS 用 `[data-transition="back"]` 选择反向动画。

#### 2.4.6 与 af-tabs 集成

```html
<af-tabs>
  <div data-role="panel" data-router-outlet></div>
  <div data-role="panel" data-router-outlet></div>
</af-tabs>

<script type="module">
route('/tab/home', (params, ctx) => {
  ctx.outlet.innerHTML = '<div>首页内容</div>';
});
route('/tab/feed', (params, ctx) => {
  ctx.outlet.innerHTML = '<div>动态内容</div>';
});

document.querySelector('af-tabs').addEventListener('af-tabs:change', (e) => {
  go(['/tab/home', '/tab/feed'][e.detail.activeIndex]);
});
</script>
```

af-tabs 无需感知 router，通过 `data-router-outlet` 标记 + 事件桥接即可。

### 2.5 异步 handler + lazy import

```javascript
// handler 返回 Promise → 自动 await
route('/home', async (params, ctx) => {
  const { default: render } = await import('./pages/home.js');
  render(params);
});
```

无需专门 API，handler 是 async 函数即可。`ctx` 含 `{ outlet, signal, go }`——`signal` 是 AbortSignal，导航离开时 abort，用于取消 fetchPage。

### 2.6 守卫与钩子

```javascript
// beforeEach：返回 false/string/void
beforeEach(async (route, params, path) => {
  if (path.startsWith('/admin') && !isLoggedIn()) {
    return '/login';  // 重定向
  }
  // 返回 void/true → 继续；返回 false → 阻止
});

// afterEach：导航完成后执行
afterEach((route, params, path) => {
  trackPageView(path);  // 埋点
});
```

### 2.7 导航取消（关键设计）

```javascript
let currentNav = null;

async function render(path) {
  // 取消上一个未完成导航（用户快速点击场景）
  currentNav?.abort();
  const nav = { aborted: false, controller: new AbortController() };
  currentNav = nav;

  const { route, params } = match(routes, path);
  if (!route) { notFoundHandler?.(path); return; }

  if (beforeEachGuard) {
    const result = await beforeEachGuard(route, params, path);
    if (result === false) return;
    if (typeof result === 'string') { go(result); return; }
  }

  if (nav.aborted) return;  // 守卫期间被新导航取消

  await route.handler(params, { outlet: currentOutlet, signal: nav.controller.signal, go });

  if (nav.aborted) return;  // handler 执行期间被取消

  afterEachHook?.(route, params, path);
  if (route.scroll !== false) scrollTo(0, 0);
}
```

### 2.8 滚动恢复

```javascript
// start() 时配置
start({ scrollRestoration: true });  // 默认 true

// 前进导航（go/forward）默认 scrollTo(0, 0)
// 后退导航（back/popstate）恢复记录的位置
```

### 2.9 start() 启动流程

```javascript
export function start(options = {}) {
  const { scrollRestoration = true, base = '', outlet = '#app', keepAliveMax = 5 } = options;
  if (typeof history === 'undefined') return;  // SSR 守卫
  if (scrollRestoration && 'scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  _rootOutlet = document.querySelector(outlet);
  _keepAliveMax = keepAliveMax;
  addEventListener('popstate', () => render(location.pathname));
  render(location.pathname);  // 首次渲染（处理直接访问 /users/123 的场景）
}
```

### 2.10 SSR 安全

所有 `history`/`location`/`addEventListener`/`scrollTo` 访问都加 `typeof` 守卫，模块顶层无副作用。`start()` 显式调用，不在 import 时自动启动。

### 2.11 体积估算

| 部分 | 估算 |
|---|---|
| 路径匹配 + :param | 0.15KB |
| route/go/back/forward | 0.20KB |
| beforeEach/afterEach/notFound | 0.15KB |
| render 协调 + 导航取消 | 0.30KB |
| router-view outlet 链 | 0.25KB |
| keep-alive 缓存 + LRU | 0.45KB |
| View Transitions + 方向推断 | 0.25KB |
| start + popstate + SSR 守卫 | 0.15KB |
| 滚动恢复 | 0.10KB |
| **合计** | **~2.0KB** |

---

## 3. State 详细设计（~0.7KB gz）

### 3.1 API 表面

```javascript
export function signal(initialValue)              // 创建可写信号
export function computed(fn)                       // 创建派生信号（自动追踪依赖）
export function effect(fn)                         // 副作用，返回取消函数
export function batch(fn)                          // 批量更新，合并通知
export const bus = new EventTarget()               // 跨组件事件总线
```

设计原则：**函数式 API，无 class**——signal 是闭包，比 Proxy 方案省 0.3KB 且足够移动端场景。

### 3.2 signal 实现

```javascript
let _cur = null;  // 当前 effect 的 { run, cleanups }

export function signal(v) {
  let val = v;
  const subs = new Map();  // effect → cleanup
  const s = () => {
    if (_cur && !subs.has(_cur)) {
      subs.set(_cur, () => subs.delete(_cur));
      _cur.cleanups.push(subs.get(_cur));
    }
    return val;
  };
  s.set = (nv) => {
    if (typeof nv === 'function') nv = nv(val);
    if (Object.is(nv, val)) return;
    val = nv;
    if (_batching) _pending.add(s);
    else for (const e of subs.keys()) e.run();
  };
  s.on = (f) => {
    const wrapped = { run: f, cleanups: [] };
    subs.set(wrapped, () => subs.delete(wrapped));
    return () => subs.delete(wrapped);
  };
  return s;
}
```

**关键决策**：signal 是**可调用的函数**（不是 `{ get, set }` 对象）——节省属性访问开销，且 effect 内 `sig()` 调用天然读取，无需 `.get()`。

### 3.3 effect 自动依赖追踪

```javascript
export function effect(fn) {
  const e = { run: null, cleanups: [] };
  e.run = () => {
    e.cleanups.forEach(c => c());
    e.cleanups = [];
    const prev = _cur;
    _cur = e;
    try { fn(); }
    finally { _cur = prev; }
  };
  e.run();
  return () => { e.cleanups.forEach(c => c()); };
}
```

**自动追踪**：effect 执行期间，signal 的 `read()` 调用会把当前 effect 加入 subs。重跑时先执行 cleanups（取消旧订阅），再重新追踪。

### 3.4 computed 派生信号

```javascript
export function computed(fn) {
  let cached;
  let dirty = true;
  const e = effect(() => { cached = fn(); dirty = false; });
  const c = () => {
    if (dirty) { e.run(); }
    return cached;
  };
  c.on = (f) => effect(() => f(c()));
  return c;
}
```

**惰性求值**：computed 只在被读取时才执行 fn。依赖的 signal 变化时标记 dirty，下次读取才重算。

### 3.5 batch 批量更新

```javascript
let _batching = false;
const _pending = new Set();

export function batch(fn) {
  if (_batching) return fn();
  _batching = true;
  try { fn(); }
  finally {
    _batching = false;
    const snapshot = [..._pending];
    _pending.clear();
    const effects = new Set();
    snapshot.forEach(s => {
      for (const e of s._subs?.keys?.() ?? []) effects.add(e);
    });
    effects.forEach(e => e.run());
  }
}
```

**批量模式**：batch 期间 signal.set 不立即通知，而是把 signal 加入 `_pending`；batch 结束时，遍历 `_pending` 中每个 signal 的所有 subs，收集到 Set 去重，然后统一执行一次。

### 3.6 bus 事件总线

```javascript
export const bus = new EventTarget();

// 用法
bus.dispatchEvent(new CustomEvent('user:login', { detail: { id: 1 } }));
bus.addEventListener('user:login', (e) => { /* ... */ });
```

**设计决策**：直接复用原生 EventTarget，**不封装快捷方法**（`bus.on`/`bus.emit`）——省 0.1KB，且 EventTarget API 用户已熟悉。RFC §11.2 原文就是 `bus = new EventTarget`。

### 3.7 与组件集成

组件不感知 signal，集成在用户侧 effect 内完成：

```javascript
const list = document.getElementById('list');
const items = signal([]);

const stop = effect(() => {
  list.data = items();  // items 变化时自动重设 list.data
});

// 路由 handler
route('/home', async () => {
  items.set(await fetchPage('/api/items'));
});

// 卸载时机：effect 返回取消函数，用户在路由守卫或组件 disconnectedCallback 里调用
beforeEach(() => { stop(); });
```

### 3.8 体积估算

| 部分 | 估算 |
|---|---|
| signal + 依赖追踪 | 0.30KB |
| effect | 0.15KB |
| computed | 0.10KB |
| batch | 0.10KB |
| bus（一行） | 0.01KB |
| SSR 守卫 | 0.04KB |
| **合计** | **~0.70KB** |

### 3.9 SSR 安全

模块顶层无副作用（无全局变量污染），`signal/computed/effect/batch` 都是纯函数。`bus = new EventTarget()` 在 Node.js 18+ 原生支持，无需守卫。

### 3.10 测试覆盖点

- signal 基础读写 + on 订阅
- effect 自动追踪 + 清理旧依赖（依赖切换场景）
- computed 惰性求值 + dirty 标记
- batch 合并通知（多次 set 只触发一次 effect）
- effect 嵌套（内层 effect 依赖外层 signal）
- 循环依赖检测（computed A 依赖 computed B 依赖 computed A → 抛错或死循环保护）

---

## 4. fetchPage 详细设计（~0.8KB gz）

### 4.1 API 表面

```javascript
export async function fetchPage(url, options = {})  // 主入口
export class FetchError extends Error {}             // 基类
export class TimeoutError extends FetchError {}      // 超时
export class HttpError extends FetchError {          // HTTP 状态码错误
  constructor(status, url, body) { super(`HTTP ${status}`); this.status = status; this.body = body; }
}
export class AbortError extends FetchError {}        // 用户/路由取消

// 全局拦截器
export function addInterceptor(fn)
export function removeInterceptor(fn)

// 缓存控制
export function invalidateCache(url)
export function clearCache()
```

### 4.2 完整 options

```javascript
fetchPage(url, {
  method = 'GET',              // HTTP method
  headers = {},                // 自定义 headers
  body = null,                 // 请求体（POST/PUT 用）
  timeout = 10000,             // 超时毫秒，0 = 不超时
  retries = 1,                 // 重试次数（仅网络错误/超时触发，不重试 HTTP 错误）
  retryDelay = 300,            // 指数退避起始延迟
  dedupe = true,               // 请求去重（相同 URL + method 的并发请求合并）
  cache = false,               // 内存缓存（GET 请求，TTL 过期）
  cacheTTL = 5000,             // 缓存有效期（毫秒）
  responseType = 'json',       // 'json' | 'text' | 'blob' | 'response'
  signal = null,               // 外部 AbortSignal（如路由取消）
})
```

### 4.3 主函数实现

```javascript
export async function fetchPage(url, opts = {}) {
  const {
    method = 'GET', headers = {}, body = null,
    timeout = 10000, retries = 1, retryDelay = 300,
    dedupe = true, cache = false, cacheTTL = 5000,
    responseType = 'json', signal = null,
  } = opts;

  // 1. 缓存命中
  if (cache && method === 'GET') {
    const hit = _cache.get(url);
    if (hit && hit.expiry > Date.now()) return hit.data;
  }

  // 2. 请求去重
  if (dedupe && method === 'GET') {
    const inflight = _inflight.get(url);
    if (inflight) return inflight;
  }

  const promise = _doFetch(url, { method, headers, body, timeout, retries, retryDelay, responseType, signal });

  if (dedupe && method === 'GET') {
    _inflight.set(url, promise);
    promise.finally(() => _inflight.delete(url));
  }

  const data = await promise;

  if (cache && method === 'GET') {
    _cache.set(url, { data, expiry: Date.now() + cacheTTL });
  }

  return data;
}
```

### 4.4 _doFetch 实现

```javascript
async function _doFetch(url, { method, headers, body, timeout, retries, retryDelay, responseType, signal }) {
  const ctrl = new AbortController();
  const timeoutId = timeout > 0 ? setTimeout(() => ctrl.abort(new TimeoutError()), timeout) : null;

  if (signal) signal.addEventListener('abort', () => ctrl.abort(new AbortError()));

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      let finalOpts = { method, headers, body, signal: ctrl.signal };
      for (const interceptor of _interceptors) {
        const result = await interceptor(url, finalOpts);
        if (result instanceof Response) return _parseResponse(result, responseType);
        finalOpts = result;
      }

      const res = await fetch(url, finalOpts);
      if (!res.ok) {
        const errBody = await res.text().catch(() => null);
        throw new HttpError(res.status, url, errBody);
      }
      if (timeoutId) clearTimeout(timeoutId);
      return await _parseResponse(res, responseType);
    } catch (err) {
      if (err instanceof HttpError) throw err;
      if (err instanceof AbortError) throw err;
      lastErr = err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, retryDelay * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
  throw lastErr;
}

async function _parseResponse(res, responseType) {
  switch (responseType) {
    case 'text': return await res.text();
    case 'blob': return await res.blob();
    case 'response': return res;
    case 'json':
    default:
      const text = await res.text();
      if (!text) return null;
      try { return JSON.parse(text); }
      catch (e) { throw new FetchError(`Invalid JSON: ${e.message}`); }
  }
}
```

### 4.5 错误类层级

```
Error
└─ FetchError              基类，所有 fetchPage 错误的父类
   ├─ TimeoutError         超时（AbortController.abort(TimeoutError) 触发）
   ├─ HttpError            HTTP 状态码非 2xx，含 status/body
   ├─ AbortError           外部 signal 触发的取消（路由离开）
   └─ (JSON 解析错误)       FetchError，message 含原始 JSON 解析错误
```

### 4.6 用户侧错误处理

```javascript
import { fetchPage, FetchError, TimeoutError, HttpError, AbortError } from '@af-mobile/ui';

try {
  const data = await fetchPage('/api/users');
} catch (err) {
  if (err instanceof AbortError) return;        // 路由离开，静默忽略
  if (err instanceof TimeoutError) showToast('请求超时');
  else if (err instanceof HttpError) {
    if (err.status === 401) go('/login');
    else if (err.status === 404) showEmpty();
    else showToast(`服务器错误 ${err.status}`);
  } else if (err instanceof FetchError) {
    showToast('数据解析失败');
  }
}
```

### 4.7 请求去重

```javascript
const _inflight = new Map();  // url → Promise
```

仅对 GET 请求去重（POST/PUT/DELETE 不去重，避免副作用重复）。去重 key = url。Promise resolve/reject 后自动删除。

### 4.8 内存缓存

```javascript
const _cache = new Map();  // url → { data, expiry }
```

仅 GET 请求缓存，TTL 过期自动失效。缓存命中优先级高于去重——缓存命中直接返回，不进入 inflight。用户侧可主动失效：`invalidateCache(url)` / `clearCache()`。

### 4.9 全局拦截器

```javascript
// 认证 token 注入
addInterceptor((url, opts) => {
  const token = localStorage.getItem('token');
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  return opts;
});

// 离线 mock（返回 Response 短路）
addInterceptor((url, opts) => {
  if (!navigator.onLine) {
    return new Response(JSON.stringify({ list: [], offline: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return opts;
});
```

**拦截器契约**：
- 接收 `(url, opts)`，返回 `opts`（继续）或 `Response`（短路）
- 多个拦截器按注册顺序执行
- 返回 Response 时跳过后续 fetch + 后续拦截器

### 4.10 与路由 signal 集成

```javascript
route('/detail/:id', async (params, ctx) => {
  try {
    const data = await fetchPage(`/api/detail/${params.id}`, { signal: ctx.signal });
    renderDetail(data);
  } catch (err) {
    if (err instanceof AbortError) return;  // 路由离开，静默
    throw err;
  }
});
```

### 4.11 与骨架屏联动

```javascript
const loading = signal(true);
const data = signal(null);

effect(() => {
  const skeleton = document.getElementById('skeleton');
  const content = document.getElementById('content');
  skeleton.style.display = loading() ? '' : 'none';
  content.style.display = loading() ? 'none' : '';
});

route('/list', async () => {
  loading.set(true);
  try {
    data.set(await fetchPage('/api/list'));
  } catch (err) {
    showError(err);
  } finally {
    loading.set(false);
  }
});
```

### 4.12 体积估算

| 部分 | 估算 |
|---|---|
| fetchPage 主函数 + options 解构 | 0.20KB |
| _doFetch + 重试循环 | 0.20KB |
| 超时 + signal 联动 | 0.08KB |
| 错误类（4 个） | 0.10KB |
| _parseResponse | 0.05KB |
| 去重（_inflight Map） | 0.05KB |
| 缓存（_cache Map + TTL） | 0.05KB |
| 拦截器 | 0.05KB |
| invalidateCache/clearCache | 0.02KB |
| **合计** | **~0.80KB** |

### 4.13 SSR 安全

模块顶层仅声明 `_inflight`/`_cache`/`_interceptors` 三个 Map/Set，无 DOM 访问。`fetch` 在 Node 18+ 原生支持。`AbortController` 同样原生。模块顶层无副作用，import 不触发任何请求。

### 4.14 测试覆盖点

- 基础 GET + JSON 解析
- timeout 触发 TimeoutError
- HTTP 404/500 触发 HttpError（含 status/body）
- 外部 signal abort 触发 AbortError
- 重试：网络错误重试 1 次，HTTP 错误不重试
- 去重：相同 URL 并发只发 1 次 fetch
- 缓存命中跳过 fetch，TTL 过期重新请求
- 拦截器：返回 opts 继续请求，返回 Response 短路
- responseType: json/text/blob/response
- 空响应 body 返回 null（不抛 JSON 解析错误）

---

## 5. System Prompt 补全 4 要素

### 5.1 注入位置

在 `prompt/system-prompt.template.md` 的 `<!-- {{{ PROJECT_EXTENSION_INJECTION_POINT }}} -->` 占位符之前插入新章节，保持现有结构不动。新增 4 节，预计 prompt 体积增加 ~1200 token。

### 5.2 要素 ④：模式选择决策树

```markdown
# 页面模式（7 通用模式，按决策树选择，禁止自创结构）

## 模式选择决策树

用户需求关键词 → 模式：
  登录|注册|验证码|找回密码 → page-login
  列表|浏览|商品列表|订单列表|消息列表 → page-list
  详情|展示|文章详情|商品详情 → page-detail
  表单|报名|反馈|地址|录入 → page-form
  搜索|筛选 → page-search
  个人中心|设置|我的 → page-profile
  空态|无权限|网络错误|404 → page-empty

规则：
- 一个页面只能选一个主模式
- 子区域用通用组件（af-list/af-swiper/af-tabs），不切模式
- 多模式组合（如列表+搜索）用主模式 + 子区域组件，不是两模式叠加
```

### 5.3 要素 ⑤：数据契约

```markdown
# 数据契约（API 响应 → 模板字段映射规则）

## 列表数据
1. af-list 通过 list.data = items 注入（不用 render 属性时）
2. renderItem 模板用 {{field}} 引用字段，嵌套用 {{obj.field}}
3. 条件渲染用三元：{{item.status === 'paid' ? '已付款' : '待付款'}}
4. API 返回 {list: [...], total: N}，分页由 af-list 自动处理
5. 列表加载：list.data = await fetchPage(url)

## 详情数据
6. 单条数据通过 DOM 注入：getElementById + textContent/value
7. 富文本用 innerHTML（需 escapeHtml 转义，或用 html 模板标签）

## 表单数据
8. 表单提交：new FormData(form) → fetchPage(url, { method: 'POST', body })
9. 校验用原生 Constraint Validation（required/pattern），不手写 isValid

## 信号联动
10. signal 变化自动更新组件：effect(() => { list.data = items() })
11. 路由 handler 内 fetchPage → signal.set
12. 离开路由时取消 effect：返回的 cleanup 函数在 afterEach 或 beforeEach 调用
```

### 5.4 要素 ⑥：Few-shot 示例

为 7 通用模式各提供 1 个精简示例（每个 ~150 token，共 ~1050 token）。示例遵循"输入关键词 → 完整 HTML 输出"格式。

**示例 1：page-list（消息列表）**

输入：消息列表页，每条含头像/昵称/最后消息/时间/未读红点

```html
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/af-mobile.css">
</head>
<body>
<div class="page">
  <nav class="navbar">消息</nav>
  <af-list id="list" item-height="64" refresh></af-list>
</div>
<script type="module">
import { signal, effect, fetchPage } from '/af-mobile.js';
const list = document.getElementById('list');
const items = signal([]);
effect(() => { list.data = items(); });

list.renderItem = (item) => `
  <div class="list-item g-3 aic">
    <img class="avatar" src="${item.avatar}" alt="">
    <div class="flex-1 fc">
      <div class="jcsb aic">
        <span class="body t-b">${item.name}</span>
        <span class="caption text-muted">${item.time}</span>
      </div>
      <span class="caption text-muted ws-nowrap">${item.lastMsg}</span>
    </div>
    ${item.unread ? `<span class="badge">${item.unread}</span>` : ''}
  </div>
`;

list.addEventListener('af-list:refresh', async () => {
  items.set(await fetchPage('/api/messages'));
  list.endRefresh();
});
items.set(await fetchPage('/api/messages'));
</script>
</body>
</html>
```

**示例 2：page-login（登录）**

```html
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/af-mobile.css">
</head>
<body>
<div class="page center p-4">
  <h1 class="title">登录</h1>
  <form id="loginForm" class="fc g-3">
    <input class="input" name="phone" type="tel" required pattern="1\d{10}" placeholder="手机号">
    <input class="input" name="code" type="text" required minlength="6" placeholder="验证码">
    <button class="btn btn-block" type="submit">登录</button>
  </form>
</div>
<script type="module">
import { fetchPage, go } from '/af-mobile.js';
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!e.target.checkValidity()) return;
  const data = new FormData(e.target);
  try {
    await fetchPage('/api/login', { method: 'POST', body: data });
    go('/home');
  } catch (err) {
    if (err.status === 401) alert('验证码错误');
  }
});
</script>
</body>
</html>
```

**示例 3-7**（page-detail / page-form / page-search / page-profile / page-empty）在实现时完整补齐，每个模式 1 个代表性示例，格式同上。

### 5.5 要素 ⑦：错误恢复指引

```markdown
# 错误恢复（ESLint 报错后如何修正）

| ESLint 规则 | 报错原因 | 修正方案 |
|---|---|---|
| no-inline-style | style="..." 设置禁令属性 | 删除 style，改用 token class（如 padding→p-4） |
| token-whitelist | 白名单外 class | 查 154 白名单，用最近配方替代（如 .my-card → .card） |
| no-tailwind-syntax | p-[13px] 任意值语法 | 用最接近的原子类（p-3=12px 或 p-4=16px） |
| no-arbitrary-value | 自定义任意值 | 同上，改用预定义原子 |
| no-recipe-break | .btn + text-brand 叠加 | 删除 text-brand，.btn 文字已是 onbrand 色 |
| prefer-component | 手写列表轮播 | 改用 <af-list>/<af-swiper> 组件 |
| wc-light-no-style | Light DOM 组件内 style | 迁移到 Shadow 组件或 recipes.project.css |
| wc-shadow-use-token | Shadow CSS 硬编码颜色 | 改用 var(--c-*) 等 token |

## 修正原则
- 优先查白名单替换，不要自创新 class
- 组件能解决的不用原子类堆砌
- 内联 style 一律改 class，布局属性（display/width）例外
- 校验用原生 Constraint Validation，不手写状态变量
```

### 5.6 build-prompt.mjs 集成

新增的 4 节内容直接写入 `prompt/system-prompt.template.md`（静态内容，无需构建时注入）。`build-prompt.mjs` 的 `{{{ WHITELIST_INJECTION_POINT }}}` 等动态注入点不变。

**新增构建校验**：`check-prompt-sync.mjs` 增加检查 4 要素是否都存在于生成的 `system-prompt.md`：

```javascript
const REQUIRED_SECTIONS = [
  { name: '模式选择决策树', pattern: /# 页面模式.*模式选择决策树/s },
  { name: '数据契约', pattern: /# 数据契约/ },
  { name: 'Few-shot 示例', pattern: /# Few-shot 示例/ },
  { name: '错误恢复', pattern: /# 错误恢复/ },
];
```

### 5.7 场景包框架（预留）

7 通用模式完整实现后，8 场景包（电商/营销/O2O/内容/企业/工具/教育/社交）作为预留接口：

```markdown
# 场景包（按项目类型注入 1-2 个，非全加载）

本项目暂未注入场景包。如需电商/营销/O2O 等场景，在 prompt/system-prompt.md 末尾追加对应场景包：
- 电商：cart order product-detail coupon
- 营销：landing lottery poster
- O2O：booking store-map review
- 内容：article video feed
- 企业：dashboard approval task
- 工具：result guide
- 教育：course-list course-detail exam
- 社交：chat community

场景包注入由 build-prompt.mjs 的 PROJECT_EXTENSION_INJECTION_POINT 处理，本项目不实现。
```

### 5.8 prompt 体积影响

| 部分 | token 估算 |
|---|---|
| 现有 prompt（白名单+组件+禁令+反例） | ~1800 |
| 新增 ④ 模式决策树 | ~150 |
| 新增 ⑤ 数据契约 | ~200 |
| 新增 ⑥ Few-shot（7 示例） | ~1050 |
| 新增 ⑦ 错误恢复 | ~200 |
| **合计** | **~3400 token** |

RFC §12.3 表格中"通用基础包"目标 ~4250 tok，当前 ~3400 tok 在预算内。场景包注入后单项目约 ~4100-4250 tok，符合 RFC 规划。

---

## 6. 测试与体积预算调整

### 6.1 新增测试文件

```
test/
├── router.test.js      # 路由测试（~25 用例）
├── state.test.js       # 状态测试（~20 用例）
└── fetch.test.js       # 数据获取测试（~20 用例）
```

### 6.2 体积预算调整

`size-check.mjs` 的 `BUDGET` 新增 `coreRuntime` 项：

```javascript
const BUDGET = {
  css: 8.0,            // KB，L1+L2 CSS（随配方增长上调）
  perComponent: 2.6,   // KB，单组件 JS 预算
  base: 1.2,           // KB，基类 AfElement
  total: 19.5,         // KB，20 组件+基类（随组件新增上调）
  onDemand2: 5.5,      // KB，不变
  coreRuntime: 3.7,    // KB，新增：router(2.0)+state(0.7)+fetch(0.8)+容差(0.2)
};
```

`size-check.mjs` 新增 coreRuntime 测量逻辑：临时入口 import 三个模块，bundle 后 minify+gz。

### 6.3 index.js 扩展导出

```javascript
export { route, go, back, forward, beforeEach, afterEach, notFound, current, start } from './lib/router.js';
export { signal, computed, effect, batch, bus } from './lib/state.js';
export { fetchPage, FetchError, TimeoutError, HttpError, AbortError,
         addInterceptor, removeInterceptor, invalidateCache, clearCache } from './lib/fetch.js';
```

### 6.4 index.d.ts 扩展类型声明

为 router/state/fetch 的所有导出 API 补充 TypeScript 类型声明，通过 `types:check` 校验。

### 6.5 check-prompt-sync.mjs 增强

校验 4 要素（模式决策树/数据契约/Few-shot/错误恢复）存在，防止后续误删。

---

## 7. 自检清单（实现完成后）

依据 AGENTS.md §2，交付前必须跑完：

```bash
npx eslint src/ test/ scripts/ --max-warnings 0
npx vitest run
npm run size              # 含新增 coreRuntime 检查
npm run whitelist:check
npm run types:check
npm run prompt:check      # 含新增 4 要素检查
```

---

## 8. 设计决策汇总

| 模块 | 关键决策 | 理由 |
|---|---|---|
| Router | 完整 router-view + keep-alive LRU + 局部转场 | 移动端 SPA 核心体验（持久化布局/滚动恢复/转场动画）|
| Router | `data-router-outlet` 声明式出口 | 与 af-tabs 等组件天然集成，0 侵入 |
| Router | 父路由返回子 outlet 选择器 | 嵌套不强制，需要时才用 |
| Router | 导航取消通过 AbortController + aborted 标志 | 避免快速点击竞态 |
| State | signal 是函数（`sig()` 读取） | 比 `{get,set}` 对象省属性访问，effect 内调用天然追踪 |
| State | effect 自动依赖追踪 + 清理 | 重跑时取消旧订阅，避免内存泄漏 |
| State | computed 惰性求值 | 不被读取不计算 |
| State | batch 收集去重 | 多个 signal 变化只触发一次 effect 重跑 |
| State | bus 复用 EventTarget | 零封装成本，用户已熟悉 |
| fetchPage | 错误分类四层 | 用户可精确处理不同失败场景 |
| fetchPage | 去重仅限 GET | 避免 POST/PUT 副作用重复 |
| fetchPage | 缓存 TTL 秒级 | 适合列表/详情数据，用户侧 `cache:false` 关闭 |
| fetchPage | 拦截器双模式 | 返回 opts 继续，返回 Response 短路（离线 mock/token 刷新）|
| fetchPage | 与路由 signal 集成 | 路由离开自动取消请求，避免竞态 |
| System Prompt | 4 要素直接写入 template | 静态内容，不走构建注入，降低复杂度 |
| System Prompt | 7 通用模式各 1 个 Few-shot | 每个 ~150 token，总 ~1050 token，控制在 RFC 预算内 |
| System Prompt | 场景包框架预留 | 本项目不实现 8 场景包，但留好注入点 |
| 体积预算 | coreRuntime 独立预算 3.7KB | 按需 import，不计入组件 total |

