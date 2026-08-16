// 后端装配点 —— 用户唯一需要理解的后端文件（设计 §4.3）
// supabase:// URL 由 @af-mobile/adapters 翻译为 PostgREST；鉴权经拦截器注入
import { createClient } from '@supabase/supabase-js';
import { registerSupabase } from '@af-mobile/adapters/supabase';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anonKey);

// 注册 supabase:// scheme + 鉴权拦截（Bearer token 从会话自动取）
registerSupabase({
  anonKey,
  getToken: async () => (await supabase.auth.getSession()).data.session?.access_token,
});
