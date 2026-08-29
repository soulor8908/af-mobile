# 平台化设计文档评审（2026-08-29）

> 评审对象：`docs/design/` 下三份未提交新增文档
> 方法：逐条对照仓库实文件核查（非推测），引用格式为 `文件:行号`
> 结论用途：先决断冲突，再动手实施；本文档不替代任何一份设计文档

| 文档 | 时间 | 行数 | 定位 |
|---|---|---|---|
| `docs/design/consumer-delivery-design.md` | 08-29 06:21 | 143 | 消费端交付链（G1） |
| `docs/design/platform-backend-design.md` | 08-29 03:48 | 388 | 库仓平台化基建（发布自动化 / PR Preview / 平台后台） |
| `docs/design/production-platform-design.md` | 08-28 21:58 | 598 | 业务产品全栈平台（CF Workers + D1） |

---

## 0. 结论先行

### 决断结果（2026-08-29）

| 原阻塞项 | 决断 | 登记 |
|---|---|---|
| A2（starter 改造方向） | **业务产品走 CF 全栈；`starter/` 维持 Supabase 默认 + 补 `--target cloudflare` 变体，双后端并存** | **D-008** |
| A4（交付链怎么走） | **配件（与后端无关）直做；`deploy`/`doctor` 做成可插拔，Supabase 与 CF 各一套检查项** | **D-009** |
| C1（国内可达性） | ✅ **已决（D-010）**：阶段 1 全走 CF，阶段 2 按实测转香港 self-hosted，阶段 3 流量足够大转国内（需备案）。判据 §7.1，防锁定约束 §7.3 | **D-010** |

### 修订状态（2026-08-29）

以下各组问题已按决断结果修订落盘，本文档保留原始评审记录供追溯：

- **B / C 组**（consumer-delivery-design.md）：全部修订，含双后端可插拔改造、§7 可达性评估新增
- **D / E 组**（platform-backend-design.md）：全部修订，含新增 §3.8 门禁改造 checklist
- **A 组**（三份文档冲突）：**A1 / A2 / A3 / A4 全部修订完毕**

### 剩余待决

1. **阶段 2 迁移** —— 触发时新开条目登记（含实测数据与迁移范围），回链 D-010。
2. **PR Preview 平台选型** —— 标为待登记 **D-011**（`platform-backend-design.md` §2.2）。
3. **adapters 处置** —— `production-platform-design.md` §9.2 三选项（倾向 A 保留），尚未登记。

### 阶段 1 的隐含义务

D-010 把「平台选型」推迟了，但推迟不等于免费 —— 它换来四条**防锁定约束**（`consumer-delivery-design.md` §7.3）：不依赖 CF 专有能力、数据走 adapter、部署走 provider 抽象、配置不写死平台。

这四条是阶段 1 编码时的硬约束。**违反任何一条，D-010 的迁移路径就失效**，届时要重写应用而不是换 provider。

---

---

## A. 三份文档互相冲突

| # | 冲突点 | 出处 | 处置建议 |
|---|---|---|---|
| A1 | 业务仓独立 vs 塞进库仓：production §3.1「推荐业务产品单独建仓 `aiflow-app`」，§11 分叉 1 仍标"待确认" | `production-platform-design.md:96`、`:591` | ✅ **已决：混仓**（D-007 / D-008）。§3.1 论述保留为备选论据并标注"不得据此实施"，§3.2 补混仓视图说明（workflows 与 migrations 重名需改名），§8 与 §11-1 同步标记。中途曾误判为"D-007 未覆盖业务仓"，已由用户纠正回链 |
| A2 | **starter 改造方向相反**：production §3.3 要求删 `src/backend.js`、`scripts/db-push.mjs`、`supabase/schema.sql`、`vercel.json` 改 CF 全栈；consumer P0 要求保留 Supabase 体系，只补 manifest/图标/meta | `production-platform-design.md:130` vs `consumer-delivery-design.md:48` | ✅ **已决（D-008）**：业务产品 CF 全栈；starter 双 target 并存。§3.3 已加作用域注记（"删除"读作"该 target 不生成"） |
| A3 | production §9.3 称「release.yml 现在靠手工 `npm run release`」 | `production-platform-design.md:573` | ✅ **已修订**：release.yml 已落地，本条作废 |
| A4 | preview 命名/归属混乱：production §6.2 `preview.yml`（业务仓）、platform §2 P1a（库仓 CF Pages）、现有 `docs.yml`（GitHub Pages） | `production-platform-design.md:421`、`platform-backend-design.md:164` | ✅ **已修订**：库仓新建独立 `preview.yml`（不改 docs.yml），并注明与业务仓 preview 是两个仓库的两条流水线，勿合并 |

