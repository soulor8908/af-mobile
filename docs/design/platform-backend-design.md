# 平台化生产基建 — 详细设计（发布自动化 / CI-CD 补全 / 平台后台）

> 背景：项目定位从「纯前端 npm 库」扩展为「平台型产品」（用户确认）。本文档覆盖三块：
> ① 发布自动化（P0）② PR Preview 部署（P1a）③ 平台后台服务（P1b~P2）。
> 关联决策登记：docs/DECISIONS.md（平台后台定位为「开发工具链服务」，非消费者业务后台）。

---

## 0. 现状盘点与缺口

| 能力 | 现状 | 缺口 |
|---|---|---|
| CI | `.github/workflows/ci.yml` 全闸门（12+ 检查 + e2e + publish:check） | 无 |
| 部署 | `docs.yml` 部署 site/demo 到 GitHub Pages | PR Preview 预览环境 |
| 发布 | **已落地**：`.github/workflows/release.yml`（changesets 单 job 两段式 + `--provenance` + registry smoke）+ 根 `"release": "changeset publish --provenance"` | 待**首次真实发版验证**（此前 v2.1.0 E401 事故发生在手动发布时代）；验证项见 §1.4 |
| 后台服务 | 无。遥测（eval/telemetry.mjs）本地 JSONL、不出本机 | 平台后台（见 §3） |

## 0.1 两个「后台」的边界（防混淆，写死）

| | 平台后台（`server/` workspace，本文档 §3） | 消费者项目自己的后台 |
|---|---|---|
| 属于谁 | 库作者/团队 | 用 af-mobile 开发 App 的用户 |
| 服务谁 | MCP / CLI / CI 等开发工具 | 消费者 App 运行时 |
| 干什么 | 遥测收集、flywheel 看板、（远期）账号体系 | 用户自己的业务数据 |
| 消费者要不要接 | **不接，默认无感**（opt-in 上报） | 用户自选接入（现成 `adapters/supabase.js` 适配器，填自己的 SUPABASE_URL） |

**范围外（Scope out）**：本仓库不建、不托管任何消费者业务后台。消费者侧只持续维护 adapter。

## 0.2 已确认的关键决策

| 决策 | 选择 | 放弃了什么 |
|---|---|---|
| 产品定位 | 平台型（需后台） | 纯库零后台的最小路径 |
| 后台形态 | 主 Cloudflare（Workers + D1），Supabase 作为可选存储驱动 | 单一绑定 Supabase / 自建 Node 服务器 |
| 代码位置 | 当前仓库 monorepo 加 `server/` workspace | 另起新仓库（失去 sanitize 逻辑复用 + CI 串联） |
| 存储驱动节奏 | **先只做 D1 驱动，适配层接口留扩展点**；Supabase 驱动有真实需求再实装 | 两个驱动同时写（避免为不存在的需求写代码） |
| 遥测边界 | opt-in 上报，延续脱敏红线（`sanitizeMessage` 复用，出本机仍无代码内容） | 默认收集 |

## 0.3 发布包清单（release.yml 的实际作用域）

| 包 | private | 发布方式 | 特殊点 |
|---|---|---|---|
| @af-mobile/ui | no | changeset publish | `prepublishOnly` 已含 build + publish:check |
| @af-mobile/mcp | no | changeset publish | 需先 `npm run build:mcp`（prepublish 链内） |
| @af-mobile/prompt | no | changeset publish | 需先 `npm run build:prompt` |
| @af-mobile/tokens | no | changeset publish | 需先 `npm run pub:tokens` 的 build 步骤 |
| @af-mobile/eslint-plugin | no | changeset publish | 无 build |
| @af-mobile/adapters | no | changeset publish | peer 依赖 ui |
| create-af-mobile | 视现况 | changeset publish | bin 包，v1.7.0 曾 ETARGET（见 §1.4 smoke） |
| @af-mobile/server | **yes** | 不发布（仅部署 Worker） | P1b 新增 |

---

## 1. P0：发布自动化（release.yml）

### 1.1 流程设计（changesets 标准两段式）

