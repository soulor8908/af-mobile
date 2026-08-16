// @af-mobile/adapters —— supabase:// scheme 适配器
// 将 supabase://table?select=...&filter=... 翻译为 PostgREST 请求（纯 URL 拼接，走 fetchPage 原生通道）
// 设计文档：docs/design/starter-landing-design.md §3
import {
  fetchPage, addInterceptor, removeInterceptor,
  registerBackend, unregisterBackend,
} from '@af-mobile/ui';

let _interceptorFn = null;

/**
 * supabase adapter：supabase://products?select=id,title&category=eq.shoes&order=created_at.desc
 * → GET {SUPABASE_URL}/rest/v1/products?select=...&category=eq.shoes
 *    Range: {from}-{to}（分页）+ Prefer: count=exact（total）
 * @param {string} url supabase:// 形式的资源地址
 * @param {object} opts fetchPage 选项（page/pageSize/signal 透传）
 * @returns {Promise<{data: Array, total: number|undefined}>}
 */
export async function supabaseAdapter(url, opts = {}) {
  const base = _getBaseUrl();
  const rest = url.slice('supabase://'.length);                     // 'products?select=...'
  const qIdx = rest.indexOf('?');
  const table = qIdx === -1 ? rest : rest.slice(0, qIdx);
  const query = qIdx === -1 ? '' : rest.slice(qIdx + 1);
  const api = `${base}/rest/v1/${table}${query ? '?' + query : ''}`;

  const { page = 1, pageSize = 20, headers = {}, signal } = opts;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const res = await fetchPage(api, {
    ...opts,
    headers: { Prefer: 'count=exact', ...headers, Range: `${from}-${to}` },
    responseType: 'response',
    dedupe: false,   // 内层 Response 由本 adapter 消费 body，跨调用共享会导致 body 已读
    cache: false,
    signal,
  });

  // responseType:'response' 返回原始 Response：解析 JSON body + Content-Range total
  const data = await res.json();
  return { data, total: _parseTotal(res.headers.get('content-range')) };
}

// Content-Range: '0-19/523' → 523；'0-19/*' → undefined
function _parseTotal(range) {
  if (!range) return undefined;
  const total = range.split('/')[1];
  return total && total !== '*' ? Number(total) : undefined;
}

function _env(name) {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name]) {
    return import.meta.env[name];
  }
  if (typeof process !== 'undefined' && process.env && process.env[name]) return process.env[name];
  return '';
}

function _getBaseUrl() {
  const url = _env('VITE_SUPABASE_URL');
  if (!url) throw new Error('supabase adapter: 缺少 VITE_SUPABASE_URL 环境变量（.env 或构建环境注入）');
  return url.replace(/\/$/, '');
}

/**
 * 注册 supabase scheme + 鉴权拦截器（apikey + Bearer token）
 * @param {{anonKey?: string, getToken?: () => Promise<string|undefined>}} options
 *   anonKey 默认读 VITE_SUPABASE_ANON_KEY；getToken 返回用户会话 token（可选）
 * @returns {() => void} 注销函数（测试 / HMR 用）
 */
export function registerSupabase(options = {}) {
  const { anonKey, getToken } = options;
  const key = anonKey || _env('VITE_SUPABASE_ANON_KEY');
  if (!key) throw new Error('supabase adapter: 缺少 VITE_SUPABASE_ANON_KEY');

  // 仅拦截发往 Supabase REST 的请求（scheme URL 已翻译为 https，路径匹配才注入）
  // 契约与原生路径一致：(url, opts) => opts
  _interceptorFn = async (u, o) => {
    if (!/\/rest\/v1\//.test(u)) return o;
    const token = getToken ? await getToken() : undefined;
    const headers = { apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(o && o.headers) };
    return { ...o, headers };
  };
  addInterceptor('request', _interceptorFn);
  registerBackend('supabase', supabaseAdapter);

  return () => {
    if (_interceptorFn) removeInterceptor(_interceptorFn);
    _interceptorFn = null;
    unregisterBackend('supabase');
  };
}