---

## B. consumer-delivery-design.md — 事实错误

| # | 文档表述 | 实际情况 | 修正 |
|---|---|---|---|
| B1 | 「部署配置：`.cursorrules` 仅一句 … ❌ **零配置**」（`:19`） | starter 已有 `vercel.json`（SPA rewrite）、`public/_headers`（CSP `connect-src 'self' https://*.supabase.co`）、`public/_redirects`（`/* /index.html 200`）；`.trae/rules.md:28` 已声明「部署：Cloudflare Pages 默认（`dist/` 纯静态，`_redirects`/`_headers` 已预置）」 | 缺口不是"配置"，是**平台绑定 + 一键命令 + 环境变量**。改写该行，并在 §0 表格补三行既有资产 |
| B2 | 「schema.sql 是否含 RLS 策略**待验证**」（`:30`）、风险登记列为风险（`:140`） | `starter/supabase/schema.sql:13` `alter table products enable row level security`；`:16` `create policy "products are readable by everyone"` | 已验证通过。风险登记第 1 行删除或改为"已验证" |
| B3 | 模板用 `{{APP_NAME}}` / `{{THEME_COLOR}}` / `{{APP_DESCRIPTION}}` 占位符（`:52`–`:77`） | `scripts/create-app.mjs` 用的是 JS 模板字符串插值（`:38` `"name": "${name}"`、`:67` `<title>${name}</title>`），**不存在占位符替换引擎** | 伪代码改为 `${name}` 真实机制；并定义 `APP_DESCRIPTION` / `THEME_COLOR` 的输入来源（CLI 参数 / 交互询问 / 默认值） |

---

## C. consumer-delivery-design.md — 设计漏洞

| # | 漏洞 | 建议 |
|---|---|---|
| C1 | **国内可达性零评估（最大盲点）**：文档目标是"用户手机浏览器打开真实可用的应用"，中文项目默认国内用户，`*.pages.dev` 与 Supabase 在国内访问不稳定且不可备案 | 新增 §7「可达性判定与备选」：目标用户判定 → 国内场景改走 EdgeOne Pages / 腾讯云 COS+CDN / 阿里云 OSS（代价：需备案）；风险登记补一行 |
| C2 | **部署端环境变量双重配置**：CF Pages 的构建环境变量需在 CF 控制台单独配置，`VITE_SUPABASE_*` 缺失 = 线上白屏。文档完全未提 | §3.2 与 `DEPLOY.md` 补「本地 `.env` 与部署端环境变量两处配置」；`doctor` 增加部署端变量存在性提示 |
| C3 | **密钥前缀红线缺失**：CF API token 若写成 `VITE_CLOUDFLARE_API_TOKEN` 会打进前端 bundle 直接泄露 | 写死规范：交付类密钥**禁止 `VITE_` 前缀**，落入 `.env.example` 注释、`.cursorrules`、`.trae/rules.md` |
| C4 | 图标生成可行性未论证：文档称"脚手架生成占位图（192/512）"，但 iOS `apple-touch-icon` 不支持 SVG，必须 PNG；而 starter 模板不该引入 sharp/canvas 依赖 | 改为：随包分发预生成的中性占位 PNG（同步进 `package.json` files 白名单），或 base64 内联进 `create-app.mjs` |
| C5 | 未提 `favicon.ico` —— 浏览器仍会请求，微信/分享场景亦需要 | manifest 与 index.html 配件清单补 favicon |
| C6 | 验证闸门「Lighthouse 可安装性检查通过」不可执行：项目门禁体系（AGENTS.md §1）全是 npm 脚本，CI 无 Lighthouse | 改为可脚本断言：build 后校验 `dist/index.html` 含 manifest link、且 `dist/manifest.webmanifest` 与图标文件存在。可并入 `demo:check` 或新增 `scaffold:check` |
| C7 | `scripts/create-app.mjs` 在 `package.json` files 白名单内 = **发布产物**，改动必须带 changeset，否则 CI `changeset:check` 阻断 | 执行计划 P0 行补「+ changeset」 |
| C8 | 既有技术债未处理：`vercel.json` 与 `public/_redirects` 两套 SPA fallback 并存 | P0 顺带清理，或在文档中写明并存原因与优先级 |
| C9 | `doctor` 只覆盖部署前状态，线上白屏/404 无人感知（环节 7 已列为非目标） | 可接受，但 `doctor` 的"线上可达 HEAD 200"应升级为"HTML 含预期挂载点 + 无 JS 报错"级别的轻量 smoke |

