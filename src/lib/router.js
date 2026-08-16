// AIFlow UI —— 移动端 SPA 路由
// route/go/back/forward + beforeEach/afterEach/notFound + router-view + keep-alive + 转场
// W7：query string 支持（parsePath 分离）+ outlet 失败抛 RouterError + scrollBehavior 仿 Vue Router
// 顶层无副作用，start() 显式启动（SSR 安全）；stop() 显式停止（移除 popstate、释放引用）

const _routes = [];
let _rootOutlet = null;
let _currentNav = null;
let _currentRoute = null;
let _beforeEachGuard = null;
const _afterEachHooks = new Set();   // v3.0：数组化，多页面 route effect 互不干扰
let _notFoundHandler = null;
let _popHandler = null;               // popstate 监听器引用，start() 注册、stop() 移除
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

// 应用 scrollBehavior 返回值：{ x, y } | { el, top } | false | null
function applyScroll(position) {
  if (!position || position === false) return;
  if (position.el) {
    const el = typeof position.el === 'string' ? document.querySelector(position.el) : position.el;
    if (el) el.scrollIntoView({ block: 'start' });
  } else {
    const { x = 0, y = 0 } = position;
    if (typeof scrollTo !== 'undefined') scrollTo(x, y);
  }
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

export function start(options = {}) {
  if (typeof history === 'undefined') return;
  const { scrollRestoration = true, outlet = '#app', keepAliveMax = 5, scrollBehavior, hash = false } = options;
  if (scrollRestoration && 'scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  _rootOutlet = document.querySelector(outlet);
  if (!_rootOutlet) throw new RouterError(`router outlet 未找到: ${outlet}`);
  _keepAliveMax = keepAliveMax;
  _scrollBehavior = scrollBehavior || null;
  _hashMode = hash;
  _popHandler = () => {
    document.documentElement.dataset.transition = 'back';
    render(getFullPath());
  };
  addEventListener('popstate', _popHandler);
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
    _rootOutlet.removeChild(cur.outlet);
    return;
  }
  _rootOutlet.innerHTML = '';
}

// 返回 true = 导航成立（渲染完成或进入 404，可提交 URL）；返回 false = 被守卫阻止（不提交 URL）
async function render(path) {
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
    const lastMatch = matches[matches.length - 1];
    if (_beforeEachGuard) {
      const result = await _beforeEachGuard(lastMatch.route, lastMatch.params, path);
      if (result === false) return false;   // 阻止导航：不渲染、不提交 URL
      if (typeof result === 'string') { await go(result, { transition: false }); return false; }  // 重定向
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
    return true;
  }

  // 404：清空 outlet，让 notFound 渲染到干净容器（404 也是有效导航，提交 URL）
  if (matches.length === 0) {
    detachCurrent();
    _notFoundHandler?.(path);
    _currentRoute = { path, params: {}, query, route: null, outlet: _rootOutlet };
    return true;
  }

  const lastMatch = matches[matches.length - 1];
  const node = document.createElement('div');
  node.setAttribute('data-router-view', '');
  detachCurrent();
  if (_rootOutlet) _rootOutlet.appendChild(node);

  let currentOutlet = node;
  let lastRoute = null;
  let lastParams = null;
  for (const m of matches) {
    const ctx = { outlet: currentOutlet, signal: nav.controller.signal, go };
    let ret = await m.route.handler(m.params, ctx);
    // 路由懒加载：handler 返回动态 import 的模块（default 为渲染函数，可带 meta 并入路由）
    if (ret && typeof ret === 'object' && typeof ret.default === 'function') {
      if (ret.meta) m.route.meta = { ...m.route.meta, ...ret.meta };
      ret = await ret.default(m.params, ctx);
    }
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
  return true;
}

export async function go(path, options = {}) {
  if (typeof history === 'undefined') return Promise.resolve(false);
  const { replace = false, transition = true } = options;
  document.documentElement.dataset.transition = 'forward';
  const navigate = async () => {
    const ok = await render(path);
    if (!ok) return false;   // 守卫阻止：不提交 URL（避免 URL 与视图不一致）
    if (replace) history.replaceState({}, '', _hashMode ? '#' + path : path);
    else history.pushState({}, '', _hashMode ? '#' + path : path);
    return true;
  };
  if (transition && document.startViewTransition) {
    return new Promise((resolve, reject) => {
      document.startViewTransition(() => navigate().then(resolve, reject));
    });
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
