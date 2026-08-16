# AIFlow Starter 落地方案详细设计 —— 三段式落地链与契约面

> 版本：v1（2026-08-16）
> 状态：待评审
> 关联：[l3-detailed-design.md](./l3-detailed-design.md)（组件层）、[l4-detailed-design.md](./l4-detailed-design.md)（约束层）、[flywheel-v2-design.md](./flywheel-v2-design.md)（反馈闭环）

---

## 0. 问题与范围

### 0.1 用户的问题

目标用户（用 AI 生成移动端应用的开发者）不区分前端后台，只有一个诉求：**应用怎么落地**。当前 AI 生成链路的现状是「demo 能看，落地翻车」——生成 token 烧一遍，修复 token 烧 5-10 遍，项目仍未必上线。

### 0.2 落地链翻车率分析（本设计的依据）

落地是一条链：`UI 前端 + 后端服务 + 鉴权 + 部署`。各段被 AI 搞砸的概率截然不同：

| 环节 | AI 翻车率 | 原因 | 生态现状 |
|---|---|---|---|
| 后端 CRUD | 低 | schema 是天然约束 | Supabase/Firebase 已把后端变成声明式配置 |
| 部署 | 低 | 连 Git 即上线 | Vercel/Netlify/Cloudflare Pages |
| 鉴权/支付 | 低 | 直接调 BaaS SDK | 官方文档成熟，AI 抄得稳 |
| **前端 UI** | **高** | AI 看不见屏幕：状态同步、无障碍、跨端一致性、组件协调无 schema 可依 | **每次现场手搓，无标准件** |

**结论**：后端与部署已被标准化，前端是落地链上最后一段未标准化的拼图。本方案不试图全吃链条，而是：**把翻车率最高的前端段做成标准件，把其余各段指向已验证的标准答案，用 Starter 把整条路径固化为三条命令。**

### 0.3 范围

**做**：
1. 契约面加固——`fetchPage`/`af-data` 的后端无关协议 + BaaS adapter 机制（§2、§3）
2. AIFlow Starter 模板——前端标准件 + Supabase 后端模板 + Vercel 部署配置（§4）
3. Starter 内的 AI 约束通道——MCP/ESLint 接入预配置（§4.5）

**不做（红线）**：
- 不自建后端、ORM、数据库、服务器——`@af-mobile/ui` 保持零运行时依赖
- 不做全栈框架（不碰 SSR 数据层、不碰服务端组件）
- 不做账号/云服务——Starter 是仓库模板，不是 SaaS

---

## 1. 总体架构

```
┌────────────────────────────────────────────────────────────────┐
│  AIFlow Starter（一个仓库模板，三条命令上线）                    │
│                                                                │
│  ┌─ 应用层（用户/AI 只写这里）───────────────────────────────┐ │
│  │  pages/（登录/列表/详情三页模板）                          │ │
│  │    ├─ UI：AIFlow UI 28 组件 + 154 class 白名单            │ │
│  │    ├─ 数据：<af-data src="supabase://...">  ← 声明式零胶水 │ │
│  │    └─ 约束：ESLint 15 规则 + MCP check_compliance（预配）  │ │
│  └────────────────────────┬─────────────────────────────────┘ │
│                           ↓ 契约面（唯一后端边界）              │
│  ┌─ 契约适配层 ────────────┴─────────────────────────────────┐ │
│  │  fetchPage / createResource / af-data                     │ │
│  │  + @af-mobile/adapters（独立包，peer 依赖 supabase-js）    │ │
│  │      supabase:// → REST（PostgREST）翻译                  │ │
│  └────────────────────────┬─────────────────────────────────┘ │
└───────────────────────────┼────────────────────────────────────┘
                            ↓（纯 HTTPS，零私有协议）
┌─ 基础设施（生态标准答案，非本项目资产）────────────────────────┐
│  Supabase（Postgres + PostgREST + Auth + RLS）                │
│  Vercel / Netlify（静态托管 + History fallback 已配）          │
└──────────────────────────────────────────────────────────────┘
```

三层职责：

