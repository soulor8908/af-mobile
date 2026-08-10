// AIFlow UI —— 移动端 SPA 路由
// route/go/back/forward + beforeEach/afterEach/notFound + router-view + keep-alive + 转场
// 顶层无副作用，start() 显式启动（SSR 安全）

const _routes = [];
let _rootOutlet = null;
let _currentNav = null;
let _currentRoute = null;
let _beforeEachGuard = null;
let _afterEachHook = null;
let _notFoundHandler = null;
const _navStack = [];
const _cache = new Map();           // path → { outlet, scrollTop, route }
let _keepAliveMax = 5;

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

// 嵌套路由匹配：按路径段从深到浅匹配，返回从父到子的匹配链
function matchNested(path) {
  const segments = path.split('/').filter(Boolean);
  const matches = [];
  if (segments.length === 0) {
    const m = match('/');
    if (m) matches.push(m);
    return matches;
  }
  for (let i = segments.length; i >= 1; i--) {
    const prefix = '/' + segments.slice(0, i).join('/');
    const m = match(prefix);
    if (m) matches.unshift(m);
  }
  return matches;
}

export function route(path, handler, options = {}) {
  _routes.push({ path, handler, ...options });
}

export function beforeEach(guard) { _beforeEachGuard = guard; }
export function afterEach(hook) { _afterEachHook = hook; }
export function notFound(handler) { _notFoundHandler = handler; }

export function current() {
  return _currentRoute ? { ..._currentRoute } : null;
}

export function start(options = {}) {
  if (typeof history === 'undefined') return;
  const { scrollRestoration = true, outlet = '#app', keepAliveMax = 5 } = options;
  if (scrollRestoration && 'scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  _rootOutlet = document.querySelector(outlet);
  _keepAliveMax = keepAliveMax;
  addEventListener('popstate', () => {
    _navStack.pop();
    document.documentElement.dataset.transition = 'back';
    render(location.pathname);
  });
  // 首次渲染：仅在当前路径匹配已注册路由时自动渲染，避免首次加载即触发 notFound
  const currentPath = location.pathname;
  if (matchNested(currentPath).length > 0) {
    render(currentPath);
  }
}

async function render(path) {
  _currentNav?.abort();
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
    if (typeof scrollTo !== 'undefined') scrollTo(0, cached.scrollTop);
    _currentRoute = { path, params: {}, route: cached.route, outlet: cached.outlet };
    _afterEachHook?.(cached.route, {}, path);
    return;
  }

  const matches = matchNested(path);
  if (matches.length === 0) {
    _notFoundHandler?.(path);
    _currentRoute = { path, params: {}, route: null, outlet: _rootOutlet };
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
    const subOutletSelector = await m.route.handler(m.params, ctx);
    if (typeof subOutletSelector === 'string') {
      currentOutlet = currentOutlet.querySelector(subOutletSelector) || currentOutlet;
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

  _currentRoute = { path, params: lastParams, route: lastRoute, outlet: node };
  _afterEachHook?.(lastRoute, lastParams, path);
  if (lastRoute.scroll !== false && typeof scrollTo !== 'undefined') scrollTo(0, 0);
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
  _afterEachHook = null;
  _notFoundHandler = null;
  _currentRoute = null;
  _currentNav = null;
  _navStack.length = 0;
  _cache.clear();
}