```
普通 PR 合并到 main（含包改动）
  └→ release.yml job「version」：
       changesets/action 检测 .changeset/*.md 存在且无待合并 Version Packages PR
       → 自动创建/更新「Version Packages」PR
         （changeset version：bump 各包 version + 写 CHANGELOG.md + 删除已消费的 changeset 文件）
       → 输出 createdPR / hasChangesets 供后续 job 判断

「Version Packages」PR 合并到 main
  └→ release.yml job「publish」：
       npm ci（Node 24 + npm 11.9.0 锁版，同 ci.yml 注释的原因）
       → npm run build（dist）+ 各 workspace build（mcp/prompt/tokens）
       → npm run publish:check（tree-shaking + sideEffects + pack 内容）
       → changeset publish --provenance（NPM_TOKEN）
       → git tag（changesets 自动打 v<pkg>@<ver> 标签）+ GitHub Release（CHANGELOG 内容）
```

### 1.2 完整 workflow 代码（`.github/workflows/release.yml`）

```yaml
name: Release

on:
  push:
    branches: [main]

concurrency:
  group: release
  cancel-in-progress: false   # 发布不可取消中途，排队执行

permissions:
  contents: write             # changeset version 提交 + git tag
  pull-requests: write        # 创建 Version Packages PR
  id-token: write             # npm provenance（OIDC）

jobs:
  version:
    name: Version Packages PR
    runs-on: ubuntu-latest
    outputs:
      published: ${{ steps.publish.outputs.published }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0      # changeset status 需完整 main 历史

      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - name: Pin npm version
        run: npm install -g npm@11.9.0
      - run: npm ci

      # 两段式：无 Version Packages PR 时创建；有待发布版本时执行 publish
      - name: Changesets version or publish
        id: publish
        uses: changesets/action@v1
        with:
          version: npm run version-packages
          publish: npm run release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          HUSKY: '0'          # 发布提交不跑 git hooks
```

说明与取舍：

- **不用两个 job**：changesets/action v1 官方模式是单 job 内自动分流（有 changeset → version PR；无 changeset 且有未发布版本 → publish）。拆两个 job 会出现竞态（version PR 刚合并、publish job 未感知）。
- **`--provenance`**：通过根 package.json scripts 传参（`"release": "changeset publish --provenance"`），provenance 要求 npm ≥ 9.5（已锁 11.9.0）+ `id-token: write`。
- **build 顺序**：`prepublishOnly`（ui 包）已含 build；mcp/prompt/tokens 的 build 前置在其各自 `prepublishOnly` 或 `pub:*` 脚本中，changeset publish 会触发每个待发包的 `prepublishOnly` —— P0 实施时逐一验证四个包的 prepublish 链，缺的补 `prepublishOnly` 而不是在 workflow 里硬编码 build 步骤。

### 1.3 Secrets 与环境配置（一次性，本地操作）

| 项 | 值 | 备注 |
|---|---|---|
| `NPM_TOKEN` | npm granular access token | 仅 `Publish` 权限、绑定包范围 `@af-mobile`、设过期（90 天轮换） |
| 环境保护 | Environments → `npm-publish` | 可选：限制仅 main 分支可引用 |
| npm 侧 | 2FA 设置为「授权外操作仅需 token」 | 否则 CI publish 会 EOTP |

### 1.4 发布后 smoke（P0 简版 + P2 完整版）

- **P0 简版**：publish 成功后 `npm view @af-mobile/ui version` 轮询（3 次 × 10s）确认 registry 可见，输出到 Release body。
- **P2 完整版**：独立 workflow —— `npm create af-mobile smoke-<run_id>` 拉脚手架 → 安装 → 跑最小 e2e。防 v1.7.0 ETARGET 类事故（create-af-mobile `^1.7.0` 先发引用、ui 包后发）复发。

### 1.5 失败处理预案

| 症状 | 处理 |
|---|---|
| E401/EOTP | 检查 NPM_TOKEN 权限/过期 + npm 2FA 模式；本地验证 `npm whoami --registry` |
| E409 already exists | 部分包发成功部分失败（changesets 不原子）：手工 `npm publish --workspace=<pkg>` 补发剩余，不改版本号 |
| provenance 失败 | 降级方案：去掉 `--provenance` 重跑（不影响包完整性，仅少构建来源标识） |
| Version Packages PR 合并冲突 | 手动解决后重跑 release.yml（workflow_dispatch 兜底入口） |

### 1.6 实施状态（2026-08-29 更新）

原计划「需要新增/修改的文件」三项**均已完成**：

