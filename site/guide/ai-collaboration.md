# AI 协作

## 理念：库是 AI-first

@af-mobile/ui 在立项之初就把 AI 当作一等公民——设计体系（L1/L2/L3）本身就是要让"AI 生成合规模板 HTML"这件事变得可约束、可验证。README 称之为 **L4 AI 约束层**（System Prompt 引导 + ESLint 规则兜底 + CI 保护）；AGENTS.md §5「AI 开发工具接入」给出了具体的协作协议。

核心原则（AGENTS.md §5）：**调用方即 LLM**——库不内置任何 LLM，只用你自己的模型写代码，库侧只提供确定性的 prompt / lint / 修正建议。你不需要配置任何 `AIFLOW_AI_API_URL` 就能用完整工作流（MCP 与 CLI 默认即可跑）。

## 给人类开发者：怎么带 AI 干活

有两条入口拿到"按需求裁剪的 System Prompt"，然后用自己的模型生成页面：

**CLI 手动模式（仓库内）**——`node scripts/generate.mjs "需求"`：

```bash
node scripts/generate.mjs "商品列表页带图"
```

未配置 LLM 时进入**手动模式**：输出一段按需求裁剪的 System Prompt + User Prompt，你把它们粘贴给任意 AI 即可。`generate.mjs` 内部用 `buildPrompt({ userPrompt })` 按需构建 System Prompt（自动检索 few-shot 与组件 API）。配置了 `AIFLOW_AI_API_URL` + `AIFLOW_AI_API_KEY` 时可走 `-o out.html` 自动生成并复用 ai-fix 修正闭环（最多 3 轮）。

**MCP 工具（IDE 内）**——注册进 TRAE / Claude Code / Cursor，工具入口在 `mcp/index.mjs`，暴露 5 个工具（全部零 LLM 配置可用）：

- **`get_prompt`** —— 传入需求描述，返回 `full`（全量）或 `tailored`（按需裁剪，默认）模式的 System Prompt，交给自己的模型生成页面；
- **`check_compliance`** —— 传入代码，跑 ESLint 检查白名单/禁令合规性，返回违规列表 + 逐条修正建议，并把本次违规自动写入数据飞轮（下次生成更准），不调用 LLM；
- 此外还有 `fix_code`（返回修正 prompt + 逐条建议）、`generate_page`（端到端生成）、`flywheel_report`（飞轮分析）。

推荐工作流：`get_prompt` 拿裁剪后的 prompt → 自己模型生成 → `check_compliance` 验证，有违规按返回建议修正（或 `fix_code` 拿完整修正 prompt），直到 `passed: true`。

## 给 AI Agent：约束从哪来

AI 面对的核心约束有两层（AGENTS.md §3）：

1. **压缩版 System Prompt**：`prompt/system-prompt.md` 是 token 优化的生成提示——角色、设计体系速查、白名单、组件 API、few-shot 全部内联，由 `npm run prompt:build`（`scripts/build-prompt.mjs`）从白名单/类型/组件源码汇聚生成。AI 首先要遵守它的禁令（事件 `af-{组件}:{动作}`、Shadow 用 `var(--*)`、禁内联 style 等）。
2. **ESLint 规则集兜底**：`eslint-plugin-aiflow` 的规则把 prompt 里的软约束变成硬错误。其中**白名单封闭集**最常用——消费端只能用 156 个白名单 class（104 配方 + 52 原子），白名单外 class 或自定义组件标签触发 ESLint error。

库源码（`src/`）与消费端（脚手架生成工程）用不同的规则集：源码走组件质量规则，消费端走完整 AI 规则集（白名单/禁内联 style/禁 Tailwind 语法），两者界限在 AGENTS.md §3 中明确划分。消费端项目必须由脚手架生成（`npm create af-mobile` / `node scripts/create-app.mjs`），这是项目骨架的单一真相源。

## 数据飞轮 v2

数据飞轮是"让生成质量越滚越高"的闭环：**lint 即喂数据**，任何一次违规都变成白名单 / System Prompt 的改进输入。

- **通用 lint 采集 CLI**：`scripts/lint-flywheel.mjs` 对任意文件/目录跑本仓 ESLint 配置，违规自动写入遥测并打印按规则聚合的报告（含修正提示）：
  ```bash
  npm run lint:flywheel -- src/ test/ scripts/
  node scripts/lint-flywheel.mjs page.html --source cli   # 单文件 + 指定来源
  ```
- **飞轮分析报告**：把遥测聚合成可读报告（Top 违规规则 / 白名单候选 / 收敛度）：
  ```bash
  npm run eval:flywheel
  ```
- **遥测落地**：本地写在 `.aiflow/telemetry.jsonl`（gitignore）。**只记脱敏元数据**——时间戳 / 来源 / 工具 / 文件路径 / 规则名 / 行号 / 脱敏后的消息，不记代码内容（style 值与 CSS 声明在落盘前剥离）。

飞轮的迭代逻辑：每次 `check_compliance` / lint 发现的错误模式，会回填进白名单与 prompt——你踩的坑就是库的养料。详细机制见 `docs/design/flywheel-v2-design.md` 与 README「数据飞轮 v2 设计」。

---

> 相关手动入口速查：开发者与 AI 工具通过 MCP 注册 `npx @af-mobile/mcp`（bin `aiflow-ui-mcp`），仓库开发态用 `node mcp/index.mjs`；纯 CLI 用法无任何注册。