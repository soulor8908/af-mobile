---
name: "af-mobile-release-prep"
description: "Release pre-flight for @af-mobile/ui workspaces. Runs §1 gate self-checks, diffs local vs npm versions, finds unpublished changes per workspace, bumps versions, emits publish commands. Invoke when preparing a release or asking which packages to republish."
---

# af-mobile Release Prep —— 发布前准备与版本发布

把「我要发版本」变成「npm 上 3 个包都已更新」：**自检 → 修失败 → 查 npm → 算改动 → 升版本 → 给指令**。

## 适用范围

仓库 `d:\projects\aiflow-ui`（npm workspaces：`@af-mobile/ui` + `@af-mobile/eslint-plugin` + `create-af-mobile`）。AGENTS.md §1 的提交门禁是硬约束，跳过即返工。

## Phase 1 — 跑 §1 门禁（并行）

7 项 + 2 项补充，全部通过才能发布。先并行跑最耗时的两项（ESLint + vitest），再并行跑剩余 5 项独立的同步检查：

```
# 第一波（并行，耗时）
npx eslint src/ test/ scripts/ --max-warnings 0
npx vitest run

# 第二波（并行，秒级）
npm run size                  # 体积预算（CSS 6KB / 全量 20.4KB / charts 15KB）
npm run whitelist:check       # 三源白名单（源码 ↔ whitelist-v1.json ↔ prompt）
npm run types:check           # index.d.ts ↔ 源码组件数
npm run prompt:check          # system-prompt.md 提交态 vs 运行时
npm run aria:check            # aria-requirements.json ↔ wc-aria-required.js
# 补充
npm run tokens:check          # tokens.json ↔ tokens.css
```

## Phase 2 — 失败修复（按症状对症）

### 症状 A：`Cannot find package '@af-mobile/eslint-plugin'`

`mcp/eslint.config.mjs` 解析失败 + mcp/mcp-bundle 测试 6~7 个 FAIL。

**根因**：npm workspaces 的 junction target 拼写错。检查：

```powershell
Get-Item "d:\projects\aiflow-ui\node_modules\@af-mobile\eslint-plugin" | Select-Object FullName, LinkType, Target
Test-Path "d:\projects\aiflow-ui\eslint-plugin-aiflow"   # 错误 target
Test-Path "d:\projects\aiflow-ui\eslint-plugin-af-mobile" # 正确 target
```

**修复**：删 junction + 重跑 `npm install`（沙盒 cache 拒绝时见 Phase 5）。或手动 `New-Item -ItemType Junction` 重建。

### 症状 B：`pkg-assets 漂移闸门`（2 个 FAIL）

`mcp/assets/*` 或 `prompt/assets/*` 与 `src/*` 不一致。

**根因**：改了 `src/recipes.css` 等源码但没跑 `npm run pkg:assets`。

**修复**：

```bash
npm run pkg:assets  # 同步 mcp/assets/ + prompt/assets/ 各 6 项
```

### 症状 C：沙盒 cache 拒绝（EPERM / EEXIST on `_cacache/tmp/`）

`npm install` / `npm view` / `npm pack --dry-run` 全部在沙盒内失败，错误指向 `D:\nodejs\node_modules\npm\node_cache\_cacache\...`。

**根因**：agent 沙盒禁写 cache 目录，**非代码问题**。

**应对**：
- `npm view <pkg> version` → 改用 `WebFetch https://registry.npmjs.org/<pkg>`（公开 API，URL 编码 `/` 为 `%2f`）
- `npm install` workspace 链接重建 → 让用户在沙盒外跑，或手动 `New-Item -ItemType Junction`
- `npm pack --dry-run` / `npm publish` → **必须在沙盒外本地终端跑**

## Phase 3 — 版本对比（本地 vs npm latest）

3 个包的 npm registry 元数据用 WebFetch 拉，关注 `dist-tags.latest` 和对应版本的 `gitHead`：

| 包 | registry URL |
|---|---|
| @af-mobile/ui | `https://registry.npmjs.org/@af-mobile%2fui` |
| @af-mobile/eslint-plugin | `https://registry.npmjs.org/@af-mobile%2feslint-plugin` |
| create-af-mobile | `https://registry.npmjs.org/create-af-mobile` |

输出对比表：

| 包 | 本地版本 | npm latest | npm gitHead |
|---|---|---|---|
| ... | ... | ... | ... |

**关键**：本地版本 > npm latest 不一定意味着需要发版（可能版本号已升但内容没变）；本地版本 = npm latest 也不意味着无需发版（可能版本号忘升但有改动）。**必须以 Phase 4 的改动分析为准**。

## Phase 4 — 改动分析（per workspace，决定是否升版）

每个包的发布内容由 `package.json` 的 `files` 字段决定：

| 包 | files | 其他发布相关 |
|---|---|---|
| @af-mobile/ui | `src` + `dist` + `skills` + 3 个 scripts | `prepublishOnly` 自动跑 build + publish:check |
| @af-mobile/eslint-plugin | `index.js` + `rules/` + `utils/` | 无 prepublish |
| create-af-mobile | `bin.mjs` | dependencies 依赖主包 |

