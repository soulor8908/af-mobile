# 生产级平台设计（后台服务 / CI/CD / 发布部署）

> 适用范围：**上层业务产品**（用 aiflow-ui 做出来的应用）跑在 Cloudflare 全栈边缘。
> 库仓库（本仓库）本身的发布流水线已由 D-007 覆盖（release.yml 已落地），本文只在 §9 讨论衔接。
> 决策前提（已确认）：目标 = 上层业务产品；形态 = Cloudflare Workers + D1；部署 = Cloudflare。
> **已登记**：[D-007](../DECISIONS.md)（平台化基建 / 混仓承载）、[D-008](../DECISIONS.md)（业务产品 CF 全栈 + starter 双 target）。
> **作用域提醒**：本文对 `starter/` 的改造要求（§3.3）**只作用于业务仓的脚手架产物**，不改变库仓 `starter/` 默认的 Supabase 形态 —— 双 target 方案见 D-008 与 `consumer-delivery-design.md`。

---

## 0. 结论先行

当前仓库**不缺 CI**——它缺的是「产品的交付链路」。两者是不同物种：

| | 库的质量闸门（已有） | 产品的交付链路（要建） |
|---|---|---|
| 关注点 | 这个库本身对不对 | 这个产品能不能上线、能不能回滚 |
| 典型检查 | 白名单同步 / 体积 / 组件 API 漂移 | 迁移安全 / 环境隔离 / 部署后冒烟 / 密钥不泄漏 |
| 失败代价 | 产出脏代码 | 用户不可用、数据丢失、账单爆炸 |

三句话概括方案：

1. **一个部署单元**：Workers 单应用同时托管 API 与静态资产（`assets` 字段），不搞 Pages + Workers 双单元——消灭跨源、消灭两套 CI、preview 天然同源。
2. **后端只做三件不能放前端的事**：保管密钥（LLM / 第三方）、执行敏感 tool、记账与限流。其余一律不造轮子。
3. **CI/CD 分三条流水线**：`ci.yml`（闸门）、`preview.yml`（每 PR 一套隔离环境）、`release.yml`（迁移 → 部署 → 冒烟 → 失败回滚）。

最大的生产风险不是代码，是 **D1 迁移不可逆**。§4.5 的 expand/contract 纪律是本文最不该跳过的部分。

---

## 1. 现状盘点

### 1.1 已有的（别重复造）

| 资产 | 位置 | 生产价值 |
|---|---|---|
| 17 道质量闸门 | `.github/workflows/ci.yml` | 消费端工程可直接照搬其哲学 |
| Pages 自动部署 | `.github/workflows/docs.yml` | release 流水线的前端部分可复用 |
| Changesets | `.changeset/` + `npm run release` | 多包版本协同已有 |
| chat 子库（OpenAI 兼容 SSE + tool loop） | `src/chat/` | 后端只需实现 `/chat/completions` 兼容端点 |
| MCP `check_compliance` / 飞轮 | `mcp/`、`eval/` | 可升级为 CI 内的「AI 产出合规闸门」 |
| 组件级 i18n / ARIA 约束 | `src/chat/i18n.js`、`check-aria-sync` | 无障碍不必从头补 |

### 1.2 缺的（本文要解决的）

| 缺口 | 现状 | 风险 |
|---|---|---|
| 服务端 | 零后端；`starter/src/backend.js` 让浏览器直连 Supabase | anon key 暴露在前端；无服务端校验；无定时任务 |
| LLM 密钥 | 前端持有 | **任何人可扒 key，账单直接爆** |
| 敏感 tool 执行 | chat 的 `tool.execute` 跑在浏览器 | 前端可伪造任意数据写入 |
| 自动发版 | `npm run pub:*` 手工跑 | 无 Release 记录，无审计 |
| Preview 环境 | 无 | PR 只能本地验，评审靠脑补 |
| 部署后冒烟 / 回滚 | 无 | 坏版本上线后靠用户发现 |
| 可观测 | 无 | 线上报错全靠用户截图 |
| 密钥与配置分级 | 无 `.env.*`、无 secret 扫描 | 迟早有一次把 key 提交进 git |
| 数据迁移纪律 | 无 | 破坏性迁移 = 不可逆数据事故 |
| AI 成本护栏 | 无 | 一个循环调用烧掉一个月预算 |

