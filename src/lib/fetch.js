// AIFlow UI —— 数据获取封装
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
const _cache = new Map();         // url → { data, expiry }
const _interceptors = [];         // 拦截器数组

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

  const promise = _doFetch(url, {
    method, headers, body, timeout, retries, retryDelay, responseType, signal,
  });

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

async function _doFetch(url, { method, headers, body, timeout, retries, retryDelay, responseType, signal }) {
  const ctrl = new AbortController();
  const timeoutId = timeout > 0 ? setTimeout(() => ctrl.abort(new TimeoutError()), timeout) : null;

  if (signal) {
    signal.addEventListener('abort', () => ctrl.abort(new AbortError()));
  }

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
