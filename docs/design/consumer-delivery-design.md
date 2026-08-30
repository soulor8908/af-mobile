# 消费端交付链（G1）— 差距分析与设计

> 问题定义：AI 通过 af-mobile 生成的前端功能完成后，到「用户手机浏览器打开真实可用的应用」之间还差什么。
> 关联：D-007（平台化生产基建）、**D-008（业务产品 CF 全栈 / starter 双 target）**、**D-009（交付链适配双后端）**。
> 本文档服务**消费端**（用 af-mobile 生成 App 的用户），业务产品仓的全栈设计见 `production-platform-design.md`。

**决断基线（2026-08-29）**：starter 维持 Supabase 默认 + 补 `--target cloudflare` 变体（D-008）；因此本链路的配件直做、`deploy`/`doctor` 做成双后端可插拔（D-009）。

---

## 0. 现状核查（基于仓库实文件，非推测）

脚手架产物（`scripts/create-app.mjs` → starter 模板）已具备：

| 能力 | 文件 | 状态 |
|---|---|---|
| Supabase 接入 | `starter/src/backend.js`（createClient + registerSupabase + 鉴权拦截） | ✅ 可用（默认 target） |
| 环境变量样例 | `starter/.env.example`（VITE_SUPABASE_URL / ANON_KEY / SUPABASE_DB_URL） | ✅ 可用 |
| 建表脚本 | `starter/scripts/db-push.mjs` + `starter/supabase/schema.sql` | ✅ 半自动 |
| **RLS 策略** | `starter/supabase/schema.sql:13` `enable row level security`；`:16` policy | ✅ **已验证**（原"待验证"结案） |
| 数据请求范式 | `fetchPage` + `supabase://` scheme（`.cursorrules` / `.trae/rules.md` 已约束 AI） | ✅ 可用 |
| 登录块 | `@af-mobile/ui/blocks` 的 af-auth-form | ✅ 可用 |
| SPA fallback | `starter/public/_redirects`（`/* /index.html 200`）、`starter/vercel.json`（rewrite） | ✅ 已预置（两套并存，见 C8） |
| 安全头 | `starter/public/_headers`（CSP `connect-src 'self' https://*.supabase.co`） | ✅ 已预置 |
| 部署约定 | `.trae/rules.md:28`「部署：Cloudflare Pages 默认（dist/ 纯静态）」 | ✅ 已声明 |
| Web 化配件 | — | ❌ 无 manifest / 图标 / 分享 meta / favicon |
| 部署/迭代命令 | — | ❌ 无 `deploy`，无重部署路径 |
| CF 全栈 target | — | ❌ 无 `--target cloudflare` 变体（D-008 待实施） |

> 修正说明：此前表述为「部署配置零配置」，不准确 —— SPA fallback、CSP、部署平台约定均已预置。真正缺的是**平台绑定 + 一键命令 + 部署端环境变量**。

## 1. 链路八环节差距表

「AI 写完前端代码」→「手机浏览器可访问」逐环节：

| # | 环节 | 现状 | 缺口 | 自动化程度 |
|---|---|---|---|---|
| 1 | 后端开通（Supabase 建项目 / CF 建 D1） | env 样例 + schema 备好 | 注册账号、建项目、取凭据 | **人工一次性**，AI 可 checklist 引导 |
| 2 | Auth/RLS 配置 | schema.sql 已含 RLS + policy | 邮箱 provider 开关（Supabase 控制台） | 半自动 |
| 3 | 构建 | vite build 开箱即用 | 无 | AI 全自动 |
| 4 | 部署托管 | 阶段 1 走 CF（D-010） | `deploy` 命令 + provider 抽象（`cloudflare` / `self-hosted` / `cn`） | AI 可全自动（需用户一次性给平台 token） |
| 5 | 域名 HTTPS | — | 平台免费子域名即解决；自定义域名可选人工 | 平台自动 |
| 6 | Web 化配件 | 无 | manifest / 图标 / 分享 meta / favicon | AI 全自动生成 |
| 7 | 错误监控 | 无 | 线上问题不可见 | **非目标**（不建监控平台，P2 文档指引接 Sentry 类） |
| 8 | 迭代闭环 | 无 | 改代码 → 重新部署路径 | AI 可全自动 |

