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
