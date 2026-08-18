import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  fetchPage, FetchError, TimeoutError, HttpError, AbortError,
  invalidateCache, clearCache,
  addInterceptor, removeInterceptor, _resetInterceptors,
  localStorageAdapter, setCacheAdapter, _resetCacheAdapter,
  registerBackend, unregisterBackend,
} from '../src/lib/fetch.js';

// 全局 fetch mock
const _fetch = vi.fn();
beforeEach(() => {
  _fetch.mockReset();
  globalThis.fetch = _fetch;
  globalThis.Response = Response;
  localStorage.clear();
  _resetCacheAdapter();
});
afterEach(() => vi.restoreAllMocks());

function mockResponse(body, opts = {}) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status: 200, headers: { 'Content-Type': 'application/json' }, ...opts,
  });
}

describe('fetchPage 基础', () => {
  it('GET 请求解析 JSON', async () => {
    _fetch.mockResolvedValue(mockResponse({ list: [1, 2, 3] }));
    const data = await fetchPage('/api/test');
    expect(data).toEqual({ list: [1, 2, 3] });
    expect(_fetch).toHaveBeenCalledOnce();
    expect(_fetch.mock.calls[0][1].method).toBe('GET');
  });

  it('空响应 body 返回 null', async () => {
    _fetch.mockResolvedValue(new Response('', { status: 200 }));
    const data = await fetchPage('/api/empty');
    expect(data).toBeNull();
  });

  it('responseType=text 返回字符串', async () => {
    _fetch.mockResolvedValue(mockResponse('plain text', { headers: { 'Content-Type': 'text/plain' } }));
    const data = await fetchPage('/api/text', { responseType: 'text' });
    expect(data).toBe('plain text');
  });

  it('responseType=response 返回原始 Response', async () => {
    const res = mockResponse({ ok: true });
    _fetch.mockResolvedValue(res);
    const data = await fetchPage('/api/raw', { responseType: 'response' });
    expect(data).toBe(res);
  });

  it('POST 请求传 body', async () => {
    _fetch.mockResolvedValue(mockResponse({ ok: true }));
    await fetchPage('/api/post', { method: 'POST', body: '{"a":1}' });
    expect(_fetch.mock.calls[0][1].method).toBe('POST');
    expect(_fetch.mock.calls[0][1].body).toBe('{"a":1}');
  });

  it('自定义 headers 透传', async () => {
    _fetch.mockResolvedValue(mockResponse({}));
    await fetchPage('/api/h', { headers: { 'X-Token': 'abc' } });
    expect(_fetch.mock.calls[0][1].headers['X-Token']).toBe('abc');
  });
});

