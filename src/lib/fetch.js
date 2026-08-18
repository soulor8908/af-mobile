// af-mobile UI —— 数据获取封装
// fetchPage + 错误分类（Timeout/Http/Abort）+ 去重/缓存/拦截器
// 顶层仅声明 Map/Set，无 DOM 访问，Node 18+ fetch/AbortController 原生（SSR 安全）

export class FetchError extends Error {}
export class TimeoutError extends FetchError {}
export class HttpError extends FetchError {
  constructor(status, url, body) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
    this.body = body;
  }
}
export class AbortError extends FetchError {}

const _inflight = new Map();      // url → Promise（GET 去重）
let _cache = new Map();           // url → { data, expiry }（默认内存；setCacheAdapter 可换持久化后端）
const _interceptors = { request: [], response: [], error: [] };  // 拦截器按阶段分组
const _backendAdapters = new Map();  // scheme → adapter（supabase:// 等，由独立 adapter 包注册）

/**
 * 注册后端 scheme 适配器：fetchPage 遇到 `scheme://...` 形式的 URL 时分发给 adapter。
 * 主包只提供分发机制，不携带任何具体 adapter（零依赖红线）。
 * @param {string} scheme - URL scheme，如 'supabase'
 * @param {(url: string, opts: object) => Promise<{data: any, total?: number}>} adapter
 */
export function registerBackend(scheme, adapter) {
  if (typeof scheme !== 'string' || !scheme) throw new TypeError('scheme must be a non-empty string');
  if (typeof adapter !== 'function') throw new TypeError('adapter must be a function');
  _backendAdapters.set(scheme, adapter);
}

export function unregisterBackend(scheme) {
  _backendAdapters.delete(scheme);
}

// 提取 URL scheme：'supabase://x' → 'supabase'；'/api/x'、'https://x' 未注册时返回 null
function _lookupBackend(url) {
  const m = /^[a-z][a-z0-9+.-]*:\/\//i.exec(url);
  if (!m) return null;
  return _backendAdapters.get(m[0].slice(0, -3).toLowerCase()) || null;
}

export async function fetchPage(url, opts = {}) {
  const {
    method = 'GET', headers = {}, body = null,
    timeout = 10000, retries = 1, retryDelay = 300,
    dedupe = true, cache = false, cacheTTL = 5000,
    responseType = 'json', signal = null,
  } = opts;

  // 0. 后端 scheme 分发（supabase:// 等）：request 拦截器先执行（与原生路径同契约：返回 opts / Response 短路）
  const backend = _lookupBackend(url);
  if (backend) {
    let finalOpts = opts;
    for (const fn of _interceptors.request) {
      const r = await fn(url, finalOpts);
      if (r instanceof Response) return _runResponsePhase(url, await _parseResponse(r, responseType));
      finalOpts = r;
    }
    return backend(url, { ...finalOpts, signal });
  }

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

  const promise = _doFetch(url, {
    method, headers, body, timeout, retries, retryDelay, responseType, signal,
  });

  if (dedupe && method === 'GET') {
    _inflight.set(url, promise);
    promise.finally(() => _inflight.delete(url)).catch(() => {});
  }

  const data = await promise;

  if (cache && method === 'GET') {
    _cache.set(url, { data, expiry: Date.now() + cacheTTL });
  }

  return data;
}

async function _doFetch(url, { method, headers, body, timeout, retries, retryDelay, responseType, signal }) {
  const ctrl = new AbortController();
  const timeoutId = timeout > 0 ? setTimeout(() => ctrl.abort(new TimeoutError()), timeout) : null;

  if (signal) {
    signal.addEventListener('abort', () => ctrl.abort(new AbortError()));
  }

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // request 阶段：拦截器返回新 opts 继续，或返回 Response 短路
      let finalOpts = { method, headers, body, signal: ctrl.signal };
      for (const interceptor of _interceptors.request) {
        const result = await interceptor(url, finalOpts);
        if (result instanceof Response) return _runResponsePhase(url, await _parseResponse(result, responseType));
        finalOpts = result;
      }
      const res = await fetch(url, finalOpts);
      if (!res.ok) {
        const errBody = await res.text().catch(() => null);
        throw new HttpError(res.status, url, errBody);
      }
      if (timeoutId) clearTimeout(timeoutId);
      return await _runResponsePhase(url, await _parseResponse(res, responseType));
    } catch (err) {
      // error 阶段：拦截器返回数据即恢复错误（短路），未恢复则走原重试/抛出逻辑
      const recovered = await _runErrorPhase(url, err);
      if (recovered !== undefined) return recovered;
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

// response 阶段：拦截器依次变换数据
async function _runResponsePhase(url, data) {
  let out = data;
  for (const fn of _interceptors.response) out = await fn(url, out);
  return out;
}

// error 阶段：拦截器返回非 undefined 即恢复错误（短路），否则继续
async function _runErrorPhase(url, err) {
  for (const fn of _interceptors.error) {
    const recovered = await fn(url, err);
    if (recovered !== undefined) return recovered;
  }
  return undefined;
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

// 分阶段拦截器：addInterceptor(fn) 兼容旧式（= request）；addInterceptor('response'|'error', fn)
export function addInterceptor(fnOrPhase, fn) {
  if (typeof fnOrPhase === 'function') _interceptors.request.push(fnOrPhase);  // 向后兼容
  else if (_interceptors[fnOrPhase]) _interceptors[fnOrPhase].push(fn);
}

export function removeInterceptor(fn) {
  for (const list of Object.values(_interceptors)) {
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  }
}

export function invalidateCache(url) {
  _cache.delete(url);
}

export function clearCache() {
  _cache.clear();
}

/** 持久化缓存后端：localStorageAdapter() 创建（与 Map 同接口 get/set/delete/clear） */
export function localStorageAdapter({ prefix = 'af-mobile-cache:' } = {}) {
  const get = (url) => {
    try {
      const raw = localStorage.getItem(prefix + url);
      if (raw == null) return undefined;
      const hit = JSON.parse(raw);
      if (hit.expiry <= Date.now()) { localStorage.removeItem(prefix + url); return undefined; }  // 过期清理
      return hit;
    } catch { return undefined; }
  };
  const set = (url, entry) => {
    const d = entry.data;
    // 不可 JSON 序列化（Blob/Response/ArrayBuffer，跨 realm 用 toString tag 判定），跳过持久化
    const tag = d && Object.prototype.toString.call(d);
    if (tag === '[object Blob]' || tag === '[object Response]' || tag === '[object ArrayBuffer]') return;
    try { localStorage.setItem(prefix + url, JSON.stringify(entry)); } catch { /* 容量超限等静默降级 */ }
  };
  const del = (url) => { localStorage.removeItem(prefix + url); };
  const clear = () => {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) localStorage.removeItem(k);
    }
  };
  return { get, set, delete: del, clear };
}

/** 切换缓存后端（默认内存 Map；传 localStorageAdapter() 启用持久化缓存） */
export function setCacheAdapter(adapter) {
  _cache = adapter;
}

// 测试用：重置缓存后端为内存 Map（不导出到 index.js）
export function _resetCacheAdapter() {
  _cache = new Map();
}

// 测试用：重置拦截器（不导出到 index.js）
export function _resetInterceptors() {
  _interceptors.request.length = 0;
  _interceptors.response.length = 0;
  _interceptors.error.length = 0;
}
