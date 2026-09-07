// af-mobile UI —— 移动端 SPA 路由
// route/go/back/forward + beforeEach/afterEach/notFound + router-view + keep-alive + 转场
// W7：query string 支持（parsePath 分离）+ outlet 失败抛 RouterError + scrollBehavior 仿 Vue Router
// 顶层无副作用，start() 显式启动（SSR 安全）；stop() 显式停止（移除 popstate、释放引用）
import { whenReady, hasPending } from './register-state.js';

const _routes = [];
let _rootOutlet = null;
let _currentNav = null;
let _currentRoute = null;
let _beforeEachGuard = null;
const _afterEachHooks = new Set();   // v3.0：数组化，多页面 route effect 互不干扰
let _notFoundHandler = null;
let _popHandler = null;               // popstate/hashchange 共用监听器引用，start() 注册、stop() 移除
const _cache = new Map();           // path → { outlet, scrollTop, route }
let _keepAliveMax = 5;
let _scrollBehavior = null;         // (to, from, savedPosition) => position | false
let _hashMode = false;              // hash 模式：路由路径取自 location.hash（零服务端配置）

/** 路由错误：outlet 选择器未命中时抛出 */
export class RouterError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RouterError';
  }
}

// 分离 path/search/hash：`/a/b?x=1#top` → { path:'/a/b', query:{x:'1'}, hash:'#top' }
function parsePath(fullPath) {
  const [path, search = ''] = fullPath.split('?');
  const [cleanPath, hash = ''] = path.split('#');
  const query = Object.fromEntries(new URLSearchParams(search));
  return { path: cleanPath, query, hash };
}

// DEV 兜底：漏注册的 af-* 元素不渲染、控制台也无任何报错（静默失败最难排查）。
// 渲染后扫一遍 outlet，把静默失败变成显式告警。
// 门控放在调用点（import.meta.env.DEV 生产恒 false）→ 本函数与 _warnedTags 被整体 tree-shake，零产物成本。
const _warnedTags = new Set();
function warnUnregistered(root) {
  if (!root?.querySelectorAll) return;
  for (const el of root.querySelectorAll('*')) {
    const tag = el.localName;
    if (!tag.startsWith('af-') || customElements.get(tag) || _warnedTags.has(tag)) continue;
    _warnedTags.add(tag);
    console.warn(`[@af-mobile/ui] <${tag}> 已使用但未注册：不会渲染且无报错，请在入口 register('${tag}')`);
  }
}

// 页面级兜底面板（错误 / 默认 404）：render() 在调 handler 前已 detachCurrent() 清空 outlet，
// 不渲染就是「白屏且只有控制台有痕」——prod 下用户只看到空白、无任何可反馈的信息。
// 静态骨架 innerHTML + 动态内容 textContent（天然转义，零依赖 escapeHtml，html.js 不进核心产物）；
// 只用 recipes 既有 class（empty/title/body/caption），不新增白名单条目。
function renderFallback(outlet, kind, title, body, path, stack = '') {
  if (!outlet) return;
  outlet.innerHTML = `<div class="empty" role="alert" data-router-error="${kind}"><p class="title"></p><p class="body"></p>${stack ? '<pre class="caption"></pre>' : ''}<p class="caption"></p></div>`;
  const p = outlet.querySelectorAll('p');
  p[0].textContent = title;
  p[1].textContent = body;
  p[p.length - 1].textContent = path;   // NodeList 非数组无 at()，用索引取末位（stack 用 <pre>，不占位）
  if (stack) outlet.querySelector('pre').textContent = stack;
}

// 应用 scrollBehavior 返回值：{ x, y } | { el, top } | false | null
function applyScroll(position) {
  if (!position || position === false) return;
  const el = position.el && (typeof position.el === 'string' ? document.querySelector(position.el) : position.el);
  if (el) return el.scrollIntoView({ block: 'start' });
  // NaN/undefined 一并归零：scrollTo 收到非数字会静默失效
  if (typeof scrollTo !== 'undefined') scrollTo(position.x || 0, position.y || 0);
}

// 归一化路由为 scrollBehavior 的 to/from 对象（含 meta）
function toObj(r) {
  return { path: parsePath(r.path).path, params: r.params || {}, query: r.query || {}, meta: r.meta || {} };
}

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
  return params;
}

function match(path) {
  for (const r of _routes) {
    const params = matchPath(r.path, path);
    if (params !== null) return { route: r, params };
  }
  return null;
}

