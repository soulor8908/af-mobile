# @af-mobile/mcp

AIFlow UI 的 Model Context Protocol (MCP) 服务器。为 AI Agent 提供**确定性的**提示词获取、合规检查、代码修正与飞轮报告能力——全部不调用 LLM，你用自己接入的模型生成代码即可。

- **零 LLM 配置**：无需 `AIFLOW_AI_API_URL` 等环境变量，检查类工具是纯确定性逻辑
- **调用方即 LLM**：你用自己的模型写代码，本包只提供 prompt / lint / 修正建议

## 工具

| 工具 | 作用 | 是否调用 LLM |
|---|---|---|
| `get_prompt` | 按需求裁剪生成 AIFlow UI 页面 System Prompt（含 few-shot 与组件 API） | 否 |
| `check_compliance` | 检查代码是否符合白名单与 ESLint 规则，返回违规 + 逐条修正建议 | 否 |
| `fix_code` | 为失败代码构造修正 prompt（错误 + 建议），由你的模型修正后再 `check_compliance` 验证 | 否 |
| `generate_page` | 端到端页面生成（未配置 LLM 时返回 prompt 对；配置 `AIFLOW_AI_API_URL` 才自动生成） | 可选 |
| `flywheel_report` | 数据飞轮分析报告：Top 违规规则、白名单候选、收敛度 | 否 |

## 安装

```bash
npm i -D @af-mobile/mcp
```

在 MCP 客户端配置 stdio 服务器：

```jsonc
{
  "mcpServers": {
    "aiflow": { "command": "npx", "args": ["-y", "@af-mobile/mcp"] }
  }
}
```

> 亦可用 `npx @af-mobile/mcp` 直接启动。

## 数据飞轮（遥测）

每次 `check_compliance` 会写入本地 `.aiflow/` 遥测（时间戳 / 来源 / 工具 / 文件路径 / 规则名 / 行号 / 脱敏消息，**不含代码内容**）。这些错误模式会被用于改进白名单与 prompt，让后续生成更准。CI 上的遥测随 runner 销毁。

## 依赖

- `@af-mobile/eslint-plugin`（合规检查引擎）
- `@modelcontextprotocol/sdk`