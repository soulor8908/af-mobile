# @af-mobile/mcp 与 @af-mobile/prompt 发布修复详细设计

> 版本：v1.0（2026-08-16）
> 背景：包审计发现两个包从未发布（registry 404），且以当前形态发布即运行时损坏。

---

## 1. 问题陈述

### 1.1 现状依赖图（→ = 运行时 import / 文件读取）

```
@af-mobile/mcp（files: 仅 index.mjs）
├── @modelcontextprotocol/sdk        ✓ 已声明
├── ../eval/telemetry.mjs            ✗ 包外（file: 越界，发布后 ENOENT）
├── ../scripts/build-prompt.mjs      ✗ 包外
├── ../scripts/ai-fix.mjs            ✗ 包外（且依赖 eslint + 仓库 eslint.config.js）
├── ../scripts/generate.mjs          ✗ 包外
├── ../eval/flywheel.mjs             ✗ 包外
└── ROOT/prompt/system-prompt.md     ✗ 包外资产

@af-mobile/prompt（files: index.mjs, models/, template）
└── ../scripts/build-prompt.mjs      ✗ 包外，且其读取：
    ├── eslint-plugin-af-mobile/utils/whitelist-v1.json
    ├── src/recipes.css / src/atomic.css
    ├── prompt/system-prompt.template.md
    └── prompt/models/
```

### 1.2 根因

两个包是**薄入口 + 仓库源码依赖**形态，发布时 npm 只打包 `files` 白名单内的文件——所有跨包导入与仓库资产读取在安装端必然落空。

### 1.3 深层约束（决定方案形态）

| 约束 | 来源 | 含义 |
|---|---|---|
| 单源不漂移 | prompt/index.mjs 注释"避免双份代码漂移" | 不能复制 scripts/ 逻辑到包内 |
| 资产有同步闸门文化 | 白名单三源同步（whitelist:check） | 资产快照必须有漂移检测 |
| `runEslint` 依赖 `cwd: ROOT` 的仓库 flat config | ai-fix.mjs L45 | 发布端没有该 config，需可注入 |
| MCP 检测对象是消费端代码 | 根配置对 `.cache/**` 应用 AI_RULES | 内嵌配置应为消费端规则集（与现行为等价） |
| 遥测属项目级数据 | AGENTS §5.3"不出本机" | 发布端落盘点应是用户项目 cwd，不是包目录 |

---

## 2. 方案总览

**「源码单源 + 环境感知资产解析 + esbuild 打包快照 + 资产同步闸门」** 四件套：

```
开发态（仓库内）                        发布态（npm 安装后）
scripts/*.mjs, eval/*.mjs  ──esbuild──▶  @af-mobile/mcp/dist/index.mjs
        │                                  ├── assets/（快照：whitelist/css/prompt/models）
        ├─ resolveAsset() 双候选            ├── eslint.config.mjs（内嵌消费端规则）
        │   ① 仓库布局（开发优先）           └── deps: sdk + @af-mobile/eslint-plugin
        │   ② <pkg>/assets/（发布兜底）               peer: eslint
        │
        └─ scripts/build-prompt.mjs ─esbuild─▶ @af-mobile/prompt/dist/index.mjs
                                              └── assets/（同一份快照）
```

核心原则：
1. **零文件搬迁**：所有逻辑留在 scripts/、eval/（单一真相源），发布靠打包快照，不复制源码。
2. **同一份逻辑两种环境**：`resolveAsset()` 先试仓库布局（开发态命中），再试包内 `assets/`（发布态命中）。
3. **资产快照 + 闸门**：`sync-pkg-assets.mjs` 从源资产同步到两个包的 `assets/`，vitest 漂移测试进 CI。

---

## 3. 详细设计

### 3.1 资产解析器（新增 `scripts/resolve-asset.mjs`）