// 嵌套路由匹配：按路径段从深到浅匹配，返回从父到子的匹配链；query 合并进每层 params
function matchNested(fullPath) {
  const { path, query } = parsePath(fullPath);
  const segments = path.split('/').filter(Boolean);
  const matches = [];
  const merge = m => m && { ...m, params: { ...m.params, ...query } };
  if (segments.length === 0) {
    const m = merge(match('/'));
    if (m) matches.push(m);
    return matches;
  }
  for (let i = segments.length; i >= 1; i--) {
    const prefix = '/' + segments.slice(0, i).join('/');
    const m = merge(match(prefix));
    if (m) matches.unshift(m);
  }
  return matches;
}

export function route(path, handler, options = {}) {
  _routes.push({ path, handler, ...options });
}

export function beforeEach(guard) { _beforeEachGuard = guard; }
export function afterEach(hook) {
  _afterEachHooks.add(hook);
  return () => _afterEachHooks.delete(hook);   // 返回取消函数，支持订阅清理
}
export function notFound(handler) { _notFoundHandler = handler; }

function callAfterEach(route, params, path) {
  _afterEachHooks.forEach(h => h(route, params, path));
}

export function current() {
  return _currentRoute ? { ..._currentRoute } : null;
}

// 当前完整路由路径：history 模式取 pathname+search+hash；hash 模式取 # 后段（无则 '/'）
function getFullPath() {
  if (_hashMode) return location.hash.slice(1) || '/';
  return location.pathname + location.search + location.hash;
}