describe('fetchPage 错误分类', () => {
  it('HTTP 404 抛 HttpError 含 status 和 body', async () => {
    _fetch.mockResolvedValue(new Response('Not Found', { status: 404 }));
    await expect(fetchPage('/api/404')).rejects.toMatchObject({
      name: 'HttpError', status: 404, body: 'Not Found',
    });
    expect(_fetch).toHaveBeenCalledOnce();  // HTTP 错误不重试
  });

  it('HTTP 500 抛 HttpError', async () => {
    _fetch.mockResolvedValue(new Response('Server Error', { status: 500 }));
    await expect(fetchPage('/api/500')).rejects.toBeInstanceOf(HttpError);
  });

  it('timeout=0 不超时', async () => {
    _fetch.mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 50));
      return mockResponse({ ok: true });
    });
    const data = await fetchPage('/api/slow', { timeout: 0 });
    expect(data).toEqual({ ok: true });
  });

  it('timeout 触发 TimeoutError', async () => {
    _fetch.mockImplementation((_url, opts) => new Promise((resolve, reject) => {
      if (opts.signal?.aborted) { reject(opts.signal.reason); return; }
      const timer = setTimeout(() => resolve(mockResponse({})), 200);
      opts.signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(opts.signal.reason);
      });
    }));
    await expect(fetchPage('/api/timeout', { timeout: 50 })).rejects.toBeInstanceOf(TimeoutError);
  });

  it('外部 signal abort 触发 AbortError', async () => {
    _fetch.mockImplementation((_url, opts) => new Promise((resolve, reject) => {
      if (opts.signal?.aborted) { reject(opts.signal.reason); return; }
      const timer = setTimeout(() => resolve(mockResponse({})), 200);
      opts.signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(opts.signal.reason);
      });
    }));
    const ctrl = new AbortController();
    const p = fetchPage('/api/abort', { signal: ctrl.signal, timeout: 0 });
    ctrl.abort(new AbortError());
    await expect(p).rejects.toBeInstanceOf(AbortError);
  });

  it('所有错误都是 FetchError 子类', async () => {
    _fetch.mockResolvedValue(new Response('', { status: 404 }));
    await expect(fetchPage('/api/e')).rejects.toBeInstanceOf(FetchError);
  });

  it('JSON 解析失败抛 FetchError', async () => {
    _fetch.mockImplementation(() => Promise.resolve(new Response('not json', {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })));
    await expect(fetchPage('/api/badjson')).rejects.toBeInstanceOf(FetchError);
    await expect(fetchPage('/api/badjson')).rejects.not.toBeInstanceOf(HttpError);
  });
});

describe('fetchPage 重试', () => {
  it('网络错误重试 retries 次后抛错', async () => {
    _fetch.mockRejectedValue(new TypeError('network error'));
    await expect(fetchPage('/api/retry', { retries: 2, retryDelay: 1 })).rejects.toBeInstanceOf(TypeError);
    expect(_fetch).toHaveBeenCalledTimes(3);  // 初始 + 2 次重试
  });

  it('HTTP 错误不重试', async () => {
    _fetch.mockResolvedValue(new Response('', { status: 500 }));
    await expect(fetchPage('/api/noretry', { retries: 3 })).rejects.toBeInstanceOf(HttpError);
    expect(_fetch).toHaveBeenCalledOnce();
  });

  it('重试期间成功则返回数据', async () => {
    _fetch.mockResolvedValueOnce(new TypeError('fail'))
          .mockResolvedValueOnce(mockResponse({ ok: true }));
    const data = await fetchPage('/api/retryok', { retries: 2, retryDelay: 1 });
    expect(data).toEqual({ ok: true });
    expect(_fetch).toHaveBeenCalledTimes(2);
  });
});

describe('fetchPage 去重', () => {
  it('相同 URL 并发 GET 只发 1 次 fetch', async () => {
    _fetch.mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 50));
      return mockResponse({ ok: true });
    });
    const [a, b, c] = await Promise.all([
      fetchPage('/api/dedupe'),
      fetchPage('/api/dedupe'),
      fetchPage('/api/dedupe'),
    ]);
    expect(_fetch).toHaveBeenCalledOnce();
    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
    expect(c).toEqual({ ok: true });
  });

  it('POST 请求不去重', async () => {
    _fetch.mockImplementation(() => Promise.resolve(mockResponse({})));
    await Promise.all([
      fetchPage('/api/post', { method: 'POST', body: '1' }),
      fetchPage('/api/post', { method: 'POST', body: '2' }),
    ]);
    expect(_fetch).toHaveBeenCalledTimes(2);
  });

  it('去重完成后再次请求会重新 fetch', async () => {
    _fetch.mockImplementation(() => Promise.resolve(mockResponse({})));
    await fetchPage('/api/again');
    await fetchPage('/api/again');
    expect(_fetch).toHaveBeenCalledTimes(2);
  });
});