---

## 2. 目标架构

```
                    ┌─────────────── Cloudflare 边缘 ───────────────┐
   浏览器 / WebView │                                              │
   ┌────────────┐   │  ┌───────────────────────────────────────┐   │
   │ aiflow-ui  │───┼─▶│  Workers 单应用（Hono）                 │   │
   │ Web Comp.  │   │  │  /api/*   → API 路由                    │   │
   │ + chat 子库│◀──┼──│  /*       → 静态资产（dist/）           │   │
   └────────────┘   │  └───┬─────────┬─────────┬─────────┬─────┘   │
        SSE 流式    │      │         │         │         │          │
                    │   ┌──▼──┐  ┌───▼───┐ ┌───▼───┐ ┌───▼───┐     │
                    │   │ D1  │  │  KV   │ │ R2    │ │ Queue │     │
                    │   │业务 │  │会话/  │ │文件/  │ │异步   │     │
                    │   │数据 │  │限流   │ │备份   │ │任务   │     │
                    │   └─────┘  └───────┘ └───────┘ └───────┘     │
                    └──────────────────┬───────────────────────────┘
                                       │ 服务端持有密钥
                                  ┌────▼─────┐
                                  │  LLM 上游 │  OpenAI / DeepSeek / 通义
                                  └──────────┘
```

**核心判断：单部署单元，不用 Pages + Workers 双单元。**

Cloudflare 已把静态资产并入 Workers（`wrangler.toml` 的 `assets`），新项目不应再建 Pages 项目。收益：

- API 与前端**同源** → 没有 CORS、没有 cookie 跨站问题、少配一套环境变量
- preview 一次 `wrangler deploy` 出一套完整环境（API + 前端 + DB 都是 preview 版）
- 回滚是一个版本号，不存在「前端回滚了、API 没回滚」的错位

代价：静态资产也走 Workers 请求计费。对中小流量可忽略（免费额度 10 万请求/天）。

---

## 3. 工程结构

### 3.1 仓归属（已决：混仓）

> **已决（D-007 / D-008）：业务产品塞进本仓库，不独立建仓。**
> 以下「独立建仓 `aiflow-app`」的论述**已失效**，仅作为备选论据保留供复盘，**不得据此实施**。目录命名与落点（如 `apps/web` + `apps/api`）在实施时定，须与库仓既有的 `.github/workflows/` 等合并。回链：[D-007](../DECISIONS.md)、[D-008](../DECISIONS.md)。

（原论述，保留供追溯）**推荐业务产品单独建仓 `aiflow-app`**，用 `npm i @af-mobile/ui` 消费。理由：

1. 库是**源码分发**（`main → src/index.js`），混仓会让「改库试试」变成「发个版」，丧失 dogfooding 价值
2. 库 CI 已 17 道闸门 + Playwright，叠加业务 CI 会让每次 push 慢到没人愿意等
3. 分仓能顺带验证「这库作为 npm 包真的可用」——这是库作者最需要的真实反馈

代价：跨仓改动要两步提交。用 `npm link` 或 `file:` 依赖过渡期开发。

### 3.2 目录