| 项 | 状态 |
|---|---|
| `.github/workflows/release.yml`（§1.2） | ✅ 已落库，实现与设计一致 |
| `package.json` 的 `release` 脚本加 `--provenance` | ✅ 已为 `"release": "changeset publish --provenance"` |
| `docs/DECISIONS.md` 登记决策 | ✅ 已登记为 [D-007](../DECISIONS.md)；后续 D-008 / D-009 已补登记 |

> **P0 剩下的唯一事项是「真实发版验证」，不是代码**。下一个版本发布时按 §1.4 的 smoke 输出逐条核对，并把结果回填本节。

后续待登记：PR Preview 平台选型（**D-011**，见 §2.2 修正后的实现路径）。

---

## 2. P1a：PR Preview 部署

### 2.1 选型：Cloudflare Pages（倾向）

| 方案 | 优点 | 缺点 |
|---|---|---|
| **Cloudflare Pages** | 每 PR 独立 preview URL；PR 关闭自动清理；与平台后台同账号同域 | 引入第二个部署平台 |
| GitHub Pages 子路径 | 零新增平台 | 单站点 `/preview/pr-<n>/` 需 vite base 路径注入；过期需自建清理 workflow；Pages 并发限制 |

### 2.2 实现要点

> **修正（2026-08-29）**：原方案「改 `docs.yml` 加 `pull_request` 触发 + 用 `wrangler pages deploy`」自相矛盾 —— `docs.yml` 是 GitHub Pages 流程（`permissions: pages: write` + pages artifact 上传），与 Cloudflare Pages 是两套体系，无法在同一 workflow 内混用。改为**新建独立 workflow**。

- 新建 `.github/workflows/preview.yml`：
  - 触发：`pull_request`，paths 过滤与 `docs.yml` 一致（`site/**` `demo/**` `src/**` `scripts/**` `package.json` 等）
  - 产出：构建 demo + site + playground
  - 部署：`wrangler pages deploy dist --project-name=af-mobile-preview --branch=pr-<n>`
  - 权限：`CLOUDFLARE_API_TOKEN`（Pages Write）+ `CLOUDFLARE_ACCOUNT_ID` 存 GitHub Environments `preview`；另需 `pull-requests: write` 以回写 preview URL 评论
- **不动 `docs.yml`**：它继续只服务 `main` 分支的 GitHub Pages 正式站点
- 保留策略：Cloudflare Pages 自带分支部署列表，人工定期清理即可（不为清理逻辑写代码）
- 命名消歧：业务产品仓的 preview 设计见 `production-platform-design.md` §6.2，与本节的库仓 preview 是**两个不同仓库的两条流水线**，勿合并
- **待登记**：§2.1 的选型结论（CF Pages 优于 GH Pages 子路径）按 AGENTS.md §5 登记为 **D-011**，含放弃了什么（不自建 GH Pages 子路径的清理逻辑）。注：编号 D-010 已分配给 [部署平台三阶段演进](../DECISIONS.md)（CF → 香港 → 国内）。

---

## 3. P1b：平台后台（server/ workspace）

### 3.1 架构

```
MCP / CLI / CI（开发工具，opt-in 上报）
        │  POST /v1/telemetry（脱敏后 JSONL 事件，批量，≤1MB/批）
        ▼
Cloudflare Worker（server/，常驻唯一入口）
├── 路由层
│   ├── POST /v1/telemetry   # 批量上报，schema 校验，写 D1
│   └── GET  /v1/stats       # 看板聚合查询（token 鉴权，作者侧使用）
├── 存储适配层（扩展点，本阶段仅 d1 驱动）
│   └── driver: d1           # 默认实现（env.TELEMETRY_DRIVER 分发）
└── 中间件：CORS（工具域名白名单）、限流（每 token/每 IP）、schema 校验
```

### 3.2 目录结构与复用

```
server/                          # 新 workspace（加入根 package.json workspaces）
├── package.json                 # @af-mobile/server，private: true（永不发布 npm）
├── wrangler.toml                # Worker + D1 binding（TELEMETRY_DB）
├── migrations/                  # D1 SQL 迁移（wrangler d1 migrations）
├── src/
│   ├── index.js                 # Worker 入口（路由分发，零框架，原生 fetch handler）
│   ├── routes/
│   │   ├── telemetry.js         # POST /v1/telemetry
│   │   └── stats.js             # GET /v1/stats
│   ├── drivers/
│   │   ├── d1.js                # saveEvents(batch) / queryStats(range)
│   │   └── index.js             # getDriver(env) —— 扩展点
│   └── validate.js              # 事件 schema 校验（对齐 telemetry.mjs 事件结构）
└── test/                        # vitest（drivers 用 D1 mock）
                                 # 位置修正：根 vitest.config.js:20 include 仅 'test/**/*.test.js'，
                                 # 故必须放 server/test/ 并扩展 include；放 src/test/ 不会被执行
```

