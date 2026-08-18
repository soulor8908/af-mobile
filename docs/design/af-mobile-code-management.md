# @af-mobile 生态代码管理方案

> **决策目标**：确定 @af-mobile/chat 与现有 @af-mobile/ui 的代码仓库关系  
> **日期**：2026-08-14  
> **推荐方案**：现有仓库渐进改造为 Monorepo（方案 A）

---

## 一、三种方案对比

### 方案 A：现有仓库改造为 Monorepo（推荐 ✅）

**策略**：在 `soulor8908/af-mobile` 仓库中建立 `packages/` 目录，用 npm workspaces 管理多个子包。

```
af-mobile/ (GitHub 仓库)
├── packages/
│   ├── ui/                    → @af-mobile/ui (v1.3.2)
│   │   ├── src/
│   │   ├── package.json
│   │   └── README.md
│   ├── chat/                  → @af-mobile/chat (新增)
│   │   ├── core/              # 框架无关的业务逻辑
│   │   ├── adapters/          # React/Vue/原生适配层
│   │   ├── package.json
│   │   └── README.md
│   ├── eslint-plugin/         → @af-mobile/eslint-plugin (从根迁移)
│   │   ├── rules/
│   │   └── package.json
│   ├── vue/                   → @af-mobile/ui-vue
│   └── react/                 → @af-mobile/ui-react
├── docs/                      # 统一文档
├── scripts/                   # 根级构建脚本
│   ├── build-all.mjs          # 批量构建
│   ├── publish-all.mjs        # 批量发布
│   └── version-bump.mjs       # 版本升级
├── prompt/                    # 共享 Prompt 工程
├── eval/                      # 共享 Eval 飞轮
├── .github/
│   └── workflows/
│       ├── ci.yml             # 统一 CI
│       └── publish.yml        # 统一发布
├── package.json               # Root workspaces 配置
└── pnpm-workspace.yaml        # 如果用 pnpm
```

**优点**：
- ✅ **利用现有基础设施**：构建流程、CI、文档、ESLint 规则、eval 飞轮无需重建
- ✅ **原子化提交**：一个 PR 可以同时修改 ui + chat + eslint-plugin，保持同步
- ✅ **本地开发便利**：`pnpm install` 一次安装全部依赖，本地 link 无需 publish
- ✅ **代码共享容易**：共享 types、utils、test fixtures
- ✅ **历史连续性**：保留现有仓库的 stars、issues、PR 历史

**缺点**：
- ⚠️ 仓库名 `af-mobile` 与 monorepo 定位不符（可接受）
- ⚠️ 仓库体积会逐渐增大（可接受，代码 < 1MB）

**适用场景**：
- 子项目之间有紧密依赖关系（chat 依赖 ui 的组件）
- 团队规模小（1-3 人），不需要严格的权限隔离
- 希望快速迭代，减少仓库管理成本

---

### 方案 B：新建独立仓库（Polyrepo）

**策略**：新建 `soulor8908/af-mobile-chat` 仓库，独立管理。

```
soulor8908/af-mobile/        → @af-mobile/ui
soulor8908/af-mobile-chat/   → @af-mobile/chat (新建)
soulor8908/af-mobile-eslint/ → @af-mobile/eslint-plugin (迁移)
```

**优点**：
- ✅ 仓库职责清晰，一个仓库 = 一个产品
- ✅ 独立版本控制，发布互不影响
- ✅ 权限隔离（可以给 chat 仓库单独加贡献者）

**缺点**：
- ❌ **跨仓库开发痛苦**：修改 ui 的 API 后，需要 publish 到 npm，再在 chat 仓库 install 才能验证
- ❌ **CI 重复建设**：每个仓库都要配一套 lint/test/build/publish
- ❌ **原子提交丢失**：ui 和 chat 的联动修改需要两个 PR，容易不同步
- ❌ **本地调试困难**：需要 `npm link` 或 yalc，配置复杂

**适用场景**：
- 子项目之间无依赖或依赖极弱
- 团队规模大，需要严格的代码所有权隔离
- 子项目由不同团队维护，发布节奏完全不同

**当前不适用**：chat 强依赖 ui 的组件，需要频繁联动修改。

---