| 层 | 资产归属 | 失效条件 |
|---|---|---|
| 应用层 | 用户 | 永不失效（业务代码） |
| 契约适配层 | 本项目 | 换 BaaS 时换 adapter，UI 不动 |
| 基础设施 | 生态 | 可替换（Firebase/POCKETBASE 同构接入） |

### 1.1 三条命令的落地路径

```bash
# ① 创建（拉取 Starter 模板）
npm create aiflow-app@latest my-app && cd my-app

# ② 接后端（Supabase 控制台建项目，复制两个值进 .env，推送 schema）
cp .env.example .env   # 填 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run db:push        # 执行 supabase/schema.sql（建表 + 默认开启 RLS）

# ③ 上线
npx vercel --prod
```

「落地」从认知负担变成复制粘贴。Starter 自带 History 路由的 `vercel.json` rewrite（见 README「路由与部署」），部署配置不再是用户的第 101 个坑。

---

## 2. 契约面设计（后端边界）

### 2.1 现状盘点

已有资产（[src/lib/fetch.js](../../src/lib/fetch.js)）：

| API | 职责 |
|---|---|
| `fetchPage(url, opts)` | 分页协议 + 缓存 + 超时 + 重试语义 |
| `addInterceptor(fnOrPhase, fn)` | 请求/响应拦截（鉴权头注入位） |
| `invalidateCache(url)` / `clearCache()` | 写后失效 |
| `setCacheAdapter(adapter)` | 缓存后端可换（默认内存，`localStorageAdapter` 可选） |
| `FetchError` 家族 | `TimeoutError` / `HttpError` / `AbortError` 统一错误协议 |
| `<af-data>`（[src/components/af-data.js](../../src/components/af-data.js)） | 声明式获取：`src`/`dataPath`/`totalField`/`cache`/`cacheTtl` |

**这已经是一个窄而稳的契约面**。本设计只需补一块：scheme 路由。

### 2.2 契约协议（规范化，不新增代码）

所有后端资源统一收敛为一个函数签名：

```js
// adapter 契约：输入资源描述，输出标准分页结构
async function query(resource, { page, pageSize, signal }) {
  // return { data: T[], total: number }
  // throw FetchError 家族（禁止裸 throw 字符串）
}
```

- **数据协议**：`{ data, total }`（af-list 的 loadmore 判停依赖 `total`，经 `totalField` 可映射后端字段名）
- **错误协议**：`FetchError` 家族，`af-data:error` 事件透出，页面层用 `af-skeleton-page` + `af-toast` 统一兜底
- **取消协议**：全链路 `AbortSignal`（router 导航取消已内置）

### 2.3 scheme 路由（本设计新增点）

`fetchPage` 增加对 `src` scheme 的分发（约 +30 行，进 coreRuntime 预算 5.4KB 余量内）：

```js
// src/lib/fetch.js —— 新增注册表（不引入任何 BaaS SDK）
const _schemeAdapters = new Map();   // 'supabase' → adapter

export function registerBackend(scheme, adapter) {
  _schemeAdapters.set(scheme, adapter);
}

// fetchPage 入口处：
//   const scheme = new URL(url, location.href).protocol.replace(':', '');
//   if (_schemeAdapters.has(scheme)) return _schemeAdapters.get(scheme)(url, opts);
```

主包只提供注册机制，**不带任何具体 adapter**——零依赖红线不破，体积预算不占。

---

## 3. @af-mobile/adapters（独立可选包）

### 3.1 为什么是独立包而不是塞进主包或 Starter

| 方案 | 否决原因 |
|---|---|
| 塞进 `@af-mobile/ui` | 引入 supabase-js 依赖，破零依赖红线 + 体积预算爆炸 |
| 塞进 Starter 模板 | 用户复制后无法享受 adapter 迭代（模板更新极难回流） |
| **独立包（采用）** | `peerDependencies: { "@supabase/supabase-js": "^2" }`，用则装、不用无感 |

### 3.2 Supabase adapter 设计

`supabase://` scheme 翻译到 PostgREST 查询参数（纯 URL 拼接，走 `fetchPage` 原生 HTTP 通道，鉴权经拦截器注入）：

```
<af-data src="supabase://products?select=id,title,price&category=eq.shoes&order=created_at.desc">
```

翻译规则：

