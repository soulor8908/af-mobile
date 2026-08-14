// AIFlow UI —— 移动端 SPA 路由
// route/go/back/forward + beforeEach/afterEach/notFound + router-view + keep-alive + 转场
// W7：query string 支持（parsePath 分离）+ outlet 失败抛 RouterError + scrollBehavior 仿 Vue Router
// 顶层无副作用，start() 显式启动（SSR 安全）

const _routes = [];
let _rootOutlet = null;
let _currentNav = null;
let _currentRoute = null;
let _beforeEachGuard = null;
const _afterEachHooks = new Set();   // v3.0：数组化，多页面 route effect 互不干扰
let _notFoundHandler = null;
const _navStack = [];
const _cache = new Map();           // path → { outlet, scrollTop, route }
let _keepAliveMax = 5;
let _scrollBehavior = null;         // (to, from, savedPosition) => position | false

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

export function start(options = {}) {
  if (typeof history === 'undefined') return;
  const { scrollRestoration = true, outlet = '#app', keepAliveMax = 5, scrollBehavior } = options;
  if (scrollRestoration && 'scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  _rootOutlet = document.querySelector(outlet);
  if (!_rootOutlet) throw new RouterError(`router outlet 未找到: ${outlet}`);
  _keepAliveMax = keepAliveMax;
  _scrollBehavior = scrollBehavior || null;
  addEventListener('popstate', () => {
    _navStack.pop();
    document.documentElement.dataset.transition = 'back';
    render(location.pathname + location.search + location.hash);
  });
  // 首次渲染：仅在当前路径匹配已注册路由时自动渲染，避免首次加载即触发 notFound
  const currentPath = location.pathname + location.search + location.hash;
  if (matchNested(currentPath).length > 0) {
    render(currentPath);
  }
}

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

  // keep-alive 命中
  if (_cache.has(path)) {
    const cached = _cache.get(path);
    if (_rootOutlet) {
      _rootOutlet.innerHTML = '';
      _rootOutlet.appendChild(cached.outlet);
    }
    _currentRoute = { path, params: {}, query, route: cached.route, outlet: cached.outlet, meta: cached.route.meta || {} };
    applyScroll(_scrollBehavior
      ? await _scrollBehavior({ path: cleanPath, params: {}, query, meta: cached.route.meta || {} }, from, { x: 0, y: cached.scrollTop })
      : { x: 0, y: cached.scrollTop });
    callAfterEach(cached.route, {}, path);
    return;
  }

  const matches = matchNested(path);
  if (matches.length === 0) {
    _notFoundHandler?.(path);
    _currentRoute = { path, params: {}, query, route: null, outlet: _rootOutlet };
    return;
  }

  const lastMatch = matches[matches.length - 1];

  if (_beforeEachGuard) {
    const result = await _beforeEachGuard(lastMatch.route, lastMatch.params, path);
    if (result === false) return;
    if (typeof result === 'string') { await go(result); return; }
  }
  if (nav.aborted) return;

  const node = document.createElement('div');
  node.setAttribute('data-router-view', '');
  if (_rootOutlet) _rootOutlet.innerHTML = '';
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
    if (nav.aborted) return;
  }

  // keep-alive：缓存 DOM 节点
  if (lastRoute.keepAlive) {
    while (_cache.size >= _keepAliveMax) {
      const oldest = _cache.keys().next().value;
      _cache.delete(oldest);
    }
    _cache.set(path, { outlet: node, scrollTop: 0, route: lastRoute });
  }

  _currentRoute = { path, params: lastParams, query, route: lastRoute, outlet: node, meta: lastRoute.meta || {} };
  callAfterEach(lastRoute, lastParams, path);
  if (lastRoute.scroll !== false) {
    applyScroll(_scrollBehavior
      ? await _scrollBehavior({ path: cleanPath, params: lastParams, query, meta: lastRoute.meta || {} }, from, null)
      : { x: 0, y: 0 });
  }
}

export function go(path, options = {}) {
  if (typeof history === 'undefined') return Promise.resolve();
  const { replace = false, transition = true } = options;
  _navStack.push(path);
  document.documentElement.dataset.transition = 'forward';
  const navigate = () => {
    if (replace) history.replaceState({}, '', path);
    else history.pushState({}, '', path);
    return render(path);
  };
  if (transition && document.startViewTransition) {
    return new Promise(resolve => {
      document.startViewTransition(() => navigate().then(resolve));
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
  _routes.length = 0;
  _beforeEachGuard = null;
  _afterEachHooks.clear();
  _notFoundHandler = null;
  _currentRoute = null;
  _currentNav = null;
  _navStack.length = 0;
  _cache.clear();
  _scrollBehavior = null;
}