> **混仓视图（D-007 / D-008）**：下面这棵树是**业务产品在库仓内的子目录视图**，根前缀 `aiflow-app/` 读作库仓下的业务目录（实施时定名）。
> 其中 `.github/workflows/{ci,preview,release}.yml` 与库仓既有的 `ci.yml` / `docs.yml` / `release.yml` / `preview.yml`（平台基建）**重名** —— 混仓下必须改名区分，下文 §6 与 §8 提到这三个文件时均指**业务侧**那份，建议命名 `business-ci.yml` / `business-preview.yml` / `business-release.yml`。`migrations/` 同理（库仓 `server/migrations/` 已占位，见 `platform-backend-design.md` §3.5）。

```
aiflow-app/
├─ apps/
│  ├─ web/                      # 前端（脚手架生成的业务文件区）
│  │   ├─ src/pages/*.js        # AI 可覆盖
│  │   ├─ src/main.js
│  │   ├─ src/styles.css
│  │   ├─ src/store.js
│  │   └─ src/backend.js        # 改写：不再直连 Supabase，改为同源 /api 客户端
│  └─ api/
│      ├─ src/index.ts          # Hono 装配
│      ├─ src/routes/{auth,chat,tool,billing,health}.ts
│      ├─ src/middleware/{auth,rate-limit,logger,error}.ts
│      ├─ src/tools/registry.ts # 服务端 tool 注册表（唯一可信执行点）
│      └─ src/db/{schema.ts,client.ts}
├─ packages/contract/           # API 契约：zod schema → 前端 TS 类型（单一真相源）
├─ migrations/                  # D1 迁移（append-only，禁止改写历史）
├─ .github/workflows/{ci,preview,release}.yml
├─ wrangler.toml
└─ .dev.vars.example            # 本地密钥模板；.dev.vars 进 .gitignore
```

### 3.3 脚手架改造清单（Supabase + Vercel → Cloudflare）

> **作用域（D-008）**：下表是**业务仓**脚手架产物的改造清单。库仓 `starter/` 维持 Supabase 默认，改造动作转为 `create-app.mjs --target cloudflare` 变体（产出即下表结果），两条路并存。因此下表的「删除」在库仓语境下应读作「该 target 不生成」，不是从库中删文件。

现有 `starter/` 不能直接用于 Cloudflare，需改四处：

| 文件 | 现状 | 改为 |
|---|---|---|
| `src/backend.js` | supabase-js + `registerSupabase` | 删除；改为同源 `fetch('/api/...')` 薄客户端 |
| `scripts/db-push.mjs` | psql 直连 | 删除；改 `wrangler d1 migrations apply` |
| `supabase/schema.sql` | Postgres + RLS | 改写为 SQLite/D1 schema；**RLS 由后端中间件替代**（见 §4.3 警示） |
| `vercel.json` | Vercel rewrite | 删除；改 `wrangler.toml` 的 `not_found_handling = "single-page-application"` |

`@af-mobile/adapters` 在本产品内不再使用（它是 Supabase/PostgREST 专用）。处置见 §9.2。

### 3.4 本地开发

```bash
# 终端 A：API（miniflare 模拟 D1/KV，连本地 SQLite）
wrangler dev --env dev          # :8787

# 终端 B：前端，/api 反代到 wrangler
vite                            # :5173
```

```js
// apps/web/vite.config.js
server: { proxy: { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: false } } }
```

> 用 `wrangler dev` 而不是 `next dev` 式的集成：本地跑的就是生产运行时（workerd），避免「本地能跑线上挂」。

---

## 4. 后端设计

### 4.1 选型与边界

| 组件 | 选择 | 为什么 / 边界 |
|---|---|---|
| 运行时 | Cloudflare Workers | SSE 流式原生支持、无冷启动、按请求计费 |
| 框架 | Hono | 5KB、边缘优先、类型化路由与中间件 |
| 数据库 | D1（SQLite） | **适用**：读多写少、单区域、< 千万行。**不适用**：多区域强一致写入、复杂 JOIN 分析、> 10GB。越界时迁移路径：D1 → Turso/Postgres，Drizzle 层可复用 |
| ORM | Drizzle | 生成 SQL 迁移、类型安全、D1 官方示例 |
| 会话 | KV | 全局读快；最终一致（~60s 传播）→ **登出/改密不能只依赖 KV 失效** |
| 异步 | Queues | 邮件、账单结算、AI 批处理 |
| 校验 | zod（在 `packages/contract`） | 前后端共享同一份 schema |