| src 语法 | PostgREST 映射 |
|---|---|
| `host/path` | `GET {SUPABASE_URL}/rest/v1/path` |
| `select=a,b` | 原样透传 |
| `field=eq.value` | 原样透传（PostgREST 过滤语法） |
| `order=col.desc` | 原样透传 |
| 分页（page/pageSize） | `Range: a-b` 头（fetchPage opts 注入） |
| total | `Prefer: count=exact` 响应头 `Content-Range` 解析 |

鉴权：`registerBackend('supabase', ...)` 内部调用 `addInterceptor('request', ...)` 注入 `apikey` + `Authorization: Bearer <access_token>`。anon key 与用户 token 均从 `import.meta.env` / supabase-js session 读取。

### 3.3 安全模型（不可妥协项）

1. **anon key 是公开设计**：`VITE_SUPABASE_ANON_KEY` 进前端 bundle 是 Supabase 官方模型，安全性由 **RLS（Row Level Security）** 承担，不由 key 保密承担
2. **Starter 的 `schema.sql` 默认对所有表开启 RLS** + 提供三条最小策略模板（anon 只读公开表 / authenticated 读写本人数据 / service_role 仅服务端）
3. `.env` 进 `.gitignore`（模板预置），`service_role` key 永不出现在前端代码——Starter 文档用醒目警告块说明
4. CSP 示例配置（`connect-src` 限 Supabase 域）随模板附带

### 3.4 后续 adapter（同构扩展，不在本期）

`firebase://`、`pocketbase://`、`graphql://`——每个都是独立 peer 依赖包，注册进同一 scheme 机制。契约面不变，UI 不动。

---

## 4. AIFlow Starter 模板设计

### 4.1 目录结构

```
aiflow-starter/
├─ .env.example              # SUPABASE_URL / SUPABASE_ANON_KEY（gitignore 真身）
├─ .gitignore                # 预置 .env / .aiflow/ / node_modules
├─ vercel.json               # History fallback rewrite（已含，见 README 部署章节）
├─ index.html
├─ vite.config.js            # 零配置（Vite 仅作打包器，非框架）
├─ supabase/
│  └─ schema.sql             # 建表 + RLS 策略模板（db:push 执行）
├─ src/
│  ├─ main.js                # registerAll + route + start('#app')
│  ├─ backend.js             # registerBackend('supabase', supabaseAdapter) + 拦截器
│  ├─ pages/
│  │  ├─ login.js            # Auth 模板（supabase-js signInWithPassword）
│  │  ├─ list.js             # af-data + af-list + loadmore + pull-refresh 模板
│  │  └─ detail.js           # :param 路由 + createResource 模板
│  └─ styles.css             # @import '@af-mobile/ui/css'
├─ .trae/rules.md            # 引用 MCP get_prompt/check_compliance 的接入说明
├─ eslint.config.js          # 继承 eslint-plugin-aiflow recommended（消费端规则集）
└─ package.json              # @af-mobile/ui + @af-mobile/adapters + supabase-js
```

无框架、无 Node 服务、无构建魔法——与主库「2022+ 原生优先」哲学一致。

### 4.2 三页模板的验证意图

模板不是功能演示，是**每类高频页面的验证过的参照实现**：

| 模板页 | 验证的契约路径 | 覆盖的组件 |
|---|---|---|
| login | Auth SDK + 守卫（beforeEach 重定向） | af-field / af-button 配方 |
| list | supabase:// 分页 + loadmore 判停 + 下拉刷新 | af-data / af-list / af-search-bar |
| detail | `:param` 路由 + createResource + 缓存失效 | af-navbar / af-img / af-swiper |

用户/AI 改造这三页即可覆盖 80% 移动端 CRUD 应用——**参照实现本身就是 few-shot**。

### 4.3 `backend.js`（契约装配点，用户唯一需要理解的后端文件）

```js
import { registerBackend, addInterceptor } from '@af-mobile/ui';
import { supabaseAdapter } from '@af-mobile/adapters/supabase';

registerBackend('supabase', supabaseAdapter);

// 鉴权拦截（adapter 自带，此处示意装配关系）
addInterceptor('request', (url, opts) => {
  opts.headers = { ...opts.headers, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY };
  return [url, opts];
});
```