### 4.1 列出每个包自上次发布以来的 commit

```bash
# ui 主包：用 npm latest 的 gitHead
git log --oneline <ui-gitHead>..HEAD -- src/ dist/ skills/ scripts/skill-add.mjs scripts/create-app.mjs scripts/af-mobile.mjs

# eslint-plugin：用 npm latest 的 gitHead
git log --oneline <ep-gitHead>..HEAD -- eslint-plugin-af-mobile/index.js eslint-plugin-af-mobile/rules/ eslint-plugin-af-mobile/utils/ eslint-plugin-af-mobile/package.json

# create-af-mobile：用 npm latest 的 gitHead
git log --oneline <cam-gitHead>..HEAD -- create-af-mobile/bin.mjs create-af-mobile/package.json
```

### 4.2 警惕 git rename 全量新增误报

**陷阱**：项目/目录改名后，git 把"删旧目录 + 新增新目录"识别为全量新增（`25 files changed, 1881 insertions(+)`），看起来像规则全重写了。

**对策**：对每个 commit 用 `git show --stat <sha> -- <pkg-dir>` 看真实改动行数。`+6 / -3` 这种小改动是实质改动，`+1881 / -0` 全量新增大概率是 rename 噪音。

**目录改名对 npm 包内容无影响**：npm 只看 `files` 字段的相对路径，目录名变化不进入 tarball。判断是否需要发版只看**规则/源码的实际 diff**，不看 git stat 的总行数。

### 4.3 判定升版幅度

| 改动类型 | 升版 |
|---|---|
| 仅 description/keywords 元数据 | patch（可选，建议同步） |
| rules 实质改动 / 白名单增删 / 规则逻辑分支 | patch |
| 新增规则 / 新增组件导出 | minor |
| 破坏性 API 变更（删除导出/重命名） | major |

## Phase 5 — 升版本 + 发布指令

### 5.1 改 package.json（agent 内可执行）

- eslint-plugin：`version` 升 patch（如 2.0.1 → 2.0.2）
- create-af-mobile：`dependencies.@af-mobile/ui` 升到指向即将发布的新主包版本（如 `^1.4.1` → `^1.4.2`），版本号若本地已预升则不动

主包 `@af-mobile/ui` 的 version 通常在前序 feat commit 中已升，无需再改。

### 5.2 Commit + Push

```bash
git add eslint-plugin-af-mobile/package.json create-af-mobile/package.json
git commit -m "chore(release): 升级待发布包版本号"
git push origin main
```

### 5.3 给用户发布指令（沙盒外本地终端执行）

**铁律**：`npm publish` 会触发 cache 写 + prepublishOnly 调 `npm pack --dry-run`，沙盒内必失败，**必须让用户在本地终端跑**。

**发布顺序**（依赖关系）：

```powershell
# 0. 推 commit（若 agent 已推则跳过）
git push origin main

# 1. @af-mobile/ui 主包（先发，其他依赖它）
#    prepublishOnly 自动跑 npm run build && npm run publish:check
npm publish
# 若开 2FA：npm publish --otp=<code>

# 2. @af-mobile/eslint-plugin（独立）
cd eslint-plugin-af-mobile
npm publish --access public
cd ..

# 3. create-af-mobile（依赖主包 ^x.y.z）
cd create-af-mobile
npm publish --access public
cd ..
```

### 5.4 发布后验证

每包发完跑 `npm view <pkg> version` 确认 latest 已更新（沙盒内用 WebFetch）。

## Phase 6 — 偏差坦白（合规要求）

按 AGENTS.md §0 原则 5「坦白须定位」：自报偏差时必须给出**该偏差对应的规则文件路径与行号**或文档引用。

合规示例：
- `"未跑 §1 门禁第 4 步 whitelist:check（AGENTS.md §1）"`
- `"npm publish 受沙盒限制未执行（skill Phase 5.3）"`

禁止表演性坦白：拿不出引用 = 未根因定位 = 坦白不算数。

## 输出模板

```markdown
## 发布前准备结果

**版本**：x.y.z（工作区状态 + 本地 vs origin 同步情况）

### 自检结果（§1 全部通过）

| # | 检查项 | 状态 |
|---|---|---|
| 1 | ESLint（0 warning） | ✅/❌ |
| ... | ... | ... |

### 修复的 N 个问题
1. ...（定位 + 修复方式）
2. ...

### 待用户确认的收尾动作
- 未提交改动：...
- 未推送 commit：...
- 沙盒限制项：...
```

## 边界

- **仅 af-mobile/ui 仓库**：其他仓库的 §1 门禁命令不同，不要套用
- **不替用户发布**：`npm publish` 是破坏性公开操作，必须用户在沙盒外执行
- **不擅自调大预算**：size 失败时优化代码，不调 `package.json` 的 budget 字段（AGENTS.md §1）
- **不跳过自检**：不允许 `eslint-disable` / `vitest skip` / `whitelist 删检查` 绕过（AGENTS.md §1 失败处理）
