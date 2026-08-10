import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fetchPage, FetchError, TimeoutError, HttpError, AbortError } from '../src/lib/fetch.js';

// 全局 fetch mock
const _fetch = vi.fn();
beforeEach(() => {
  _fetch.mockReset();
  globalThis.fetch = _fetch;
  globalThis.Response = Response;
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
