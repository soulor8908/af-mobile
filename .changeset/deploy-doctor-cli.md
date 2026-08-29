---
"@af-mobile/ui": minor
---

新增 `af-mobile doctor` 与 `af-mobile deploy`（交付链 P1）：AI 生成代码之后到「手机浏览器可访问」之间的命令补位。

- `doctor`：只读自检 —— 构建产物、P0 配件（manifest + 3 图标 + favicon，且 index.html 已引用）、密钥 `VITE_` 前缀红线、部署端环境变量提示、target 专属检查（Supabase 环境变量 / wrangler.toml 含 D1 binding）、线上可达（`--url`）
- `deploy`：前置检查全绿才执行，Cloudflare provider 已实现（Pages 静态托管 / Workers 全栈）；`self-hosted` 与 `cn` 按 D-010 留接口并明确报未实现
- 两个正交维度：`target`（后端形态 supabase / cloudflare）与 `provider`（部署落点 cloudflare / self-hosted / cn），组合非笛卡尔积 —— Workers 全栈不可脱离 Cloudflare
- 网络与命令执行均可注入（`opts.fetch` / `opts.run`），便于测试与 mock