复用：`eval/telemetry.mjs` 的 `sanitizeMessage` 已在包 `files` 白名单中（`"eval/telemetry.mjs"`），server 侧 import 同一份脱敏逻辑做**入库前二次校验**（防未来客户端版本携带未脱敏消息），两处红线不漂移。

### 3.3 事件契约（与 eval/telemetry.mjs `recordRun` 严格对齐）

入库事件的 schema（v1，客户端上传体）：

```jsonc
{
  "v": 1,                          // schema 版本，非 1 拒收（422）
  "kind": "lint",                  // 'lint' | 'prompt'
  "source": "mcp",                 // 'mcp' | 'cli' | 'ci' | 'eval'（SOURCE_WEIGHTS 键）
  "tool": "cursor",                // detectTool() 产物，string
  "file": "demo/index.html",       // 相对路径（客户端已保证不含绝对路径/用户名）
  "passed": false,
  "violations": [
    { "rule": "af-mobile/no-inline-style", "severity": "error", "line": 12, "message": "…[style]…" }
  ],
  "scene": ["auth-form"]           // 可选，kind='prompt' 时有效；封闭集校验
}
```

校验规则（server/src/validate.js）：

- `v !== 1` → 422；`source` 不在封闭集 → 422；`violations` 单条 message 超 200 字符 → 截断（对齐 `MAX_MESSAGE_LEN`）
- `message` 入库前过一遍 `sanitizeMessage(rule, message)`（§3.2 复用）
- 单批 ≤ 100 事件且 body ≤ 1MB，超出 → 413

### 3.4 存储适配层接口（扩展点设计）

```javascript
// server/src/drivers/index.js —— 驱动接口契约（本阶段仅实现 d1）
// saveEvents(events: TelemetryEvent[]) -> Promise<{ inserted: number }>
// queryStats(range: { from, to })      -> Promise<StatsResult>

export function getDriver(env) {
  // env.TELEMETRY_DRIVER === 'supabase' 时未来可切；当前仅 'd1'，未知值 fail-fast
  if (env.TELEMETRY_DRIVER && env.TELEMETRY_DRIVER !== 'd1') {
    throw new Error(`unknown driver: ${env.TELEMETRY_DRIVER}`);
  }
  return d1Driver(env.TELEMETRY_DB);
}
```

Supabase 驱动实装条件（登记为触发条件，非承诺）：出现「需要 auth / realtime / 跨项目 PostgREST 查询」的真实需求时。实装时仅需新增 `drivers/supabase.js`，路由层零改动。

### 3.5 数据模型（D1 migrations，最小两表）

```sql
-- migrations/0001_init.sql
CREATE TABLE runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,               -- 'lint' | 'prompt'
  source TEXT NOT NULL,             -- mcp | cli | ci | eval
  tool TEXT NOT NULL,
  file_path TEXT,
  passed INTEGER NOT NULL,
  scene TEXT,                       -- kind='prompt' 的场景键（封闭集校验）；kind='lint' 为 NULL
  schema_v INTEGER NOT NULL DEFAULT 1,  -- 事件契约版本，便于 v2 迁移时新旧并存
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_runs_source_time ON runs(source, created_at);
CREATE INDEX idx_runs_scene ON runs(scene);   -- §4 看板 sceneDist 依赖此列

CREATE TABLE violations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL REFERENCES runs(id),
  rule TEXT NOT NULL,
  severity TEXT NOT NULL,
  line INTEGER,
  message TEXT                      -- message 已脱敏（服务端二次 sanitize）
);
CREATE INDEX idx_violations_rule ON violations(rule);
```

（rollup 聚合表 P2 按看板实际查询慢查询数据再加，不预建。）

**补字段说明（2026-08-29）**：原表缺 `scene` 列 —— 而 §3.3 事件契约含 `scene`、§4 看板要展示 `sceneDist`，不补则 P2 看板无数据支撑。`schema_v` 为契约升级留退路。