describe('fetchPage 缓存', () => {
  it('cache=true 命中缓存跳过 fetch', async () => {
    _fetch.mockResolvedValue(mockResponse({ v: 1 }));
    await fetchPage('/api/c1', { cache: true, cacheTTL: 1000 });
    const data = await fetchPage('/api/c1', { cache: true, cacheTTL: 1000 });
    expect(data).toEqual({ v: 1 });
    expect(_fetch).toHaveBeenCalledOnce();
  });

  it('TTL 过期后重新请求', async () => {
    _fetch.mockResolvedValue(mockResponse({ v: 1 }));
    await fetchPage('/api/c2', { cache: true, cacheTTL: 10 });
    await new Promise(r => setTimeout(r, 30));
    _fetch.mockResolvedValue(mockResponse({ v: 2 }));
    const data = await fetchPage('/api/c2', { cache: true, cacheTTL: 10 });
    expect(data).toEqual({ v: 2 });
    expect(_fetch).toHaveBeenCalledTimes(2);
  });

  it('invalidateCache 主动失效', async () => {
    _fetch.mockResolvedValue(mockResponse({ v: 1 }));
    await fetchPage('/api/c3', { cache: true, cacheTTL: 10000 });
    invalidateCache('/api/c3');
    _fetch.mockResolvedValue(mockResponse({ v: 2 }));
    const data = await fetchPage('/api/c3', { cache: true, cacheTTL: 10000 });
    expect(data).toEqual({ v: 2 });
    expect(_fetch).toHaveBeenCalledTimes(2);
  });

  it('clearCache 清空所有缓存', async () => {
    _fetch.mockImplementation(() => Promise.resolve(mockResponse({ a: 1 })));
    await fetchPage('/api/c4', { cache: true, cacheTTL: 10000 });
    await fetchPage('/api/c5', { cache: true, cacheTTL: 10000 });
    clearCache();
    _fetch.mockImplementation(() => Promise.resolve(mockResponse({ a: 2 })));
    const data = await fetchPage('/api/c4', { cache: true, cacheTTL: 10000 });
    expect(data).toEqual({ a: 2 });
    expect(_fetch).toHaveBeenCalledTimes(3);
  });
});

describe('fetchPage 拦截器', () => {
  afterEach(() => _resetInterceptors());

  it('拦截器返回 opts 继续请求', async () => {
    _fetch.mockResolvedValue(mockResponse({}));
    const interceptor = (url, opts) => {
      opts.headers['X-Auth'] = 'token';
      return opts;
    };
    addInterceptor(interceptor);
    await fetchPage('/api/i1');
    expect(_fetch.mock.calls[0][1].headers['X-Auth']).toBe('token');
    removeInterceptor(interceptor);
  });

  it('拦截器返回 Response 短路', async () => {
    _fetch.mockResolvedValue(mockResponse({ real: true }));
    addInterceptor(() => new Response(JSON.stringify({ mock: true }), {
      headers: { 'Content-Type': 'application/json' },
    }));
    const data = await fetchPage('/api/i2');
    expect(data).toEqual({ mock: true });
    expect(_fetch).not.toHaveBeenCalled();
  });

  it('多个拦截器按顺序执行', async () => {
    _fetch.mockResolvedValue(mockResponse({}));
    const order = [];
    addInterceptor((url, opts) => { order.push('a'); return opts; });
    addInterceptor((url, opts) => { order.push('b'); return opts; });
    await fetchPage('/api/i3');
    expect(order).toEqual(['a', 'b']);
  });
});