## 2. 差距归类：三类资源供给（核心结论）

剩余差距不在代码能力，在三类**资源供给**：

1. **账号资源**（环节 1/5）——必须人开通，设计目标是压缩为**一次性授权**，之后 AI 可重复驱动
2. **部署命令**（环节 4/8）——补 `af-mobile deploy`，AI 职责从「生成代码」延伸到「交付 URL」
3. **Web 化配件**（环节 6）——纯生成物，脚手架补齐即消失

## 3. 方案：P0 脚手架补齐 → P1 deploy/doctor 命令 → P2 AI 全程交付

### 3.1 P0：脚手架补齐（改 `scripts/create-app.mjs` 的模板，使新项目开箱含配件）

**模板变量机制（务必对齐实现）**：`scripts/create-app.mjs` 用 **JS 模板字符串插值**（`:38` `"name": "${name}"`、`:67` `<title>${name}</title>`），**不存在占位符替换引擎**。新增变量须在脚本内定义来源：

| 变量 | 来源 | 缺省 |
|---|---|---|
| `name` | 已有：目标目录名小写化（`:23`） | `af-mobile-app` |
| `APP_DESCRIPTION` | 新增：CLI `--desc` 参数，缺省用 `name` 派生 | `${name} app` |
| `THEME_COLOR` | 新增：CLI `--theme` 参数，缺省固定 `#1677ff`（库主色 token） | `#1677ff` |

**manifest**（模板新增 `public/manifest.webmanifest`，插值写法 `${name}` / `${APP_DESCRIPTION}` / `${THEME_COLOR}`）：