### 4.2 路由骨架

```ts
// apps/api/src/index.ts
import { Hono } from 'hono';
import { logger } from './middleware/logger.js';
import { auth } from './middleware/auth.js';
import { rateLimit } from './middleware/rate-limit.js';
import chat from './routes/chat.js';
import tool from './routes/tool.js';

const app = new Hono<{ Bindings: Env; Variables: { userId: string; reqId: string } }>();

app.use('*', logger);                      // reqId 贯穿全流程
app.get('/api/health', (c) => c.json({ ok: true, rev: c.env.GIT_SHA }));

app.use('/api/*', auth);                   // 除 health/public 外全鉴权
app.use('/api/chat', rateLimit({ per: 'minute', max: 20 }));
app.use('/api/tool/*', rateLimit({ per: 'minute', max: 120 }));

app.post('/api/chat', chat);
app.post('/api/tool/:name', tool);

app.onError((err, c) => {                  // 统一错误形状，绝不泄漏堆栈
  c.env.LOGS?.write(JSON.stringify({ reqId: c.get('reqId'), err: String(err) }));
  return c.json({ error: 'internal_error', reqId: c.get('reqId') }, 500);
});

export default app;
```

### 4.3 鉴权：cookie session，不用前端 JWT

移动端 H5 + WebView 场景下，**HttpOnly cookie 比 Bearer token 安全**：token 存 localStorage 等价于对 XSS 敞开。

```ts
// 登录成功
const sid = crypto.randomUUID();
await c.env.SESSIONS.put(`s:${sid}`, JSON.stringify({ userId, exp }), { expirationTtl: 60 * 60 * 24 * 30 });
setCookie(c, 'sid', sid, {
  httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 60 * 60 * 24 * 30,
});
```

三条硬约束：

1. **敏感操作（改密、支付、删数据）二次校验**——只有 cookie 不够防 CSRF 与会话劫持
2. **KV 最终一致**：封禁/登出必须在 D1 存一份 `session_revoked` 表做即时校验，KV 只做快路径
3. **Supabase RLS 的替代**：D1 没有行级安全，数据隔离必须靠**每个查询显式带 `userId` 过滤**。建议 Drizzle 层封装 `scopedQuery(userId)`，禁止裸 `db.select().from(table)`。这是从 RLS 迁移过来最容易被忽略的致命点。

### 4.4 `/api/chat`：生产级流式代理

这是后端存在的第一理由：**LLM key 绝不能进浏览器**。

chat 子库发来的请求（`src/chat/session.js:80`）：

```jsonc
POST /api/chat
{ "messages": [...], "stream": true,
  "tools": [{ "type": "function", "function": { "name", "description", "parameters" } }] }
```

期望 OpenAI 标准 SSE（`data: {"choices":[{"delta":{...}}]}` + `data: [DONE]`）。实现要点：