### 方案 C：新建组织级 Monorepo（长期）

**策略**：新建 `soulor8908/af-mobile` 仓库，把 ui、chat、eslint-plugin 全部迁移进去。

```
soulor8908/af-mobile/ (新仓库)
├── packages/
│   ├── ui/
│   ├── chat/
│   ├── eslint-plugin/
│   ├── vue/
│   └── react/
```

**优点**：
- ✅ 仓库名与品牌一致
- ✅ 干净的起点，无历史包袱

**缺点**：
- ❌ **迁移成本高**：需要迁移全部 issues、PR、stars、CI 配置
- ❌ **链接失效**：README 中的链接、外部引用需要更新
- ❌ **git 历史丢失**：或需要复杂的 git subtree 迁移

**适用场景**：
- 项目已经成熟，品牌升级
- 有专门的运维资源处理迁移

**建议**：当前阶段不做，等 v2.0 发布后再考虑品牌升级迁移。

---

## 二、推荐方案：方案 A（渐进改造）

### 2.1 改造步骤

#### Step 1：目录结构调整（1 天）

```bash
# 当前结构
af-mobile/
├── src/           # @af-mobile/ui 源码
├── vue/           # Vue 适配层
├── react/         # React 适配层
├── eslint-plugin-af-mobile/  # ESLint 插件
├── prompt/
├── eval/
├── scripts/
├── package.json   # 根包 = @af-mobile/ui
└── ...

# 目标结构
af-mobile/
├── packages/
│   ├── ui/                    # 从 src/ + package.json 迁移
│   │   ├── src/
│   │   ├── vue/
│   │   ├── react/
│   │   └── package.json       # name: @af-mobile/ui
│   ├── chat/                  # 新增
│   │   ├── core/
│   │   ├── adapters/
│   │   └── package.json       # name: @af-mobile/chat
│   └── eslint-plugin/         # 从 eslint-plugin-af-mobile/ 迁移
│       ├── rules/
│       └── package.json       # name: @af-mobile/eslint-plugin
├── docs/
├── prompt/
├── eval/
├── scripts/
├── package.json               # Root: workspaces + 统一脚本
└── pnpm-workspace.yaml        # pnpm workspaces 配置
```

#### Step 2：Root package.json 配置

```json
{
  "name": "@af-mobile/root",
  "private": true,
  "version": "0.0.0",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "install:all": "pnpm install",
    "build:all": "pnpm -r run build",
    "test:all": "pnpm -r run test",
    "lint:all": "pnpm -r run lint",
    "publish:all": "pnpm -r publish --access public",
    "changeset": "changeset",
    "version:packages": "changeset version",
    "release": "pnpm build:all && changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.0",
    "pnpm": "^9.0.0"
  }
}
```

#### Step 3：包间依赖配置

```json
// packages/chat/package.json
{
  "name": "@af-mobile/chat",
  "version": "0.1.0",
  "dependencies": {
    "@af-mobile/ui": "workspace:*"    // ← 本地 link，无需 publish
  },
  "peerDependencies": {
    "react": ">=18.0.0"              // ← 用户自带 React
  }
}
```

`workspace:*` 表示使用本地 monorepo 中的版本，开发时自动 link，发布时自动替换为实际版本号。

#### Step 4：统一构建脚本

```javascript
// scripts/build-all.mjs
import { execSync } from 'child_process';

const packages = ['ui', 'chat', 'eslint-plugin'];

for (const pkg of packages) {
  console.log(`Building @af-mobile/${pkg}...`);
  execSync('pnpm run build', {
    cwd: `packages/${pkg}`,
    stdio: 'inherit'
  });
}
```

#### Step 5：统一 CI 配置

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: pnpm test:all        # 测试全部包
      - run: pnpm lint:all        # 检查全部包
      - run: pnpm build:all       # 构建全部包
      - run: pnpm size:check      # 体积检查
```

---

### 2.2 版本管理策略

#### 策略：独立版本 + Changesets 自动化

每个包独立维护版本号，用 [Changesets](https://github.com/changesets/changesets) 管理发布流程。

```
packages/ui/package.json        → version: 1.3.2
packages/chat/package.json      → version: 0.1.0
packages/eslint-plugin/package.json → version: 0.5.0
```

**发布流程**：

```bash
# 1. 开发完成后，添加 changeset
pnpm changeset
# → 选择修改的包（ui / chat / eslint-plugin）
# → 选择版本类型（patch / minor / major）
# → 填写变更说明