**数据留存策略**（原文档缺失）：明细表保留 180 天，rollup 聚合结果长期保留。删明细用一个定时 Worker（`schedules` in wrangler.toml，每日跑 `DELETE FROM runs WHERE created_at < datetime('now','-180 days')` + 级联删 violations）或人工 `wrangler d1 execute`。隐私红线此前只覆盖「脱敏」，未覆盖「留存」，此处补齐。

### 3.6 Worker 路由实现（代码骨架）

```javascript
// server/src/index.js —— 零框架，原生 fetch handler（Worker 免冷启动、包体最小）
import { getDriver } from './drivers/index.js';
import { handleTelemetry } from './routes/telemetry.js';
import { handleStats } from './routes/stats.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const driver = getDriver(env);

    if (request.method === 'POST' && url.pathname === '/v1/telemetry') {
      return handleTelemetry(request, driver, env);
    }
    if (request.method === 'GET' && url.pathname === '/v1/stats') {
      return handleStats(request, driver, env);   // Bearer token 鉴权（env.STATS_TOKEN）
    }
    return new Response('not found', { status: 404 });
  },
};
```

```toml
# server/wrangler.toml
name = "af-mobile-telemetry"
main = "src/index.js"
compatibility_date = "2026-08-01"

[[d1_databases]]
binding = "TELEMETRY_DB"
database_name = "af-mobile-telemetry"
database_id = "<创建后回填>"

[vars]
TELEMETRY_DRIVER = "d1"
# STATS_TOKEN / 上报鉴权 token 用 `wrangler secret put`，不入库

# 环境隔离（必做）：dev 与 production 各一套 D1，顶层 binding 默认指向 dev，
# 生产部署必须显式 `wrangler deploy --env production`，防「预演连生产库」类事故
#   [[env.production.d1_databases]]
#   binding = "TELEMETRY_DB"
#   database_name = "af-mobile-telemetry"
#   database_id = "<prod 库回填>"
```

鉴权与限流：

- 上报：公开端点但带轻量令牌（env 注入的固定 token，工具配置文件持有），作用是防滥用刷库，不是身份体系
- 看板查询：`STATS_TOKEN` Bearer，仅作者侧持有。**不放在 URL query**（会被访问日志与 Referer 记录），走请求头，或直接用 Cloudflare Access 保护看板页
- 限流：每 token 每 IP 每 10s ≤ 10 批。**实现方式修正**：不用 D1 计数 —— 每次上报额外读写 D1 既消耗免费额度又写放大，且 Workers 无全局内存导致计数本身不准。改用 Workers 原生 Rate Limiting binding（不产生存储写入）；不可用时降级 KV 计数

### 3.7 上报链路与 opt-in（工具侧改动）

- 开关：`npx af-mobile telemetry enable|disable|status`（实现落在 `scripts/af-mobile.mjs`，用户级配置 `.af-mobile/config.json`：`{ "telemetry": "off" | "on" }`，**默认 off**）
- 上报客户端（P1b 新增 `scripts/telemetry-upload.mjs`，被工具链复用）：
  - 触发时机：`lint-flywheel.mjs` / MCP `check_compliance` 运行结束后异步执行；失败静默（遥测永远不阻塞主流程，无网络/超时 2s 即放弃，事件留在本地 JSONL 下次随批重试）
  - 游标：`.af-mobile/upload-cursor.json` 记录已上报行号，本地 JSONL 增量读取
  - **端点可配置（2026-08-29 补齐）**：默认端点常量写在 `scripts/telemetry-upload.mjs`，支持 `AF_MOBILE_TELEMETRY_URL` 环境变量覆盖。工具链是用户本地安装的 npm 包，端点写死 = 无法自托管、无法本地联调、未来迁域名即失联
- 隐私红线延续（文档同步 docs/incidents.md「四」）：
  - 上报内容 = `recordRun` 产物（已经 `sanitizeMessage` 脱敏：无代码内容，仅规则名/严重度/行号/语义前缀/标识符）
  - `kind='prompt'` 只传 `scene` 封闭集键，**不传需求原文**
  - opt-out 立即生效：关闭后仅本地写入

### 3.8 新增 workspace 的门禁改造 checklist（必做）

