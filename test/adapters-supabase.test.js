// supabase adapter 单测：URL 翻译 / Range 分页 / total 解析 / 鉴权拦截 / 注销
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { supabaseAdapter, registerSupabase } from '../adapters/supabase.js';
import { fetchPage } from '@af-mobile/ui';
import { _resetInterceptors, unregisterBackend } from '../src/lib/fetch.js';

const _fetch = vi.fn();
beforeEach(() => {
  _fetch.mockReset();
  globalThis.fetch = _fetch;
  process.env.VITE_SUPABASE_URL = 'https://demo.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'anon-test-key';
});
afterEach(() => {
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.VITE_SUPABASE_ANON_KEY;
  _resetInterceptors();
  unregisterBackend('supabase');
});

function pgResponse(body, contentRange) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...(contentRange ? { 'Content-Range': contentRange } : {}),
    },
  });
}

describe('supabaseAdapter URL 翻译', () => {
  it('supabase://table?query → {base}/rest/v1/table?query', async () => {
    _fetch.mockResolvedValue(pgResponse([{ id: 1 }], '0-0/1'));
    const { data } = await supabaseAdapter('supabase://products?select=id,title&category=eq.shoes');
    expect(_fetch.mock.calls[0][0])
      .toBe('https://demo.supabase.co/rest/v1/products?select=id,title&category=eq.shoes');
    expect(data).toEqual([{ id: 1 }]);
  });

  it('无 query 的裸表名', async () => {
    _fetch.mockResolvedValue(pgResponse([], '0--1/0'));
    await supabaseAdapter('supabase://orders');
    expect(_fetch.mock.calls[0][0]).toBe('https://demo.supabase.co/rest/v1/orders');
  });

  it('base URL 尾斜杠被归一', async () => {
    process.env.VITE_SUPABASE_URL = 'https://demo.supabase.co/';
    _fetch.mockResolvedValue(pgResponse([], '0--1/0'));
    await supabaseAdapter('supabase://orders');
    expect(_fetch.mock.calls[0][0]).toBe('https://demo.supabase.co/rest/v1/orders');
  });
});

describe('supabaseAdapter 分页与 total', () => {
  it('page/pageSize → Range 头 0-19 / 20-39', async () => {
    _fetch.mockImplementation(() => pgResponse([], '0-19/523'));   // 每次新建 Response（body 一次性）
    await supabaseAdapter('supabase://products', { page: 1, pageSize: 20 });
    expect(_fetch.mock.calls[0][1].headers.Range).toBe('0-19');
    expect(_fetch.mock.calls[0][1].headers.Prefer).toBe('count=exact');

    await supabaseAdapter('supabase://products', { page: 2, pageSize: 20 });
    expect(_fetch.mock.calls[1][1].headers.Range).toBe('20-39');
  });

  it("Content-Range '20-39/523' → total 523", async () => {
    _fetch.mockResolvedValue(pgResponse([{ id: 21 }], '20-39/523'));
    const { total } = await supabaseAdapter('supabase://products', { page: 2, pageSize: 20 });
    expect(total).toBe(523);
  });

  it("Content-Range '*' → total undefined（loadmore 走 data 长度判停）", async () => {
    _fetch.mockResolvedValue(pgResponse([{ id: 1 }], '0-0/*'));
    const { total } = await supabaseAdapter('supabase://products');
    expect(total).toBeUndefined();
  });

  it('无 Content-Range 头 → total undefined', async () => {
    _fetch.mockResolvedValue(pgResponse([{ id: 1 }]));
    const { total } = await supabaseAdapter('supabase://products');
    expect(total).toBeUndefined();
  });
});

describe('registerSupabase 装配', () => {
  it('注册 scheme 后 fetchPage 直接吃 supabase:// URL', async () => {
    const dispose = registerSupabase();
    _fetch.mockResolvedValue(pgResponse([{ id: 1 }], '0-0/1'));
    const res = await fetchPage('supabase://products?select=id');
    expect(res).toEqual({ data: [{ id: 1 }], total: 1 });
    expect(_fetch.mock.calls[0][0]).toBe('https://demo.supabase.co/rest/v1/products?select=id');
    dispose();
  });

  it('鉴权拦截：rest/v1 请求注入 apikey + Bearer，其他 URL 不注入', async () => {
    const dispose = registerSupabase({ getToken: async () => 'user-token' });
    _fetch.mockResolvedValue(pgResponse([], '0--1/0'));
    await fetchPage('supabase://products');
    const headers = _fetch.mock.calls[0][1].headers;
    expect(headers.apikey).toBe('anon-test-key');
    expect(headers.Authorization).toBe('Bearer user-token');

    _fetch.mockResolvedValue(new Response('{}', { status: 200 }));
    await fetchPage('/api/local');
    expect(_fetch.mock.calls[1][1].headers.apikey).toBeUndefined();
    dispose();
  });

  it('缺少 anonKey 抛错（装配期快速失败）', () => {
    delete process.env.VITE_SUPABASE_ANON_KEY;
    expect(() => registerSupabase()).toThrow(/VITE_SUPABASE_ANON_KEY/);
  });

  it('缺少 SUPABASE_URL 时请求抛错', async () => {
    delete process.env.VITE_SUPABASE_URL;
    await expect(supabaseAdapter('supabase://x')).rejects.toThrow(/VITE_SUPABASE_URL/);
  });

  it('dispose 注销：scheme 回落原生 fetch，拦截器移除', async () => {
    const dispose = registerSupabase();
    dispose();
    _fetch.mockResolvedValue(pgResponse([{ id: 9 }]));
    const data = await fetchPage('supabase://products');
    expect(data).toEqual([{ id: 9 }]);              // 未走 adapter（返回值非 {data,total} 结构）
  });
});