# 2. 提交 changeset
git add .changeset/*.md
git commit -m "chore: add changeset for chat feature"

# 3. 版本升级（自动更新 package.json + 生成 CHANGELOG）
pnpm version:packages

# 4. 发布到 npm
pnpm release
# → 自动 build:all
# → 自动 publish 有 changeset 的包
```

**依赖关系处理**：
- 如果 `ui` 发 v1.4.0，`chat` 依赖 `ui@workspace:*`，发布时自动替换为 `ui@^1.4.0`
- 如果 `chat` 的修改不影响 `ui`，只发布 `chat` 即可

---

### 2.3 本地开发工作流

```bash
# 克隆仓库
git clone https://github.com/soulor8908/af-mobile.git
cd af-mobile

# 安装全部依赖（包括所有 packages 的依赖）
pnpm install

# 开发 ui 包
cd packages/ui
pnpm run dev          # 启动 ui 的 demo 站点

# 开发 chat 包（自动 link 本地 ui）
cd packages/chat
pnpm run dev          # 启动 chat 的测试页面

# 在 accounting-ai 中测试本地 chat
# accounting-ai/package.json:
#   "@af-mobile/chat": "file:../af-mobile/packages/chat"
cd ../accounting-ai
pnpm install
pnpm run dev          # 使用本地 chat 包
```

---

### 2.4 代码共享策略

#### 共享层设计

```
packages/
├── ui/              # 纯 UI，不依赖 chat
├── chat/            # 依赖 ui，不依赖业务逻辑
├── eslint-plugin/   # 独立，不依赖 ui/chat
└── shared/          # 可选：共享类型和工具（如果重复代码多）
    ├── types/       # 共享 TypeScript 类型
    └── utils/       # 共享工具函数
```

**原则**：
- `ui` 不依赖 `chat`（UI 组件库保持纯净）
- `chat` 可以依赖 `ui`（使用 UI 组件渲染）
- `eslint-plugin` 独立（可以被任何项目使用）
- 如果 `ui` 和 `chat` 有大量重复类型（如 Message、Session），再考虑提取 `shared` 包

---

## 三、Git 分支策略

### 3.1 分支模型

```
main                    # 稳定分支，对应最新发布版本
  ├── feature/chat-core     # chat 核心开发
  ├── feature/chat-react    # chat React 适配层
  ├── feature/ui-calendar   # ui 新增 calendar 组件
  └── fix/router-memory     # 修复 router 内存泄漏
```

### 3.2 PR 规范

```markdown
# PR 标题格式
[ui] fix: af-dialog 滚动锁失效
[chat] feat: 实现会话管理核心
[eslint] chore: 导出剩余 9 条规则

# PR 描述模板
## 修改范围
- [ ] ui
- [ ] chat
- [ ] eslint-plugin

## 变更说明
...

## 测试
- [ ] 单元测试通过
- [ ] E2E 测试通过
- [ ] 体积检查通过
```

---

## 四、发布策略

### 4.1 npm 组织

```
@af-mobile/ui              # 已发布
@af-mobile/chat            # 待发布
@af-mobile/eslint-plugin   # 待迁移发布
@af-mobile/ui-vue          # 已发布（workspace）
@af-mobile/ui-react        # 已发布（workspace）
```

### 4.2 发布权限

```
npm owner ls @af-mobile/ui
# 确保你的 npm 账号有 publish 权限

# 首次发布 chat
npm publish --access public
```

### 4.3 版本号策略

| 包 | 当前版本 | 发布节奏 | 说明 |
|----|----------|----------|------|
| ui | 1.3.2 | 每 2-4 周 | 组件新增/修复 |
| chat | 0.1.0 | 每 1-2 周 | 快速迭代，pre-1.0 |
| eslint-plugin | 0.5.0 | 随 ui 发布 | 规则同步 |

**pre-1.0 策略**：
- `chat` 在 v1.0 之前，API 可能 breaking change
- 版本号 `0.x.y`，minor 升级可能不兼容
- 在 README 中明确标注 "API 不稳定"

---

## 五、实施检查清单

### Step 1：仓库改造（1 天）

- [ ] 创建 `packages/` 目录
- [ ] 将现有代码移动到 `packages/ui/`
- [ ] 创建 `packages/chat/` 骨架
- [ ] 迁移 `eslint-plugin-af-mobile/` 到 `packages/eslint-plugin/`
- [ ] 更新 Root `package.json`（workspaces + 统一脚本）
- [ ] 添加 `pnpm-workspace.yaml`
- [ ] 更新 `.github/workflows/ci.yml`
- [ ] 验证 `pnpm install` 正常工作
- [ ] 验证 `pnpm build:all` 正常工作
- [ ] 验证 `pnpm test:all` 正常工作

### Step 2：chat 子项目初始化（2-3 天）

- [ ] 创建 `packages/chat/package.json`
- [ ] 创建 `packages/chat/core/` 目录结构
- [ ] 实现 `session.ts` 基础 API
- [ ] 实现 `message.ts` 基础 API
- [ ] 实现 `stream.ts` SSE 解析
- [ ] 实现 `tool.ts` 工具框架
- [ ] 实现 `adapters/react/useChat.ts`
- [ ] 编写单元测试
- [ ] 验证 `pnpm publish --dry-run` 正常

### Step 3：accounting-ai 接入验证（3-5 天）

- [ ] accounting-ai 安装 `@af-mobile/chat`
- [ ] 配置 chat 实例（工具注册、插件配置）
- [ ] 重写 ChatView UI（使用 @af-mobile/ui 组件）
- [ ] 功能回归测试
- [ ] 性能对比（旧版 vs 新版）

### Step 4：发布（1 天）

- [ ] 添加 changeset
- [ ] 执行 `pnpm version:packages`
- [ ] 执行 `pnpm release`
- [ ] 验证 npm 页面正常
- [ ] 更新 README 和文档

---

## 六、常见问题

### Q1：为什么不用 pnpm 而用 npm workspaces？

**A**：都可以。pnpm 的 `workspace:*` 和依赖去重更优秀，推荐用 pnpm。如果团队习惯 npm，npm workspaces v7+ 也够用。

### Q2：chat 的 React 适配层应该放在 chat 包还是单独包？

**A**：放在 `packages/chat/adapters/react/` 中，作为 chat 包的子模块导出：
```ts
import { useChat } from '@af-mobile/chat/react';
```
这样用户安装一个包即可，不需要额外安装 `@af-mobile/chat-react`。

### Q3：如果以后要做 Vue 适配层怎么办？

**A**：同样放在 `packages/chat/adapters/vue/`：
```ts
import { useChat } from '@af-mobile/chat/vue';
```

### Q4：ui 和 chat 的版本号需要同步吗？

**A**：不需要。独立版本管理。只有当 chat 依赖 ui 的新 API 时，才在 chat 的 package.json 中升级 ui 的版本依赖。

### Q5：仓库名 af-mobile 要不要改？

**A**：当前不改。等 v2.0 发布后再考虑重命名为 `af-mobile` 或创建 GitHub Organization。现在改会破坏现有链接和 SEO。

---

## 七、结论

| 决策 | 方案 |
|------|------|
| **仓库策略** | 现有仓库改造为 Monorepo（方案 A） |
| **包管理器** | pnpm（推荐）或 npm workspaces |
| **版本管理** | Changesets，独立版本号 |
| **目录结构** | `packages/ui/` + `packages/chat/` + `packages/eslint-plugin/` |
| **依赖关系** | chat → ui，ui 独立 |
| **发布节奏** | ui 每 2-4 周，chat 每 1-2 周 |
| **仓库名** | 当前不改，v2.0 后再考虑品牌升级 |

**立即行动**：
1. **今天**：在本地创建 `packages/` 目录，移动现有代码到 `packages/ui/`
2. **明天**：配置 pnpm workspaces，验证 build/test 正常
3. **本周**：创建 `packages/chat/` 骨架，初始化 package.json
4. **下周**：开始提取 ChatView 业务逻辑到 chat 包