```json
{
  "name": "${name}",
  "short_name": "${name}",
  "description": "${APP_DESCRIPTION}",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "${THEME_COLOR}",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**index.html 头部配件**（模板追加）：

```html
<meta name="theme-color" content="${THEME_COLOR}">
<meta name="description" content="${APP_DESCRIPTION}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/icon-192.png">
<meta property="og:title" content="${name}">
<meta property="og:description" content="${APP_DESCRIPTION}">
<meta property="og:image" content="/icon-512.png">
```

- **图标与 favicon**：iOS `apple-touch-icon` 不支持 SVG、浏览器必请求 `/favicon.ico`，因此**必须是 PNG/ICO**。starter 模板不引入 sharp/canvas 依赖 —— 改为随包分发预生成的中性占位图（`icon-192.png` / `icon-512.png` / `icon-maskable-512.png` / `favicon.ico`），同步进根 `package.json` 的 `files` 白名单；README 注明替换路径
- **SPA fallback 与静态资源**：`public/_redirects` 的 `/* /index.html 200` 只应在文件不存在时生效（CF Pages / Netlify 默认行为）。实施时需实测 `/manifest.webmanifest` 与图标返回 200 + 正确 MIME，而非被重写为 HTML。顺带清理 `vercel.json` 与 `_redirects` 两套并存的配置（保留其一或写明优先级）
- 部署文档：`starter/DEPLOY.md` —— 两条路径（手动 `wrangler` 部署 / Git 集成自动构建）的差异与环境变量配置位置，10 分钟能跑通
- 验证闸门：**不用 Lighthouse**（不在项目门禁体系内）。改为可脚本断言：build 后校验 `dist/index.html` 含 manifest link、`dist/manifest.webmanifest` 与三个图标 + favicon 存在。可并入 `demo:check` 或新增 `scaffold:check`

### 3.2 P1：`af-mobile deploy` + `af-mobile doctor`（工具链命令，落在 `scripts/af-mobile.mjs`）

> **D-009 / D-010 决断**：命令做成**可插拔** = 通用检查项（后端无关）+ 按 target 分发的专属检查项 + 可切换的部署 provider。
> 现有子命令仅 `create` / `skill add` / `lint`（`scripts/af-mobile.mjs:18`–`:22`）。

**两个正交维度，勿混淆**：

| 维度 | 含义 | 取值 | 谁决定 |
|---|---|---|---|
| **target**（后端形态） | 应用怎么存取数据 | `supabase`（静态前端 + Supabase BaaS）/ `cloudflare`（Workers + D1 全栈） | 脚手架生成时写入，D-008 |
| **provider**（部署落点） | 产物部署到哪 | `cloudflare` / `iga` / `self-hosted` / `cn`（D-016 新增 iga） | 部署时选择，D-010 阶段切换 |

**组合矩阵**（不是笛卡尔积，Workers 全栈只能落在 CF）：

| target ↓ \ provider → | `cloudflare` | `iga` | `self-hosted` | `cn` |
|---|---|---|---|---|
| `supabase` | ✅ Pages 静态托管 | ✅ IGA Pages 静态托管（D-016） | ✅ VPS + nginx（香港/新加坡…） | ✅ COS/OSS + CDN |
| `cloudflare` | ✅ Workers + assets | ✗ Workers 不可脱离 CF | ✗ 同上 | ✗ 同上 |

这解释了为什么香港不需要单独 target —— 它是 `self-hosted` provider 的一个实例位置。

**识别方式**：target 读脚手架写入的 `.af-mobile/target.json`（`{ "target": "supabase" | "cloudflare" }`，缺省 `supabase`）；provider 读 `.af-mobile/deploy.json`（`{ "provider": "cloudflare", "host": … }`），缺省 `cloudflare`（阶段 1）。

**通用检查项（doctor）**：

```
af-mobile doctor
  ✓ dist/ 存在（缺失 → 提示先 npm run build）
  ✓ 配件完整：manifest + 3 图标 + favicon 存在，且 index.html 已引用
  ✓ 密钥前缀红线：无 VITE_ 前缀的部署类密钥（见 §4）
  ○ 部署端环境变量已配（本地 .env 与部署平台两处，见下方）
  ○ 线上可达（HEAD <url> → 200，且 HTML 含 #app 挂载点）
```

**Supabase target 专属**（`target=supabase`，纯静态前端）：

```
  ○ .env 存在且 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 已填
  ○ schema 已推送（对 SUPABASE_DB_URL 查 INFORMATION_SCHEMA 验证表存在；未推 → 提示 npm run db:push）
  ○ RLS 已开启（查 pg_policies；schema.sql 默认已开，故此项为防漂移的回归检查）
  deploy → npx wrangler pages deploy dist --project-name=<name>   # 静态托管
```

**Cloudflare target 专属**（`target=cloudflare`，Workers 全栈，见 `production-platform-design.md` §5）：

```
  ○ wrangler.toml 存在且含 D1 binding
  ○ D1 migrations 已 apply（未推 → 提示 wrangler d1 migrations apply）
  ○ 同源 /api/health 可达（全栈部署后验证）
  deploy → npx wrangler deploy                                     # Workers + assets 单单元
```

**环境变量两处配置（易漏，必检）**：`VITE_*` 变量在**构建时**注入 —— 本地 `.env` 与**部署平台的构建环境变量**需各配一份。缺后者 = 构建产物里 URL 为空 = 线上白屏。`doctor` 只能校验本地，需在 `DEPLOY.md` 明确提示部署端那一处。

- **实现落点**：`scripts/deploy.mjs`（导出 `runDoctor` / `runDeploy` / `buildDeployCommand` 及各检查项函数供测试；`opts.fetch` 与 `opts.run` 可注入）；`scripts/af-mobile.mjs` 新增 `doctor` / `deploy` 子命令分发
- 验证闸门：vitest 覆盖 deploy/doctor 的参数解析、target/provider 分发与前置检查逻辑（网络与 wrangler 调用 mock）；ESLint 全绿

### 3.3 P2：AI 全程交付（skill 扩展）

- `af-mobile-grill` skill 流程尾部追加交付段：需求确认 → 生成工程 → **`doctor` 引导开通（后端注册 checklist → 推 schema → `deploy`）→ 输出可访问 URL**
- 环节 1 的人工开通做成对话式 checklist（AI 逐步指路，用户操作后回「好了」，AI 跑 `doctor` 复检）
- 目标状态：grill 结束时用户拿到的是可访问 URL，而不是一个本地项目

## 4. 边界（防越界，与 D-007 / D-008 一致）

| 边界 | 立场 |
|---|---|
| 平台不托管消费者业务数据 | 延续 D-007：业务数据永远在用户自己的后端（Supabase 或自有 D1） |
| **密钥前缀红线** | 部署类凭据（平台 API token、db 连接串）**禁止 `VITE_` 前缀** —— 带前缀会被 vite 打进前端 bundle 直接泄露。此红线须同时写进 `.env.example` 注释、`.cursorrules`、`.trae/rules.md` |
| deploy 凭据 | 平台 token 只存用户项目 `.env`（已 gitignore），不进库、不进平台后台 |
| 不做错误监控平台 | 环节 7 为非目标；DEPLOY.md 给一段 Sentry/外部方案指引即可 |
| 不做域名代购/解析 | 自定义域名仅文档指引 |
| starter 后端形态 | 双 target 并存（D-008）：Supabase 默认 + CF 全栈变体。本链路不替消费端选后端 |

## 5. 执行计划与验证闸门

| 阶段 | 内容 | 验证 |
|---|---|---|
| P0 | create-app.mjs 模板补 manifest/图标/meta/favicon + DEPLOY.md；**带 changeset**（`create-app.mjs` 在 `package.json` files 白名单内 = 发布产物，缺 changeset 会被 `changeset:check` 阻断） | 新脚手架 build 产物含配件且断言脚本通过；ESLint 全绿 |
| P1 | `af-mobile deploy` / `af-mobile doctor`（通用 + 双 target 分发） | ✅ **已实现**：`scripts/deploy.mjs`（`doctor` / `deploy` 子命令，由 `scripts/af-mobile.mjs` 分发）；测试 `test/deploy.test.js` 35 例（网络与 wrangler 全 mock）；已冒烟验证 doctor 检出密钥前缀违规 + `deploy --dry-run` 输出正确命令。剩余：真实项目手工跑通一轮 deploy→重 deploy |
| P2 | grill skill 交付段 | 端到端演练：新需求 → URL 可访问 |

各阶段独立可交付；P0 只动脚手架模板，风险最低可先行。

## 6. 风险登记

| 风险 | 缓解 |
|---|---|
| 国内访问质量（`*.pages.dev` 与 Supabase 国内稳定性未实测） | 已按 **D-010** 接受：阶段 1 全走 CF，阶段 2/3 按触发判据迁移（§7.1）。缓释手段是**守住防锁定约束**（§7.3），让迁移只换 provider 不重写应用 |
| 部署端环境变量漏配 → 线上白屏 | doctor 提示两处配置；DEPLOY.md 明确写出部署端配置入口 |
| 部署类密钥被写成 `VITE_*` 前缀泄露 | §4 红线 + doctor 自动检查 + 三处 AI 规则文件同步 |
| SPA fallback 把 manifest/图标重写成 HTML | P0 实施时实测静态资源返回 200 + 正确 MIME |
| 占位图引入图片处理依赖 | 随包分发预生成 PNG/ICO，不在模板里生成图片 |
| wrangler 拉取慢/版本漂移 | 用 `npx wrangler@<pinned>` 或 devDependencies 固定 |
| AI 生成的应用质量与配件无关 | 配件只解决「可访问」，内容质量仍靠 grill 需求流程与 demo:check 体系 |

## 7. 部署平台演进路径（D-010 已决，非阻塞项）

> **已决（2026-08-29，D-010）**：阶段 1 全走 Cloudflare，不做国内适配；发布后按实测决定是否转香港；流量足够大再转国内。本节记录调研数据与迁移判据。

### 7.1 三阶段与触发判据

| 阶段 | 平台 | 触发判据 | 成本 |
|---|---|---|---|
| **1（当前 → 首发）** | **全走 Cloudflare**（Pages/Workers + D1） | 默认态 | 0 元 |
| **2（发布后视情况）** | 转**香港 self-hosted**（VPS + nginx，免备案） | 国内用户占比显著 且 出现真实访问失败/超时反馈 | ≈20 元/月起 |
| **3（流量足够大）** | 转**国内 COS/OSS + CDN**（需 ICP 备案） | 带宽成本成为主要支出，或香港带宽撑不住并发 | 0–几十元/月 + 备案成本 |

### 7.2 已核实的调研结论（2026-08）

**「让 CF 在中国大陆变快」没有便宜解** —— Cloudflare China Network（京东云运营节点）与 Global Acceleration 均要求 **Enterprise plan + 每个域名 ICP 备案**，个人/小团队不可得。

**香港线路质量分档**（实测）：

| 线路 | 延迟 | 晚高峰 | 商用 |
|---|---|---|---|
| 普通 163 国际 | 80–150ms | 300ms+，易丢包 | ✗ |
| CN2 GT | 30–45ms | 波动到 50ms，丢包<0.5% | ✓ |
| 三网优化（CN2回程 + 联通直连 + 移动 CMI） | 30–60ms | 稳定 | ✓ 最划算 |
| CN2 GIA | 15–25ms | 极稳 | ✓ 但贵 |

**香港的瓶颈是带宽不是延迟**：便宜套餐仅 2–5 Mbps（≈375KB/s），10 并发首屏即崩；「大带宽 + CN2 GIA」是香港最贵组合。

**国内托管价格**：腾讯云 COS 50GB 存储 + 10GB/月流量 + 10GB/月 CDN 回源免费，CDN ≈0.2 元/GB；七牛 Kodo 10GB 存储 + 10GB/月 CDN 流量免费；腾讯云开发静态托管约 0.21 元/天。**共同前提：ICP 备案**（个人备案免费，需绑定国内服务器或备案服务码，1–20 天）。

### 7.3 防锁定约束（阶段 1 编码时必须遵守）

迁移可行性完全取决于现在是否锁死在 CF 上。四条硬约束：

1. 业务代码**不得直接依赖 CF 专有能力**（Workers KV、Durable Objects、D1 方言 SQL、平台特有 API）
2. 数据访问统一走 `fetchPage` + `adapters/`，后端可替换
3. 部署统一走 `af-mobile deploy` 的 **provider 抽象**（`cloudflare` / `self-hosted` / `cn`），业务代码不含平台调用
4. 配置与密钥不写死平台，走 env；域名不硬编码

> `self-hosted` provider（香港/新加坡/东京通用）实现最简单：build → rsync/scp + nginx conf 模板，不适配任何平台 API。**香港不需要单独的 target**，它是 `self-hosted` 的一个实例位置。

### 7.4 迁移时的实施提示

- 只搬前端不搬后端只能解决一半 —— API 仍跨境。彻底解决需后端一起搬（自托管或用区内 BaaS）
- 涉及**微信 JS-SDK / 微信支付**时域名必须备案，香港方案解决不了
- 阶段 2 触发时按 AGENTS.md §5 新开 DECISIONS 条目登记（含实测数据），回链 D-010

### 7.5 原「待评估」清单（已完成调研，保留追溯）

| 待测项 | 判据 | 结论 |
|---|---|---|
| `*.pages.dev` 国内直连可达性与延迟 | 多运营商 / 多省份抽样，成功率 ≥95%、首屏 <3s | 待测 |
| Supabase 国内直连（含 Auth 与 PostgREST） | 同上 | 待测 |
| 国内备选平台（EdgeOne Pages / COS+CDN / OSS+CDN） | 备案要求、CI 部署方式、成本 | 待测 |

结论：已由 D-010 转为三阶段演进，不再「评估后再定」。P0（配件）与平台无关照做；P1 的 `deploy` 命令按 provider 抽象实现，`cloudflare` provider 先做，`self-hosted` / `cn` 留接口后填。

## 8. IGA provider：国内/海外双部署选项（D-016，2026-08-30）

> 问题：D-010 的国内访问风险要等「发布后实测触发」才缓解；IGA Pages（火山引擎体系）默认域名国内可达性预期更好，可作为国内消费者的**前置可选**落点 —— 国内选 IGA，海外选 CF，用户按需选择。

### 8.1 决断（2026-08-30）

| 决策点 | 结论 | 放弃了什么 |
|---|---|---|
| provider 选择方式 | `--provider` flag + 持久化写入 `.af-mobile/deploy.json`，之后省略沿用 | 交互式菜单（破坏 AI 全自动链路）；纯手改 JSON（小白不友好） |
| 缺省 provider | **维持 `cloudflare`**（D-010 阶段 1 不动）；doctor 在 `provider=cloudflare && target=supabase` 时输出一条 info 引导「国内用户可加 `--provider iga`」 | 把缺省压到 IGA（可达性/SPA fallback/计费均未实测）；脚手架时定 provider（用户往往还没想好，且全栈 target 下无效） |
| 实现深度 | **薄封装**：现有 `deploy.mjs` 内加 iga 分支，约 +80 行，无新文件 | 深集成（自动化建立在未实测的 IGA 行为上，高返工风险）；provider 模块化重构（当前仅 2 个实现，预支抽象违反 YAGNI） |

### 8.2 组合矩阵与部署命令

- `ALLOWED` 矩阵：`supabase` target 增加 `iga`；`cloudflare` target（Workers 全栈）**维持仅 `cloudflare`** —— Workers 不可脱离 CF
- 部署命令：`iga pages deploy --name <project>`（与 CF 路径同为「本地 build → 传产物」语义；IGA 对 Vite 的自动构建行为实施时实测，必要时命令前挂 `npm run build`）
- IGA 部署后自动提供平台默认域名（自定义域名可选，非必需）；**preview URL 带 `?iga_token=…&iga_time=…`，分享必须带全 query**

### 8.3 doctor 专属检查项（仅 `provider=iga` 时追加，`opts.run` 注入可 mock）

```
✓ iga CLI 已安装且版本 ≥ 1.1.0   （iga --version，required）
✓ 登录态有效                     （iga whoami，required；未登录 → 本地浏览器登录 / 远程 IAM 控制台取 AK/SK）
○ 项目 link 状态                 （info；未 link 不阻断，deploy 首跑自动建项目）
```

env 提示差异化：IGA env 为远程项目级配置、**下次 deploy 才生效**，且 `VITE_*` 构建时注入 —— 必须「先 `iga pages env add` 再 deploy」。国内用户优先引导 `iga pages integration link supabase`（连接变量自动同步，消掉「本地与部署端两处漏配」坑）。

### 8.4 实现改动清单

| 文件 | 改动 |
|---|---|
| `scripts/deploy.mjs` | `PROVIDERS` 加 `'iga'`；ALLOWED 矩阵；`buildDeployCommand` iga 分支；3 个 iga 检查函数；`--provider` 解析与成功后写回 deploy.json（doctor 子命令同样解析 `--provider` 但只读自检、**不写回**）；缺省引导 info |
| `scripts/af-mobile.mjs` | 无改动（flag 已透传） |
| `test/deploy.test.js` | 新增：iga 命令构造 / 矩阵合法性（`cloudflare+iga` 拒绝）/ flag 写回 / 检查项 mock |
| `starter/DEPLOY.md` 模板 | 补 IGA 路径段：登录 → deploy → env/integration 说明 |

### 8.5 验证闸门与实施时实测项

- vitest 全绿（现有 35 例不破 + 新增 iga 用例）、ESLint 0 warning；`deploy --dry-run --provider iga` 冒烟；带 changeset
- **实测项**（不实测不发布该 provider）：① `iga pages deploy` 对 Vite 的构建行为 ② `public/_redirects` SPA fallback 在 IGA 是否生效（不生效 = 深链 404，需找 IGA 等价配置）③ IGA 计费/免费额度 ④ 默认域名国内可达性抽样

### 8.6 与 D-010 的关系

D-016 不推翻 D-010 三阶段路径，而是在阶段 1 内**前置提供国内友好选项**：若 IGA 实测四项全过，国内用户可直接落在 IGA，阶段 2（香港 self-hosted）的触发概率下降；阶段 2/3 判据不变。防锁定四约束（§7.3）继续有效 —— IGA 只是 provider 抽象的又一个实现。