export function start(options = {}, extra) {
  if (typeof history === 'undefined') return;
  // 防御：start('#app', { hash: true }) 双参形式——字符串为 outlet，第二参为选项。
  // 归一化为 { outlet, ...extra }，start('#app') / start('#app', { hash: true }) / start({ hash: true }) 三种形式都正确。
  if (typeof options === 'string') options = { outlet: options, ...extra };
  const { scrollRestoration = true, outlet = '#app', keepAliveMax = 5, scrollBehavior, hash = false } = options;
  if (scrollRestoration && 'scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  _rootOutlet = document.querySelector(outlet);
  if (!_rootOutlet) throw new RouterError(`router outlet 未找到: ${outlet}`);
  _keepAliveMax = keepAliveMax;
  _scrollBehavior = scrollBehavior || null;
  _hashMode = hash;
  // popstate = 前进/后退；hashchange = 手动改地址栏（同文档片段导航只触发 hashchange，不触发 popstate）。
  // 两者在前进/后退时都会触发 → 用当前路由 path 去重，避免同一次导航渲染两次。
  _popHandler = () => {
    const path = getFullPath();
    if (path === _currentRoute?.path) return;
    document.documentElement.dataset.transition = 'back';
    render(path);
  };
  addEventListener('popstate', _popHandler);
  if (hash) addEventListener('hashchange', _popHandler);   // 同一处理器，hash 模式额外挂一次
  // 首次渲染：仅在当前路径匹配已注册路由时自动渲染，避免首次加载即触发 notFound
  const currentPath = getFullPath();
  if (matchNested(currentPath).length > 0) {
    render(currentPath);
  }
  return stop;
}

/** 停止路由：移除 popstate 监听器，释放 outlet 引用。配合热重载 / 多实例 / 测试隔离 */
export function stop() {
  if (_popHandler) {
    removeEventListener('popstate', _popHandler);
    if (_hashMode) removeEventListener('hashchange', _popHandler);   // hash 模式下挂了两次
    _popHandler = null;
  }
  _hashMode = false;
}

// 替换当前 outlet 内容前：若当前路由是 keep-alive 且已入缓存，摘除节点保留实例并记录滚动位置；
// 否则直接清空（旧节点销毁）
function detachCurrent() {
  if (!_rootOutlet) return;
  const cur = _currentRoute;
  if (cur?.keepAlive && cur.outlet && cur.outlet.parentNode === _rootOutlet && _cache.has(cur.path)) {
    _cache.get(cur.path).scrollTop = window.scrollY || 0;
    cur.outlet.remove();
    return;
  }
  _rootOutlet.innerHTML = '';
}

// 返回 true = 导航成立（渲染完成或进入 404，可提交 URL）；返回 false = 被守卫阻止（不提交 URL）
// errRef：出参。页面函数抛错时把 error 传出去——视图已降级为错误面板、URL 已提交，
// 但错误仍要传播给 go() 的调用方（消费端需 catch 做重试/上报，如懒加载 chunk 拉取失败）。
async function render(path, errRef = {}) {
  // 渲染前统一等待按需注册的组件到位：入口因此无需顶层 await register(...)（TLA 会与生产分包
  // 形成 entry ↔ chunk 循环依赖 → 组件永不注册且零报错）；见 lib/register-state.js。
  // hasPending 短路：无待办注册时零额外 await，保持原有渲染时序。
  if (hasPending()) await whenReady();
  _currentNav?.abort();
  const from = _currentRoute ? toObj(_currentRoute) : null;   // 导航前捕获旧路由
  const { path: cleanPath, query } = parsePath(path);
  const nav = {
    aborted: false,
    controller: new AbortController(),
    abort() { this.aborted = true; this.controller.abort(); },
  };
  _currentNav = nav;

  const matches = matchNested(path);

  // 守卫前置：无论 keep-alive 命中与否，导航必须先过守卫
  if (matches.length > 0) {
    const lastMatch = matches.at(-1);
    if (_beforeEachGuard) {
      const result = await _beforeEachGuard(lastMatch.route, lastMatch.params, path);
      if (result === false) return false;   // 阻止导航：不渲染、不提交 URL
      // 重定向。必须 replace：被守卫拦下的导航不该在历史里留下痕迹，
      // 否则「直接访问受保护页 → 被弹回首页 → 按返回键又回受保护页再被弹回」= 后退陷阱
      if (typeof result === 'string') { await go(result, { transition: false, replace: true }); return false; }
    }
    if (nav.aborted) return false;
  }

  // keep-alive 命中：挂回缓存实例（不重新执行 handler），恢复 params 与滚动位置
  if (_cache.has(path)) {
    const cached = _cache.get(path);
    detachCurrent();
    if (_rootOutlet) _rootOutlet.appendChild(cached.outlet);
    _currentRoute = { path, params: cached.params, query, route: cached.route, outlet: cached.outlet, meta: cached.route.meta || {}, keepAlive: true };
    applyScroll(_scrollBehavior
      ? await _scrollBehavior({ path: cleanPath, params: cached.params, query, meta: cached.route.meta || {} }, from, { x: 0, y: cached.scrollTop })
      : { x: 0, y: cached.scrollTop });
    callAfterEach(cached.route, cached.params, path);
    return true;   // keep-alive 复用已扫描过的 DOM，无需重复告警
  }

  // 404：清空 outlet，让 notFound 渲染到干净容器（404 也是有效导航，提交 URL）
  if (matches.length === 0) {
    detachCurrent();
    // 未注册 notFound 时兜底渲染：否则 outlet 已清空却什么都没画 = 白屏且无任何提示
    if (_notFoundHandler) _notFoundHandler(path);
    else renderFallback(_rootOutlet, 'not-found', '页面不存在', '未匹配到路由', path);
    _currentRoute = { path, params: {}, query, route: null, outlet: _rootOutlet };
    return true;
  }

  const lastMatch = matches.at(-1);
  const node = document.createElement('div');
  node.setAttribute('data-router-view', '');
  detachCurrent();
  if (_rootOutlet) _rootOutlet.appendChild(node);

  let currentOutlet = node;
  let lastRoute = null;
  let lastParams = null;
  for (const m of matches) {
    const ctx = { outlet: currentOutlet, signal: nav.controller.signal, go };
    let ret;
    try {
      ret = await m.route.handler(m.params, ctx);
      // 路由懒加载：handler 返回动态 import 的模块（default 为渲染函数，可带 meta 并入路由）
      if (ret?.default) {   // 动态 import 的模块：default 为渲染函数（可带 meta 并入路由）
        if (ret.meta) m.route.meta = { ...m.route.meta, ...ret.meta };
        ret = await ret.default(m.params, ctx);
      }
    } catch (err) {
      // 页面函数抛错（请求失败 / 空值解引用 / 模板语法错）：此处 outlet 已被 detachCurrent() 清空，
      // 不兜底就是白屏且只有控制台有痕。渲染错误面板并 return true（提交 URL，保持 URL 与视图一致）。
      // dev 显示堆栈 + 路由上下文；prod 只显示 message（不泄漏堆栈）。
      if (nav.aborted) return false;   // 已被新导航抢占，让位给新导航
      const errRoute = lastRoute || m.route;
      renderFallback(currentOutlet, 'error', '页面出错了', String(err?.message || err), path, import.meta.env?.DEV ? String(err?.stack || '') : '');
      console.error(`[@af-mobile/ui] 路由 ${path} 页面函数抛错（已渲染错误面板）：`, err);
      _currentRoute = { path, params: lastParams || m.params, query, route: errRoute, outlet: node, meta: errRoute.meta || {}, keepAlive: false };
      callAfterEach(errRoute, lastParams || m.params, path);
      errRef.error = err;   // 交由 go() 在提交 URL 后抛出，保留错误传播
      return true;
    }
    // 框架接管页面生命周期：页面函数返回带 unmount() 的对象（createPage 实例或自定义清理对象）时，
    // 导航 abort 时自动清理。消费端不再需要每页重复
    // ctx.signal.addEventListener('abort', () => page.unmount())（cam-scanner 实测 9 处样板）。
    // 已 aborted 的 signal 上 addEventListener 不会触发——正是期望行为（该页面已被弃用）。
    if (ret?.unmount) nav.controller.signal.addEventListener('abort', () => ret.unmount());
    if (typeof ret === 'string') {
      const sub = currentOutlet.querySelector(ret);
      if (!sub) throw new RouterError(`router 嵌套 outlet 未找到: ${ret}`);
      currentOutlet = sub;
    }
    lastRoute = m.route;
    lastParams = m.params;
    if (nav.aborted) return false;
  }

  // keep-alive：缓存 DOM 节点
  if (lastRoute.keepAlive) {
    while (_cache.size >= _keepAliveMax) {
      const oldest = _cache.keys().next().value;
      _cache.delete(oldest);
    }
    _cache.set(path, { outlet: node, scrollTop: 0, params: lastParams, route: lastRoute });
  }

  _currentRoute = { path, params: lastParams, query, route: lastRoute, outlet: node, meta: lastRoute.meta || {}, keepAlive: !!lastRoute.keepAlive };
  callAfterEach(lastRoute, lastParams, path);
  if (lastRoute.scroll !== false) {
    applyScroll(_scrollBehavior
      ? await _scrollBehavior({ path: cleanPath, params: lastParams, query, meta: lastRoute.meta || {} }, from, null)
      : { x: 0, y: 0 });
  }
  if (import.meta.env?.DEV) warnUnregistered(_rootOutlet);
  return true;
}

export async function go(path, options = {}) {
  if (typeof history === 'undefined') return false;   // async 函数自动包装 Promise
  const { replace = false, transition = true } = options;
  document.documentElement.dataset.transition = 'forward';
  const navigate = async () => {
    const errRef = {};
    const ok = await render(path, errRef);
    if (!ok) return false;   // 守卫阻止：不提交 URL（避免 URL 与视图不一致）
    if (replace) history.replaceState({}, '', _hashMode ? '#' + path : path);
    else history.pushState({}, '', _hashMode ? '#' + path : path);
    // 页面函数抛错：错误面板已渲染、URL 已提交，此刻再抛出——
    // 「不白屏」与「错误可感知」两者都要，调用方仍可 catch 做重试/上报
    if (errRef.error) throw errRef.error;
    return true;
  };
  if (transition && document.startViewTransition) {
    // Promise.withResolvers（Baseline 2024）：替代 new Promise((resolve, reject) => {...}) 手工包装
    const { promise, resolve, reject } = Promise.withResolvers();
    const vt = document.startViewTransition(() => navigate().then(resolve, reject));
    // 新导航抢占时，旧 transition 的 ready 会 reject（DOMException: Transition was skipped），
    // 不接住会冒成未捕获 rejection。skip 后导航回调与 finished 仍正常进行，结果以上方 resolve/reject 为准
    vt.ready.catch(() => {});
    return promise;
  }
  return navigate();
}

export function back() {
  if (typeof history !== 'undefined') history.back();
}

export function forward() {
  if (typeof history !== 'undefined') history.forward();
}

// 测试用：重置路由内部状态（不导出到 index.js）
export function _resetRouter() {
  stop();
  _routes.length = 0;
  _beforeEachGuard = null;
  _afterEachHooks.clear();
  _notFoundHandler = null;
  _currentRoute = null;
  _currentNav = null;
  _rootOutlet = null;
  _cache.clear();
  _scrollBehavior = null;
  _hashMode = false;
}