```js
resolveAsset(repoRel) → 绝对路径
候选（取首个存在者；全 miss 返回候选① 保持原报错行为）：
  ① join(SELF/../, repoRel)        // 开发态：scripts/ → 仓库根
  ② join(SELF/../, assets, basename(repoRel))  // 发布态：<pkg>/dist → <pkg>/assets
```

- `SELF_DIR` 由 `import.meta.url` 推导；esbuild 打包后指向 `dist/index.mjs`，② 自动落到 `<pkg>/assets/<basename>`。
- 嵌套路径取 basename（`eslint-plugin-af-mobile/utils/whitelist-v1.json` → `assets/whitelist-v1.json`），同步脚本按平铺名落盘。
- `AFMOBILE_ASSETS_DIR` env 覆盖（测试隔离预留）。

### 3.2 五个资产的读取改造

| 调用方 | 原路径 | 改为 |
|---|---|---|
| build-prompt.mjs | TEMPLATE / WHITELIST / RECIPES_CSS / ATOMIC_CSS / MODEL_DIR 五个常量 | `resolveAsset('prompt/system-prompt.template.md')` 等 |
| ai-fix.mjs runAiFixLoop | `join(ROOT,'prompt/system-prompt.md')` | `resolveAsset('prompt/system-prompt.md')` |
| mcp/index.mjs getPrompt(full) | `join(ROOT,'prompt/system-prompt.md')` | 同上 |

仓库内解析结果与原值逐字节一致 → `npm run prompt:check` 快照不变。

### 3.3 runEslint 可注入化（ai-fix.mjs）

```js
runEslint(code, opts = {})
  opts.configFile → new ESLint({ overrideConfigFile: configFile })   // 发布端：内嵌配置
  opts.tmpDir     → snippet 落盘目录（默认 ROOT/.cache/ai-fix 不变）
  默认路径：new ESLint({ cwd: ROOT })                                // 开发态行为不变

runAiFixLoop(absFile, llmCaller, systemPromptOverride, eslintOpts)   // 第 4 参透传
generate(userPrompt, { outputPath, promptMode, eslintOpts })          // mcp generate_page 透传
```

### 3.4 遥测落盘点（eval/telemetry.mjs）

```js
telemetryDir() = AFMOBILE_TELEMETRY_DIR || join(process.cwd(), '.af-mobile')
```

- 开发态：CLI/测试 cwd 均为仓库根 → 行为不变（测试已有 env 隔离）。
- 发布态：落在用户项目 `.af-mobile/`（语义正确：遥测是项目级数据），不再污染 node_modules 包目录。

### 3.5 mcp 包改造

**内嵌 ESLint 配置（新增 `mcp/eslint.config.mjs`）**——消费端 AI_RULES，覆盖 `**/*.js`：
与根配置对 `.cache/**` 的规则集完全一致（check_compliance 检测的本来就是用户/AI 生成的页面代码），开发态行为等价，发布态自足。插件解析：`@af-mobile/eslint-plugin`（mcp 的 dependency，npm 安装即有；仓库内经 workspace 链接同样可解析）。

**index.mjs 调整**：
- `TMP_DIR` → `join(os.tmpdir(), 'af-mobile-mcp')`（不再写包内 `.cache/`）
- `checkCompliance` / `fixCode` / `generatePage` 传入 `eslintOpts = { configFile: <mcp>/eslint.config.mjs, tmpDir }`
- `getPrompt` full 模式读 `resolveAsset('prompt/system-prompt.md')`

**打包（新增 `scripts/build-mcp.mjs`）**：
```
entry: mcp/index.mjs → mcp/dist/index.mjs
bundle:esm / platform:node / target:node18
external: @modelcontextprotocol/sdk, eslint（运行时依赖/peer，不入包）
```
esbuild 关闭 code splitting 时内联动态 import（`await import('../scripts/ai-fix.mjs')` 等被打平），仓库源码零搬迁即自包含。