---

## D. platform-backend-design.md — 已过时

| # | 文档表述 | 实际情况 |
|---|---|---|
| D1 | §0「**无 release.yml**：npm publish 全靠本地手动」（`:15`）、§1.6「`.github/workflows/release.yml` # 新增」（`:157`） | **已落地**：`.github/workflows/release.yml` 存在且实现与 §1.2 设计一致（changesets 单 job 两段式、`--provenance`、Node 24 + npm 11.9.0 锁版、registry smoke 轮询）。应改为「已实施，待首次真实发版验证」 |
| D2 | §1.6「`docs/DECISIONS.md` 登记」（`:159`） | **已登记**：D-007（`docs/DECISIONS.md:98`，2026-08-28）覆盖发布自动化 + 平台后台定位 + monorepo `server/`。但 **D-007 未覆盖 P1a PR Preview 选型与消费端交付链** → 需新开 D-008 / D-009 |

---

## E. platform-backend-design.md — 设计漏洞

| # | 漏洞 | 说明与建议 |
|---|---|---|
| E1 | **P1a 实现自相矛盾**：§2.2 说「`docs.yml` 增加 `pull_request` 触发」，但部署命令是 `wrangler pages deploy`（CF Pages） | `docs.yml` 是 GitHub Pages 流程（`permissions: pages: write` + pages artifact）。当前写法跑不起来。二选一：新建 `preview.yml`（CF Pages 路径），或改 `docs.yml` 走 GH Pages 子路径（§2.1 已否掉，需重开论证） |
| E2 | **runs 表缺 `scene` 字段**：§3.3 事件契约含 `scene`，§3.5 建表无该列，但 §4 看板要 `sceneDist` | prompt 类事件的 scene 无处存储 → P2 看板功能无数据支撑。补 `scene TEXT` + 索引，或明确 scene 的落库位置 |
| E3 | **vitest 覆盖不到 server 测试**：§3.2 规划 `server/src/test/`，但 `vitest.config.js:20` `include: ['test/**/*.test.js']` | 测试不会被执行。改为 `server/test/` 并扩展 include，或显式加 `server/**/*.test.js` |
| E4 | **新增 workspace 会破坏现有门禁**（文档 §5 只说"vitest + ESLint 全绿"，未提门禁改造） | 需同步四处：① AGENTS.md §1 ESLint 命令列表加 `server/` ② `eslint.config.js` 加 server 配置段（现 :48–:110 逐目录配置） ③ vitest include（见 E3） ④ `.changeset/config.json` 加 `privatePackages: { version: false, tag: false }`，否则 private 的 `@af-mobile/server` 会被无意义 bump。另：根 `overrides: { "@af-mobile/ui": "file:." }` 加 workspace 后需回归 `npm ci` |
| E5 | **server 缺部署流水线**：文档只写 `wrangler.toml`（`:315`），未写谁部署 Worker | `release.yml` 只发 npm 包。需新增部署步骤或独立 workflow + `wrangler secret put`，并说明与 release 流程的关系 |
| E6 | 限流用 D1 计数（`:335`）→ 每次上报读写 D1，写放大且消耗免费额度；Workers 无全局内存 | 改用 Cloudflare Rate Limiting binding 或 KV 计数 |
| E7 | 缺数据留存策略：`file` 路径 / `tool` / `rule` 落库，无 retention、删除、导出机制 | 隐私红线只覆盖脱敏，未覆盖留存。建议 180 天后 rollup 聚合、删明细 |
| E8 | 上报端点硬编码：MCP/CLI 是用户本地安装的 npm 包 | 端点写死 = 无法自托管/自建。支持 `AF_MOBILE_TELEMETRY_URL` env 覆盖，并在文档中写明默认端点域名 |
| E9 | 环境隔离缺失：dev/prod 未分 D1 | `production-platform-design.md:586` 第 5 条风险「preview 连了生产库」同样适用于遥测库。补 `--env dev/prod` 与两套 database_id |
| E10 | 次要：stats Bearer token 在浏览器端 fetch 即暴露 | 短期 token 或 Cloudflare Access 保护看板页，不放 URL query |