### 4.4 db:push 的实现（不引入 supabase CLI 强依赖）

`npm run db:push` = Node 脚本读 `schema.sql`，经 Supabase Management API（或 `psql` 连接串）执行。失败时输出「去控制台 SQL Editor 粘贴执行」的降级指引——**三条命令路径不许被工具链问题打断**。

### 4.5 AI 约束通道（把 L4 带进 Starter）

- `eslint.config.js` 继承 `eslint-plugin-aiflow` recommended——**用户在 Starter 内用任何 AI 写代码，保存即受 154 白名单 + 15 规则约束**
- `.trae/rules.md` / `.cursorrules` 预写 MCP 接入指引（`get_prompt` 拿裁剪 prompt → 生成 → `check_compliance` 验证）
- 违规遥测按 flywheel v2 协议落 `.aiflow/`（gitignore 已预置）——**Starter 是飞轮获取第一个真实外部用户的最短路径**：每个用 Starter 的人都在给飞轮喂数据

### 4.6 与主库的版本关系

| 包 | 版本策略 |
|---|---|
| `@af-mobile/ui` | Starter `package.json` 锁 minor（`^1.3`），体积/行为变更走主库 CI 闸门 |
| `@af-mobile/adapters` | 与主库同 repo monorepo 或独立 repo，peer 依赖 `@supabase/supabase-js@^2` |
| Starter 模板 | 独立 repo，`npm create aiflow-app` 指向；模板内锁具体版本，更新靠模板 tag |

---

## 5. 里程碑与验收

| 里程碑 | 内容 | 验收标准 |
|---|---|---|
| M1 | `registerBackend` scheme 路由进主包（§2.3） | coreRuntime ≤ 5.4KB；983+ 测试全绿；`fetchPage` 无 scheme 时行为零变化 |
| M2 | `@af-mobile/adapters` + supabase adapter（§3） | `supabase://` 端到端：af-list 分页 + loadmore 判停 + total 解析 |
| M3 | Starter 三页模板 + 三条命令（§4） | **新人实测：从 `npm create` 到 vercel URL 可访问 ≤ 10 分钟**；RLS 默认开启 |
| M4 | benchmark 挂钩 | Starter 三页任务纳入首过率基准集（北极星指标的数据来源） |

M3 的「10 分钟」是本方案对「落地」的**操作性定义**——不能三条命令跑通的模板不算完成。

---

## 6. 风险与对策

| 风险 | 对策 |
|---|---|
| Supabase API 变更（PostgREST 语法演进） | adapter 独立包可热修；契约面（§2.2）不动，UI 层零感知 |
| 用户绕过契约直接 fetch | ESLint 可加 `no-raw-fetch` 自定义规则（后续飞轮数据验证必要性后再做，避免过度约束） |
| Starter 模板腐烂（依赖过时） | 模板 CI：每周定时 `npm create` → 构建 → e2e 三页冒烟 |
| 「三条命令」在某平台断裂（Windows/企业代理） | 文档提供降级路径（GitHub 模板 Use this template + 手动部署） |
| 被误解为全栈框架 | README 首节放边界声明（§0.3 红线原样公开） |

---

## 7. 设计决策索引

| # | 决策 | 理由 |
|---|---|---|
| D1 | 契约面收敛到 `{data,total}` + FetchError，不发明新协议 | af-list/loadmore/af-data 已按此工作，规范化零成本 |
| D2 | adapter 独立包 + peer 依赖，不进主包 | 零依赖红线与体积预算是主库的立身之本 |
| D3 | scheme 路由只加注册表（~30 行）进主包 | 分发机制是通用能力，具体 adapter 是生态选择 |
| D4 | anon key 公开、安全交给 RLS | Supabase 官方模型；schema.sql 默认 RLS 是模板的安全底线 |
| D5 | 三页模板 = few-shot 参照实现 | 覆盖 80% CRUD 场景，AI 改造参照比读文档快一个数量级 |
| D6 | Starter 预配 ESLint + MCP + 遥测 | 每个落地用户同时是飞轮的真实数据源，获取与反馈同一动作完成 |
| D7 | 「10 分钟三条命令」为 M3 验收线 | 「落地」必须被操作性定义，否则定位无法被证伪 |
