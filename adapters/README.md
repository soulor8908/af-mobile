# @af-mobile/adapters

为 AIFlow UI（`@af-mobile/ui`）提供数据源适配器。当前内置 **Supabase**（`supabase://` scheme）适配器：把 `supabase://table?select=...&filter=...` 翻译成 PostgREST 请求，复用 `@af-mobile/ui` 的 `fetchPage` 原生通道（分页 + total）。

## 安装

```bash
npm i @af-mobile/ui @af-mobile/adapters
```

> peer 依赖 `@af-mobile/ui`（≥1.4.0，需含 `registerBackend` / `fetchPage`）。

## 用法

```js
import { registerSupabase } from '@af-mobile/adapters';

// 注册 supabase scheme + 鉴权拦截器；返回注销函数
const unregister = registerSupabase({
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY, // 也可走环境变量
  getToken: async () => (await getSession())?.access_token, // 可选，用户态
});
```

之后即可用 `supabase://` 形式作为数据源：

```
supabase://products?select=id,title,price&category=eq.shoes&order=created_at.desc
```

- 自动变成 `GET {VITE_SUPABASE_URL}/rest/v1/products?...`
- 自动带 `Range: {from}-{to}` 分页头 + `Prefer: count=exact`（返回 `total`）

## 环境变量

| 变量 | 用途 |
|---|---|
| `VITE_SUPABASE_URL` | Supabase REST 根地址（必需） |
| `VITE_SUPABASE_ANON_KEY` | anon 公钥（`registerSupabase` 未传 `anonKey` 时读取） |

## API

| 导出 | 说明 |
|---|---|
| `registerSupabase({ anonKey?, getToken? })` | 注册 `supabase` backend + request 拦截器，返回注销函数 |
| `supabaseAdapter(url, opts)` | 底层适配器函数（`supabase://` → PostgREST 请求） |

> 当前专注于最常用的 Supabase。增量式扩展其他数据源时将陆续追加。