```ts
// apps/api/src/routes/chat.ts
export default async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  // 1) 成本护栏：服务端强制上限，前端传什么都不作数
  await assertQuota(c.env, userId);                  // 日/月预算熔断

  // 2) 白名单参数：不接受前端传 model / max_tokens / system
  const payload = {
    model: c.env.LLM_MODEL,
    messages: body.messages,
    tools: intersectTools(body.tools, TOOL_REGISTRY), // 只透传服务端注册过的 tool
    stream: true,
    stream_options: { include_usage: true },          // 让上游回传 token 用量
    max_tokens: 2048,
  };

  const upstream = await fetch(`${c.env.LLM_BASE}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.env.LLM_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: c.req.raw.signal,                        // 客户端 abort → 上游也断，省钱
  });
  if (!upstream.ok) return c.json({ error: 'upstream_error' }, 502);

  // 3) 边转发边计量（TransformStream），响应结束后落库
  let usage: unknown = null;
  const { readable, writable } = new TransformStream({
    transform(chunk, ctrl) {
      const text = new TextDecoder().decode(chunk);
      const u = parseUsageFromSSE(text);             // 抓 stream_options 的 usage 帧
      if (u) usage = u;
      ctrl.enqueue(chunk);
    },
  });
  c.executionCtx.waitUntil(upstream.body!.pipeTo(writable).finally(() => recordUsage(c.env, userId, usage)));

  // 4) 透传，禁止缓冲
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
      'Content-Encoding': 'none',
    },
  });
};
```

**四个必踩的坑**：

| 坑 | 症状 | 解法 |
|---|---|---|
| 缓冲 | 前端等几十秒后一次性吐出 | 上表 4 个 header 缺一不可；且**不要** `await res.text()` |
| 客户端 abort 不断上游 | 用户停止了，钱还在烧 | `signal: c.req.raw.signal` |
| 流式拿不到 token 数 | 无法计费 | `stream_options: { include_usage: true }` + TransformStream 抓尾帧 |
| 前端伪造 tool | 任意数据写入 | 见 §4.5 |

### 4.5 服务端 tool：声明在前端，执行在后端

chat 子库的 `tool.execute` 跑在浏览器（`src/chat/session.js:42`）。改造原则：**不改动库**，前端 tool 定义保留，但 `execute` 只做一次可信转发。

```js
// apps/web/src/tools.js —— 前端：只是声明 + 转发
export const serverTool = (name, description, parameters) =>
  defineTool({
    name, description, parameters,
    async execute(args) {
      const r = await fetch(`/api/tool/${name}`, {
        method: 'POST',
        credentials: 'include',                       // 带上 session cookie
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });
      return r.ok ? r.json() : { error: `${name} 调用失败` };
    },
  });
