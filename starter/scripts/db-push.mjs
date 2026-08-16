#!/usr/bin/env node
// db:push —— 读 supabase/schema.sql 经 psql 连接串执行（设计 §4.4，不引入 supabase CLI）
// 失败时输出「控制台 SQL Editor 粘贴执行」降级指引——三条命令路径不许被工具链问题打断
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const FALLBACK = [
  '降级路径（不许被工具链问题打断）：',
  '1. 打开 https://supabase.com/dashboard 进入你的项目',
  '2. 左侧 SQL Editor → New query',
  '3. 粘贴 starter/supabase/schema.sql 全文 → Run',
].join('\n');

// .env 未注入时最小读取（免 dotenv 依赖）
function env(name) {
  if (process.env[name]) return process.env[name];
  try {
    return readFileSync(new URL('../.env', import.meta.url), 'utf8')
      .match(new RegExp(`^${name}=(.+)$`, 'm'))?.[1]?.trim();
  } catch { return undefined; }
}

const dbUrl = env('SUPABASE_DB_URL');
if (!dbUrl) {
  console.error(`缺少 SUPABASE_DB_URL（.env.example 有说明）。\n${FALLBACK}`);
  process.exit(1);
}

const sql = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
const r = spawnSync('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1'], {
  input: sql, stdio: ['pipe', 'inherit', 'inherit'],
});
if (r.error) {
  console.error(`未找到 psql（${r.error.message}）。\n${FALLBACK}`);
  process.exit(1);
}
console.log(r.status === 0 ? 'db:push 完成：products 表 + RLS 已就绪' : 'db:push 失败，检查上方 psql 输出');
process.exit(r.status ?? 1);
