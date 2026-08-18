# @af-mobile/prompt

af-mobile UI 的 **Prompt 即 API** 薄入口。将 af-mobile UI 分层设计体系（角色 / 白名单 / 组件 API / few-shot / 模型）编译成一份可用的 System Prompt。

## 安装

```bash
npm i @af-mobile/prompt
```

## 用法

```js
import { buildPrompt } from '@af-mobile/prompt';

// 按需求裁剪 few-shot；返回完整的 System Prompt 字符串（含白名单 + 组件 API + 精选 few-shot）
const system = buildPrompt({ userPrompt: '商品列表页带图，支持搜索' });
```

### CLI（MCP 不可达时的降级入口）

```bash
npx @af-mobile/prompt "商品列表页带图"        # 按需求裁剪，输出到 stdout
npx @af-mobile/prompt "需求" --full           # 全量 prompt
npx @af-mobile/prompt "需求" -o prompt.md     # 写入文件
```

与 MCP `get_prompt` 工具同构，适合未接入 MCP 的 Agent / 脚本环境。

## API

| 导出 | 说明 |
|---|---|
| `buildPrompt({ userPrompt, components, categories, projectRecipes, model, theme }?)` | 主入口；按 `userPrompt`（或显式 `categories`）裁剪 few-shot，返回 System Prompt 字符串 |
| `pickCategories` | 按需求关键词分派到相关 few-shot 类别 |
| `filterFewshots` | 裁剪最相关的 few-shot 样本 |
| `buildWhitelistSection` | 生成白名单约束段落 |
| `buildComponentTableSection` | 生成组件 API 段落 |
| `buildProjectExtensionSection` | 生成项目扩展段落 |
| `extractGroupsFromCss` | 从 CSS 提取 token 分组 |
| `extractProjectExtensions` | 提取项目扩展能力 |

> 该包是**纯函数 + 资产快照**，无外部运行时依赖，Tree Shaking 友好（ESM）。
> 若与 MCP 一起使用，推荐直接用 `@af-mobile/mcp` 的 `get_prompt` 工具，无需手动拼装。

## 资产

内部 assets（whitelist / CSS / template / models）在发布时快照进 `assets/`，读包内副本，不依赖编译时生成。