`server/` 是新目录，**现有门禁不会自动覆盖它**。实施 P1b 前必须同步四处：

| # | 位置 | 动作 |
|---|---|---|
| 1 | `AGENTS.md` §1 | ESLint 命令的目录列表加 `server/`（现为 `src/ test/ scripts/ e2e/ prompt/ eval/ mcp/ eslint-plugin-af-mobile/ adapters/ starter/src/`） |
| 2 | `eslint.config.js` | 新增 `files: ['server/**/*.js']` 配置段 —— 该文件按目录逐段配置（`:48`–`:110`），未匹配任何段的文件不受 lint |
| 3 | `vitest.config.js:20` | `include` 从 `['test/**/*.test.js']` 扩展为同时含 `server/test/**/*.test.js` |
| 4 | `.changeset/config.json` | 加 `privatePackages: { "version": false, "tag": false }` —— `@af-mobile/server` 是 private，否则每次发版都产生无意义的版本 bump 与 CHANGELOG 条目 |

**回归验证**：根 `package.json` 的 `overrides: { "@af-mobile/ui": "file:." }` 在新增 workspace 后的解析行为（历史事故：npm 版本漂移导致 CI 失败，故 ci.yml / release.yml 均锁 npm@11.9.0）。加完 workspace 后跑一次完整 `npm ci` + `npm run ci`。

**Worker 部署流水线**（原文档缺失）：`release.yml` 只负责发 npm 包，Worker 需另建 workflow 或在 release.yml 内加一个部署 job —— `wrangler deploy --env production` + `wrangler secret put`（`STATS_TOKEN` / 上报 token）。

---

## 4. P2：flywheel 云端看板

- `site/` 新增看板页（VitePress 自定义页），运行时 fetch `GET /v1/stats`
- 展示：来源权重分布（mcp:3 / cli:2 / ci:2 / eval:1）、高频违规规则 Top N、周趋势、kind='prompt' 场景分布
- 鉴权：看板页由作者手动携带 token 访问（或部署为 private Pages 分支），不公开原始数据
- `/v1/stats` 返回形状（driver.queryStats 实现）：

```jsonc
{
  "range": { "from": "2026-08-01", "to": "2026-08-28" },
  "runsBySource": { "mcp": 120, "cli": 45, "ci": 80, "eval": 200 },
  "passRate": { "overall": 0.62, "bySource": { "mcp": 0.7, "eval": 0.55 } },
  "topRules": [ { "rule": "af-mobile/no-inline-style", "count": 310 } ],
  "sceneDist": { "auth-form": 22, "order-list": 15 }
}
```

---

## 5. 执行计划与验证闸门

| 阶段 | 内容 | 交付物 | 验证闸门 |
|---|---|---|---|
| P0 | release.yml + NPM_TOKEN 配置 + provenance + DECISIONS 登记 | push main 后全自动发布 | 下一个真实版本发布走通；故意缺 changeset 时 PR 闸门阻断（复用 changeset:check） |
| P1a | Cloudflare Pages PR Preview | PR 即得预览 URL | 任一 PR 开出 preview、关闭后入口仍可访问 |
| P1b | server/ workspace + Worker + D1 + opt-in 上报 | 遥测可云端入库 | vitest（validate + d1 mock 驱动）；`wrangler dev` 手工 POST 200/422/413 用例；**§3.8 门禁改造四项全部完成**；ESLint 全绿 |
| P2 | 看板 + 发布后 smoke + Supabase 驱动（条件触发） | 平台闭环 | 看板渲染 `/v1/stats` 真实数据 |

各阶段独立可交付；P0 不依赖任何后续决策，可先行。

## 6. 风险登记

| 风险 | 缓解 |
|---|---|
| overrides `file:.` 在 CI npm 漂移（历史事故） | release.yml 锁 npm@11.9.0，同 ci.yml |
| changesets 部分发布失败（非原子） | §1.5 手工补发预案；publish 日志逐包检查 |
| D1 免费额度（5GB/25GB 行）超限 | 当前量级（工具遥测，opt-in）远低；P2 加 rollup 表后原表可归档清理 |
| Worker 被滥用刷写 | 上报令牌 + 限流 + 单批上限；D1 写入量告警（Cloudflare 原生） |
| 隐私回归（未来规则消息嵌代码） | 服务端入库前二次 sanitizeMessage；ci.yml 遥测红线注释保持 |