```

```ts
// apps/api/src/routes/tool.ts —— 后端：唯一可信执行点
app.post('/api/tool/:name', async (c) => {
  const t = TOOL_REGISTRY[c.req.param('name')];
  if (!t) return c.json({ error: 'unknown_tool' }, 404);
  if (t.scope === 'admin' && !isAdmin(c)) return c.json({ error: 'forbidden' }, 403);

  const args = t.schema.safeParse(await c.req.json());   // zod 校验，前端传什么都不信
  if (!args.success) return c.json({ error: 'bad_args' }, 400);

  const out = await t.run(c, args.data);                 // 内部强制 userId 作用域
  c.executionCtx.waitUntil(auditLog(c, t.name, args.data));
  return c.json(out);
});
```

前端伪造调用只会拿到 403/404；权限、参数校验、作用域、审计全在服务端。

### 4.6 API 契约铁律：后端绝不返回样式

aiflow-ui 的 L2 是**228 个 class 的封闭集**，由 ESLint 强制。因此：

- ✅ 后端返回**语义**：`{ status: 'overdue', priority: 'high' }`
- ❌ 后端返回**表现**：`{ className: 'text-danger', color: '#f00', style: {...} }`

后端返回 className 等于绕过白名单闸门，且让后端成为视觉真相源。契约里明确写死：

```ts
// packages/contract/todo.ts
export const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['open', 'done', 'overdue']),   // 语义；前端映射 tag-ok / tag-warn
  amount: z.number().int(),                       // 分为单位，不做浮点
});
```

金额一律**整数分**传输，前端再格式化——避免浮点误差与 i18n 混乱。

---

## 5. 前端部署与 SSR 取舍

**明确判断：不要为了 SSR 而上 SSR。**

这个库的 SSR 是「重建式」而非增量 hydrate（README §SSR：组件 `mounted()` 用 `innerHTML` 重建内部结构，SSR 子节点会被覆盖）。所以边缘 SSR 的真实收益只有「首屏不白屏」和 SEO，代价是服务端渲染开销、upgrade 闪烁、以及要在 workerd 里处理 `customElements` 不存在的问题。

推荐策略：

| 页面类型 | 策略 |
|---|---|
| 营销/落地页、文档 | **构建期预渲染成静态 HTML**（或用 `af-skeleton-page` 占位），不上运行时 SSR |
| 登录后应用内页 | **CSR + 骨架屏**，配合边缘缓存与 `<head>` 内联主题脚本（消除暗色 FOUC） |
| 需要 SEO 的详情页 | 如果搜索引擎真的重要，才对这几个路由做 DSD 预渲染（`dsdTemplate()`） |

```toml
# wrangler.toml
[assets]
directory = "apps/web/dist"
not_found_handling = "single-page-application"   # History 路由 fallback
run_worker_first = ["/api/*"]
```

> 注意 README 的警告：产物根目录**不要放 `404.html`**，否则 SPA 兜底失效。

缓存策略：
- `/assets/*`（带 hash）→ `Cache-Control: public, max-age=31536000, immutable`
- `/index.html` → `no-cache`（否则发版后用户拿旧 HTML 引用已删除的 JS，白屏）

---

## 6. CI/CD：三条流水线

### 6.1 `ci.yml`（PR 闸门）

现有 `ci.yml` 是**单 job 串行 17 步**，业务产品不要复制这个形态——改成并行 job：

```yaml
jobs:
  static:   # ~1-2 min
    - install（npm ci，缓存）
    - eslint（af-mobile 规则 + 项目规则）
    - tsc --noEmit
    - contract:check（zod schema ↔ 前端类型同步）
    - migration:check（迁移文件序号不重复、append-only）
    - secret:scan（gitleaks，防 key 进仓）
  unit:     # vitest + 覆盖率阈值
  e2e:      # Playwright（最慢，独立 job）
  build:    # vite build + 产物体积预算
  gate:     # needs 以上全部，供 branch protection 单一勾选项
```

新增三个闸门是产品与库的关键差异：

| 闸门 | 防什么 |
|---|---|
| `contract:check` | 后端改了字段，前端类型没跟 → 线上 undefined |
| `migration:check` | 两人同时生成 `0005_*.sql` → 生产迁移顺序错乱 |
| `secret:scan` | LLM key 提交进 git（**一旦推送就必须轮换，不是删掉就行**） |

### 6.2 `preview.yml`（每 PR 一套隔离环境）

```yaml
on: pull_request
concurrency:
  group: preview-${{ github.event.pull_request.number }}
  cancel-in-progress: true
steps:
  - npm ci && npm run build
  - wrangler d1 migrations apply aiflow-preview --remote   # preview 专用库
  - wrangler deploy --env preview                          # 出 https://pr-123.aiflow.workers.dev
  - 评论回贴 preview URL（actions/github-script）
```

**铁律：preview 环境绝不连生产库。** 用 `wrangler.toml` 的 `[env.preview]` 绑定独立的 D1 / KV：

```toml
[env.preview]
name = "aiflow-preview"
vars = { ENVIRONMENT = "preview" }
[[env.preview.d1_databases]]
binding = "DB"
database_name = "aiflow-preview"
database_id = "<preview-db-id>"
migrations_dir = "migrations"
```

同理 LLM 用独立的低配额 key，避免 preview 烧掉生产预算。

### 6.3 `release.yml`（生产发布）

```yaml
on:
  push: { branches: [main] }
  workflow_dispatch:
concurrency: { group: release, cancel-in-progress: false }   # 绝不取消进行中的发布
jobs:
  release:
    environment: production      # GitHub Environment，配 required reviewers
    steps:
      - npm ci && npm run build

      # 1) 先迁移，后部署（旧代码必须能跑在新 schema 上）
      - wrangler d1 migrations apply aiflow-prod --remote

      # 2) 部署（打上 Git SHA 便于溯源）
      - wrangler deploy --var GIT_SHA:${{ github.sha }}
      - id=$(wrangler deployments list --json | jq -r '.[0].id')   # 记住回滚点

      # 3) 部署后冒烟
      - curl -fsS https://api.example.com/api/health
      - curl -fsS https://example.com/ | grep -q '<div id="app"'

      # 4) 失败自动回滚
      - if: failure()
        run: wrangler rollback "$PREVIOUS_DEPLOYMENT_ID"

      - changeset publish / 创建 GitHub Release
```

顺序要点：

- **先迁移后部署**：新代码可能依赖新列。反过来（先部署后迁移）会让新代码读到不存在的列
- **`cancel-in-progress: false`**：发布进行中取消 = 半吊子状态
- **`environment: production`**：配 required reviewers，避免任何人都能按发布

### 6.4 环境矩阵

| | dev（本地） | preview（每 PR） | production |
|---|---|---|---|
| D1 | 本地 SQLite | `aiflow-preview` | `aiflow-prod` |
| KV | miniflare | 独立 namespace | 独立 namespace |
| LLM key | 开发者自备 | 低配额 key | 生产 key + 硬预算 |
| 数据 | 种子数据 | 种子数据（可脏） | 真实数据（**禁止反向同步**） |
| 访问 | 本地 | `pr-N.*.workers.dev`（可加 Access 保护） | 自定义域 |

---

## 7. 可观测与成本护栏

| 层 | 方案 | 说明 |
|---|---|---|
| 日志 | 结构化 JSON → Logpush → R2 | 每个请求带 `reqId`，前后端串联 |
| 错误 | Sentry（`@sentry/cloudflare`） | 过滤掉含 key 的 header |
| 指标 | Workers Analytics + 自定义 Analytics Engine | 关键：P95 延迟、错误率、SSE 中断率 |
| 告警 | 错误率 / 延迟阈值 → 邮件或 Webhook | **没有告警的监控等于没有监控** |
| 健康检查 | `/api/health`（不鉴权，返回 rev） | 供冒烟与外部探活 |
| 审计 | `audit_log` 表记录 tool 调用 | AI 产品出问题时唯一的溯源依据 |

AI 成本护栏（P1 必做，AI 产品的特有风险）：

1. 每次请求服务端强制 `max_tokens` 上限
2. 每用户日/月配额，超限返回 429 而非继续烧
3. 全局日预算熔断（Durable Object 计数），触发即停服 AI 功能并告警
4. tool 循环轮数上限（chat 默认 6 轮）——防模型死循环

---

## 8. 分期路线

### P0 — 能上线（约 1~2 周）

- [ ] 在**库仓内**建业务目录（混仓，D-007/D-008），消费 `create-app.mjs --target cloudflare` 产物（§3.3 四处）
- [ ] Hono 骨架 + `/api/health` + 统一错误处理
- [ ] D1 schema + Drizzle 迁移
- [ ] session 鉴权（cookie + KV）
- [ ] `/api/chat` 流式代理 + 服务端持有 key
- [ ] `/api/tool/:name` 服务端执行 + zod 校验
- [ ] `ci.yml`（并行 job）+ `release.yml`（迁移→部署→冒烟→回滚）
- [ ] Pages/Workers 上线，自定义域 + HTTPS

**验收**：任意人拿到前端 bundle 也拿不到 LLM key；发布失败能自动回滚到上一版。

### P1 — 能放心上线

- [ ] `preview.yml` + 环境隔离（preview 绝不碰生产库）
- [ ] secret 扫描 + `.env` 分级 + `.dev.vars` 进 gitignore
- [ ] Sentry + 结构化日志 + 告警规则
- [ ] 迁移 expand/contract 纪律落地（下方 §4.5 补充）
- [ ] AI 成本护栏（配额 / 预算熔断 / 轮数上限）
- [ ] 回滚演练：**真的回滚一次并计时**

**验收**：删库演练——从备份恢复到可用 < 30 分钟；破坏性迁移拆成两次发布成功过一次。

### P2 — 能规模化

- [ ] D1 读写分离 / 迁出评估（触及 §4.1 边界时）
- [ ] 缓存层（KV 缓存热点读、Cache API 缓存边缘响应）
- [ ] 渐进发布（Workers Gradual Deployments 灰度流量）
- [ ] 多区域 / 数据驻留（合规需求）
- [ ] eval 题集升级为生产回归集（复用 `eval/prompts.jsonl` + 线上真实 query 抽样）

---

## 9. 与现有资产的衔接

### 9.1 chat 子库：零改动

后端只需实现 OpenAI 兼容端点。`requestFn` 留了注入鉴权头的口子，但用 cookie 时甚至不用它。

### 9.2 adapters 处置（需登记决策）

`@af-mobile/adapters`（Supabase/PostgREST）在本产品内不再使用。三个选项：

| 选项 | 说明 |
|---|---|
| **A. 保留在库仓，业务仓不用**（推荐） | 库是通用资产，没必要为一次选型删掉；业务产品自己写 `$api` 客户端 |
| B. 新增 `@af-mobile/adapters/d1` | 若第二个产品也用 D1，抽象才划算；现在只有一处，**过早抽象** |
| C. 删除 | 需先确认无外部消费者（README 显示已发布过） |

倾向 A。**按 AGENTS.md §5，最终决定需登记 `docs/DECISIONS.md`**（含放弃了什么）。

### 9.3 库仓本身的小补（可选）

- 给 `starter/` 加一个 `--target cloudflare` 变体 —— **已由 D-008 决策**（不再是"可选"），与 `consumer-delivery-design.md` 协同实施，业务仓直接消费该变体产物
- ~~`release.yml` 自动跑 `changeset publish`~~ —— **已落地**（D-007 P0）：`.github/workflows/release.yml` 已含 Version Packages PR → `changeset publish --provenance` → registry smoke 轮询。本条作废
- MCP `check_compliance` 进业务仓 CI，让 AI 写的业务代码也过白名单闸门

---

## 10. 最容易翻车的五件事

1. **D1 迁移不可逆** → 一切破坏性变更必须 expand/contract（加列 → 双写 → 切读 → 下个版本删列）。Workers 能秒回滚，数据库不能。
2. **丢了 Supabase RLS** → D1 没有行级安全，每个查询必须显式带 `userId`，建议 Drizzle 封装 `scopedQuery`。漏一处就是越权读全表。
3. **LLM key 进前端**（或进 git）→ 前者任何人可盗用，后者推送后必须轮换。
4. **SSE 被缓冲** → 四个 header 缺一不可，且不能 `await res.text()`。
5. **preview 连了生产库** → 一次 `wrangler deploy` 配错 env 就是生产数据事故。

---

## 11. 待确认的设计分叉

| # | 分叉 | 备选 | 影响 | 状态 |
|---|---|---|---|---|
| 1 | 业务仓独立 vs 塞进库仓 | ~~独立（推荐）~~ / **混仓 monorepo** | 迭代速度、dogfooding 价值 | ✅ **已决：混仓**（D-007 / D-008）。本节备选论据作废，见 §3.1 |
| 2 | 鉴权自建 vs Cloudflare Access / Auth0 | 自建 cookie session（推荐） | 工期、合规 | 未决 |
| 3 | D1 vs 直接上 Postgres（Turso/Neon） | D1（推荐，除非超 §4.1 边界） | 迁移成本、扩展性 | 未决 |
| 4 | tool loop 留前端 vs 整体上移后端 | 留前端 + 服务端执行（推荐） | chat 子库改动量 | 未决 |