**package.json**：
```json
"bin": { "af-mobile-mcp": "./dist/index.mjs" },
"files": ["dist/index.mjs", "eslint.config.mjs", "assets/"],
"dependencies": { "@modelcontextprotocol/sdk": "*", "@af-mobile/eslint-plugin": "^2.0.0" },
"peerDependencies": { "eslint": ">=9.0.0" },
"prepublishOnly": "node ../scripts/sync-pkg-assets.mjs && node ../scripts/build-mcp.mjs"
```

### 3.6 prompt 包改造

- `prompt/index.mjs`：转出口改为 `./dist/index.mjs`（bundle 产物）。
- 打包（新增 `scripts/build-prompt-pkg.mjs`）：`scripts/build-prompt.mjs` → `prompt/dist/index.mjs`，零 external（纯 node 内建）。build-prompt 有 `isMain` 守卫，作为库入口安全。
- **package.json**：`files: ["index.mjs", "dist/", "assets/"]`，prepublishOnly 同模式。
- 仓库内无任何模块 import `prompt/index.mjs`（已核实），转出口变更零影响。

### 3.7 资产同步与漂移闸门

**`scripts/sync-pkg-assets.mjs`**（单一清单，双目标）：

| 源（仓库真相） | 快照名（平铺） |
|---|---|
| eslint-plugin-af-mobile/utils/whitelist-v1.json | whitelist-v1.json |
| src/recipes.css / src/atomic.css | recipes.css / atomic.css |
| prompt/system-prompt.md（构建快照） | system-prompt.md |
| prompt/system-prompt.template.md | system-prompt.template.md |
| prompt/models/（目录递归） | models/ |

目标：`mcp/assets/`、`prompt/assets/`（内容相同，两包独立自足，不互相依赖）。

**闸门**：`test/pkg-assets.test.js` 逐文件比对快照 ↔ 源；`test/mcp-bundle.test.js` 原位构建 bundle 后 import 冒烟（getPrompt 产出含 af-mobile 规范 / checkCompliance 能报 token-whitelist 违规）。两者随 `npm test` 进 CI。

**根配置**：ignores 追加 `mcp/dist/**`、`prompt/dist/**`；`.gitignore` 同步（dist 是发布时构建产物）；`assets/` 快照入库（闸门比对对象）。

### 3.8 npm scripts 与文档

- 根 package.json：`pkg:assets` / `build:mcp` / `build:prompt`
- AGENTS.md §5.3：MCP 注册方式补 npm 安装路径（`npx @af-mobile/mcp` 或 bin `af-mobile-mcp`），仓库运行方式保留。

---

## 4. 测试计划

| 用例 | 验证点 |
|---|---|
| test/pkg-assets.test.js（新） | 六项资产双目标快照与源逐字节一致（漂移闸门） |
| test/mcp-bundle.test.js（新） | bundle 原位构建 → import → getPrompt(tailored) 含规范文本；checkCompliance 检出白名单外 class；遥测走 env 隔离目录 |
| 既有 test/mcp.test.js | 开发态源码路径行为不回归 |
| 既有 test/build-prompt.test.js / prompt:check | resolveAsset 仓库候选与原路径等价（快照不变） |
| 既有 telemetry/flywheel/lint-flywheel 测试 | cwd 化落盘无回归 |
| publish:check + 三包 dry-run | files/bin/deps 完整 |

## 5. 发布顺序（依赖方向）

```
① @af-mobile/eslint-plugin@2.0.0（已修复 postcss 缺失）
② @af-mobile/ui@1.4.0（脚手架 + skill 分发）
③ @af-mobile/prompt@2.0.0（本设计）
④ @af-mobile/mcp@1.0.0（依赖 ①）
⑤ @af-mobile/adapters@0.1.0
全部 --access public（作用域包首发）
```

## 6. 非目标

- 不改 MCP 工具协议与五个工具的行为语义
- 不引入 workspace 重组 / 文件搬迁（保持仓库现状最小扰动）
- 不处理 starter 的 file: 依赖（属 create-af-mobile 模板范畴，已由 1.4.0 解决）