describe('fetchPage 拦截器分阶段', () => {
  afterEach(() => _resetInterceptors());

  it('response 阶段拦截器变换数据', async () => {
    _fetch.mockResolvedValue(mockResponse({ a: 1 }));
    addInterceptor('response', (url, data) => ({ ...data, transformed: true }));
    const data = await fetchPage('/api/r1');
    expect(data).toEqual({ a: 1, transformed: true });
  });

  it('error 阶段拦截器恢复错误（返回数据）', async () => {
    _fetch.mockRejectedValue(new TypeError('network'));
    addInterceptor('error', (url, err) => ({ recovered: true }));
    const data = await fetchPage('/api/r2');
    expect(data).toEqual({ recovered: true });
  });

  it('error 阶段拦截器返回 undefined 时继续抛错', async () => {
    _fetch.mockRejectedValue(new TypeError('network'));
    addInterceptor('error', () => undefined);
    await expect(fetchPage('/api/r3')).rejects.toBeInstanceOf(TypeError);
  });

  it('request/response 阶段按顺序执行', async () => {
    _fetch.mockResolvedValue(mockResponse({}));
    const order = [];
    addInterceptor((url, opts) => { order.push('req'); return opts; });
    addInterceptor('response', (url, data) => { order.push('res'); return data; });
    await fetchPage('/api/r4');
    expect(order).toEqual(['req', 'res']);
  });
});

describe('fetchPage 持久化缓存（localStorageAdapter）', () => {
  it('setCacheAdapter 切换后缓存命中跳过 fetch', async () => {
    setCacheAdapter(localStorageAdapter());
    _fetch.mockResolvedValue(mockResponse({ v: 1 }));
    await fetchPage('/api/p1', { cache: true, cacheTTL: 10000 });
    const data = await fetchPage('/api/p1', { cache: true, cacheTTL: 10000 });
    expect(data).toEqual({ v: 1 });
    expect(_fetch).toHaveBeenCalledOnce();
  });

  it('缓存持久化到 localStorage', async () => {
    setCacheAdapter(localStorageAdapter());
    _fetch.mockResolvedValue(mockResponse({ v: 1 }));
    await fetchPage('/api/p2', { cache: true, cacheTTL: 10000 });
    expect(localStorage.getItem('af-mobile-cache:/api/p2')).toContain('"v":1');
  });

  it('重建 adapter 后缓存仍在（模拟刷新）', async () => {
    setCacheAdapter(localStorageAdapter());
    _fetch.mockResolvedValue(mockResponse({ v: 1 }));
    await fetchPage('/api/p3', { cache: true, cacheTTL: 10000 });

    _fetch.mockClear();
    _fetch.mockResolvedValue(mockResponse({ v: 2 }));  // 若仍发请求会返回 v:2
    setCacheAdapter(localStorageAdapter());             // 重建后端 = 模拟页面刷新
    const data = await fetchPage('/api/p3', { cache: true, cacheTTL: 10000 });
    expect(data).toEqual({ v: 1 });                     // 命中持久化缓存
    expect(_fetch).not.toHaveBeenCalled();
  });

  it('过期条目读取时清理并从网络重取', async () => {
    const adapter = localStorageAdapter();
    // 预置过期条目
    localStorage.setItem('af-mobile-cache:/api/p4', JSON.stringify({ data: { v: 1 }, expiry: Date.now() - 1000 }));
    expect(adapter.get('/api/p4')).toBeUndefined();      // 过期读取返回 undefined
    expect(localStorage.getItem('af-mobile-cache:/api/p4')).toBeNull();  // 且已清理

    setCacheAdapter(adapter);
    _fetch.mockResolvedValue(mockResponse({ v: 2 }));
    const data = await fetchPage('/api/p4', { cache: true, cacheTTL: 1000 });
    expect(data).toEqual({ v: 2 });                      // 过期后从网络重取
  });

  it('Blob/Response 数据不可持久化（跳过，不影响请求）', async () => {
    setCacheAdapter(localStorageAdapter());
    _fetch.mockResolvedValue(new Response('x'.repeat(10), { status: 200, headers: { 'Content-Type': 'image/png' } }));
    const data = await fetchPage('/api/p5', { cache: true, responseType: 'blob', cacheTTL: 10000 });
    expect(data.size).toBe(10);                          // 跨 realm 用字段断言而非 instanceof
    expect(localStorage.getItem('af-mobile-cache:/api/p5')).toBeNull();
  });

  it('invalidateCache 删除持久化条目', async () => {
    setCacheAdapter(localStorageAdapter());
    _fetch.mockResolvedValue(mockResponse({ v: 1 }));
    await fetchPage('/api/p6', { cache: true, cacheTTL: 10000 });
    invalidateCache('/api/p6');
    expect(localStorage.getItem('af-mobile-cache:/api/p6')).toBeNull();
  });

  it('clearCache 清空全部持久化条目（不影响其他 key）', async () => {
    setCacheAdapter(localStorageAdapter());
    localStorage.setItem('unrelated', 'keep');
    _fetch.mockImplementation(() => Promise.resolve(mockResponse({})));
    await fetchPage('/api/p7', { cache: true, cacheTTL: 10000 });
    await fetchPage('/api/p8', { cache: true, cacheTTL: 10000 });
    clearCache();
    expect(localStorage.getItem('af-mobile-cache:/api/p7')).toBeNull();
    expect(localStorage.getItem('af-mobile-cache:/api/p8')).toBeNull();
    expect(localStorage.getItem('unrelated')).toBe('keep');  // 只清前缀内条目
  });

  it('自定义 prefix', async () => {
    setCacheAdapter(localStorageAdapter({ prefix: 'my-cache:' }));
    _fetch.mockResolvedValue(mockResponse({ v: 1 }));
    await fetchPage('/api/p9', { cache: true, cacheTTL: 10000 });
    expect(localStorage.getItem('my-cache:/api/p9')).toContain('"v":1');
  });
});

