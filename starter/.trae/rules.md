# AIFlow Starter —— AI 开发守则

本模板用任何 AI 写代码时，遵守以下约束与工作流。

## 约束（保存即由 ESLint 强制，违规会 error）

1. **只用 154 白名单 class**（`page` / `card` / `btn` / `title` / `caption` / `navbar` 等）+ 20 个 `af-*` 组件标签，禁止自定义 class
2. **禁止内联 style**：布局用白名单 class 或 `data-role` + 少量自定义 CSS
3. **禁止 Tailwind 语法 / 任意值语法**（`p-4`、`w-[100px]`）
4. **数据请求只用 `fetchPage`**，后端地址写 `supabase://表名?...`，返回 `{ data, total }`
5. **用户输入插值必须 `escapeHtml`（esc）**，事件名 `af-{组件}:{动作}`

## 推荐工作流（数据飞轮 v2）

```
1. MCP get_prompt "需求描述"        → 拿按需求裁剪的 System Prompt
2. 按 prompt 生成代码
3. MCP check_compliance             → 有违规按修正建议改，或调 fix_code
4. 重复 3 直到 passed: true
```

未接 MCP 时等价命令：`node scripts/lint-flywheel.mjs <路径>`（lint 即喂数据）。

## 技术栈

- 零框架：原生 Web Components + History 路由（`@af-mobile/ui`）
- 后端：Supabase（`supabase://` scheme 经 `src/backend.js` 装配）
- 部署：Cloudflare Pages 默认（`dist/` 纯静态，`_redirects`/`_headers` 已预置）