---

## 附录 1：建议补充的章节

| 补充项 | 落在哪份文档 | 目的 |
|---|---|---|
| **平台基建全景图**（一页）：库仓交付链 / 平台后台 / 业务产品仓 三者边界与依赖 | 新增总览，或 `platform-backend-design.md` §0 | 消灭 A 组冲突 |
| **国内可达性评估** | `consumer-delivery-design.md` 新增 §7 | C1 |
| **新增 workspace 的门禁改造 checklist** | `platform-backend-design.md` 新增 §3.8 | E4 |
| **数据留存与端点配置** | `platform-backend-design.md` §3.7 | E7 / E8 |
| **starter `--target` 变体方案**（若 A2 选"两者都要"） | `consumer-delivery-design.md` §3.1 | A2 |

## 附录 2：DECISIONS.md 待登记项

| 编号 | 待决事项 | 状态 |
|---|---|---|
| D-008 | 业务产品 CF 全栈 + starter 双 target 变体 | ✅ **已登记**（`docs/DECISIONS.md`） |
| D-009 | 消费端交付链适配双后端（配件直做 / deploy-doctor 可插拔 / 部署平台待可达性评估） | ✅ **已登记** |
| D-010 | 部署平台三阶段演进：CF → 香港 → 国内（按流量触发） | ✅ **已登记** |
| D-011 | PR Preview 平台：CF Pages vs GitHub Pages 子路径 | 待登记（`platform-backend-design.md` §2.2 已修正实现路径，选型结论待固化） |
| 待开 | 国内可达性评估结论 → 锁定部署平台，回链 D-009 | 待评估 |
| 待开 | adapters 处置（`production-platform-design.md:561` 三选项，倾向 A 保留） | 待登记 |

---

## 修订后的开工顺序

| 顺序 | 事项 | 阻塞依赖 |
|---|---|---|
| 1 | consumer P0：脚手架配件（manifest / 图标 / favicon / meta）+ DEPLOY.md + 可脚本化断言 + changeset | 无，可立即开工 |
| 2 | 国内可达性评估（consumer §7 三张待测表） | 无，与 1 并行 |
| 3 | platform P1b：server/ workspace（**先做 §3.8 门禁改造四项**） | 无 |
| 4 | consumer P1：`deploy` / `doctor` 可插拔实现（`cloudflare` provider 先做，`self-hosted` / `cn` 留接口） | 无（D-010 已解除阻塞） |
| 5 | production：`--target cloudflare` 变体 → 业务目录消费（混仓，D-007/D-008 已决） | 需先定库仓内目录名与 workflows 改名方案（见 production §3.2 注记） |

---

## 附：原始评审记录（修订前的判断，保留追溯）

以下各组为 2026-08-29 首轮评审的原文记录，多数已按上文决断结果修订落盘。保留用于将来的复盘 —— 看出哪些判断成立、哪些在决断后被推翻（例如 A1 的「已被 D-007 决掉」即为误判）。