describe('registerBackend scheme 分发', () => {
  afterEach(() => unregisterBackend('test'));

  it('已注册 scheme 的 URL 全量转发给 adapter，不走原生 fetch', async () => {
    const adapter = vi.fn().mockResolvedValue({ data: [1], total: 5 });
    registerBackend('test', adapter);
    const res = await fetchPage('test://items?page=2');
    expect(adapter).toHaveBeenCalledOnce();
    expect(adapter.mock.calls[0][0]).toBe('test://items?page=2');
    expect(res).toEqual({ data: [1], total: 5 });
    expect(_fetch).not.toHaveBeenCalled();
  });

  it('scheme 匹配大小写不敏感', async () => {
    const adapter = vi.fn().mockResolvedValue({ data: [] });
    registerBackend('test', adapter);
    await fetchPage('TEST://items');
    expect(adapter).toHaveBeenCalledOnce();
  });

  it('未注册的 scheme（http/https/相对路径）行为零变化：走原生 fetch', async () => {
    _fetch.mockResolvedValueOnce(mockResponse({ ok: 1 }));
    const data = await fetchPage('/api/normal');
    expect(data).toEqual({ ok: 1 });
    _fetch.mockResolvedValueOnce(mockResponse({ ok: 1 }));
    const data2 = await fetchPage('https://example.com/x');
    expect(data2).toEqual({ ok: 1 });
  });

  it('request 拦截器在 adapter 分发前执行（同原生契约：返回 opts）', async () => {
    const adapter = vi.fn().mockResolvedValue({ data: [] });
    registerBackend('test', adapter);
    const fn = vi.fn((u, o) => ({ ...o, page: 9 }));
    addInterceptor('request', fn);
    await fetchPage('test://items?page=1');
    expect(adapter.mock.calls[0][1].page).toBe(9);
    removeInterceptor(fn);
  });

  it('unregisterBackend 后回落原生 fetch', async () => {
    const adapter = vi.fn().mockResolvedValue({ data: [] });
    registerBackend('test', adapter);
    unregisterBackend('test');
    _fetch.mockResolvedValue(mockResponse({ via: 'native' }));
    const data = await fetchPage('test://items');
    expect(data).toEqual({ via: 'native' });
    expect(adapter).not.toHaveBeenCalled();
  });

  it('registerBackend 参数校验', () => {
    expect(() => registerBackend('', vi.fn())).toThrow(TypeError);
    expect(() => registerBackend('test', 'not-fn')).toThrow(TypeError);
  });
});
