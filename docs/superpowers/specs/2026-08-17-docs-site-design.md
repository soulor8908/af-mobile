# @af-mobile/ui 文档站与组件沙盒设计

- 日期：2026-08-17
- 状态：待评审
- 决策记录：双读者并重（人类 + AI Agent）｜GitHub Pages 托管｜半自动生成 API 底稿｜Playground 采用方案 A（运行时面板，非代码编辑器）

## 1. 背景

`@af-mobile/ui` v1.4.2 已有 28 个 L3 组件、2 个 L3.5 block、5 个 charts 子库组件、1155 行手工维护的 `src/index.d.ts`、28 个静态 demo 页、633 行 AI system-prompt，但没有任何文档站。README（575 行）已接近承载上限。

## 2. 目标

1. 组件文档站：快速上手、分层理念、主题、组件 API、运行时 API（signal/fetch/router/page/i18n）
2. 每个组件 2-4 个常用场景的 Playground：用户可动态改属性、监听事件、调样式 token，实时渲染
3. 一次写作、两处消费：同一份 markdown 既渲染文档站，又保持 AI 直接可读（GitHub raw）
4. API 表格从 `index.d.ts` 半自动生成，降低版本迭代时的同步成本

## 3. 非目标

- 不做 CodePen 式代码编辑器（方案 B/C，二期再评估）
- 不做 i18n 多语言站（首批仅中文）
- 不替换现有 `demo/` 静态页与 `prompt/system-prompt.md`（职责不同，均保留）

## 4. 技术选型

| 项 | 选择 | 理由 |
|---|---|---|
| 文档框架 | VitePress | markdown-first（双读者前提）；内置本地搜索；GitHub Pages 官方路径；中文生态好 |
| 托管 | GitHub Pages | 免费、零运维、push 即部署 |
| 预览 | iframe 引 demo 产物 + 运行时面板 | vanilla Web Components 无需编译层，属性/事件/样式均可运行时操作 |

放弃项：RsPress（生态小）、Docusaurus（React 重、过度设计）、Storybook（工作台非文档站，需重写 28 个 stories）。

## 5. 站点信息架构

```
site/                             # 文档站根（VitePress）
├── .vitepress/config.mts         # 侧边栏从组件清单自动生成
├── index.md                      # 定位 + 特性 + 30 秒上手
├── guide/
│   ├── quick-start.md            # npm create af-mobile / 手动接入
│   ├── architecture.md           # L1 token / L2 recipe / L3 组件 / L3.5 block
│   ├── theming.md                # token 体系、暗色、initTheme
│   └── ai-collaboration.md       # ★ 差异化：MCP、get_prompt/check_compliance、ESLint、飞轮
├── components/af-*.md × 28       # 半自动生成 + 人工润色
├── blocks/ charts/ runtime/      # 2 block / 5 chart / 运行时 API
└── public/demo/                  # demo:build 产物（Playground 页 iframe 引用）
```

## 6. 组件页模板（半自动核心）

机器区与人工区用 marker 分离，重新生成不丢人工内容：

```md
# af-dialog
一句话描述 + 何时使用（人工）

## 示例
<!-- gen:start:scenarios -->   ← 从场景文件提取 html，生成代码块 + Playground 入口
<!-- gen:end:scenarios -->

## API
<!-- gen:start:props -->       ← 解析 index.d.ts 属性声明
<!-- gen:end:props -->
<!-- gen:start:events -->      ← 解析 addEventListener 重载
<!-- gen:end:events -->

## 注意事项（人工：无障碍、焦点管理等坑）
```

新增 `scripts/gen-docs.mjs`：解析 `src/index.d.ts` + `demo/scenarios/*.js` → 只重写 marker 区。注册 `npm run docs:gen`。

## 7. Playground（方案 A：运行时面板）

### 7.1 场景文件 = 单一真相源

新增 `demo/scenarios/af-<name>.js`，每组件一个：

```js
export default {
  scenarios: [
    {
      name: '基础用法',
      html: '<af-dialog title="确认操作">…</af-dialog>',
      script: 'const d = document.querySelector(…); …',   // 可选：场景初始化逻辑
      props: [{ prop: 'close-on-esc', type: 'boolean', label: 'ESC 关闭' }],
      styleTokens: [
        { token: '--c-brand', type: 'color' },
        { token: '--radius-lg', type: 'range', min: 0, max: 24 },
      ],
    },
    // 每组件 2-4 个常用场景
  ]
}
```

三处消费：Playground 运行时渲染 / gen-docs 提取示例代码 / AI 直接读源文件。

### 7.2 面板设计（三个 Tab）

| Tab | 内容 | 生效方式 |
|---|---|---|
| 属性 | boolean 开关、number 滑块、select、text | `target[prop] = v`（增强现有 props-panel.js） |
| 事件 | 事件流 log（事件名 + detail JSON 实时打印） | 自动监听该组件全部 `af-*:*` 事件 |
| 样式 | token 色板 + 滑块（按颜色/圆角/间距分组） | CSS 变量覆盖到预览容器 + "复制覆盖代码" |

外围能力：场景切换 Tab、手机框预览（375/414）、"新窗口打开"独立调试。

### 7.3 实现要点

- Playground 宿主页 `demo/playground.html`（由场景文件驱动），文档站组件页 iframe 引用之
- props/events 底稿由 gen-docs 从 index.d.ts 提取后写入场景文件初始 schema，人工仅调 label/范围/场景划分
- 事件 Tab 需捕获 `composed: true` 的冒泡事件（跨 Shadow DOM）

## 8. 双读者桥接

- 人类 → VitePress 站
- AI → 现有 `prompt/system-prompt.md`（token 压缩版，不动）
- 统一数据源：文档 API 表与 prompt 构建均从 `index.d.ts` 取数
- 组件 md 保持纯 markdown 表格，禁用站点专属语法，保证 GitHub raw 可读

## 9. 部署

`.github/workflows/docs.yml`：push main 且 `site/`、`src/`、`demo/`、`scripts/gen-docs.mjs` 有变更 → `npm run docs:gen`（校验无 marker 漂移）→ `vitepress build` + `demo:build` → 部署 GitHub Pages。

仓库名：`af-mobile-docs`；VitePress `base` 配置为 `/v/`（`base: '/v/'`）；联调时用 `npm run docs:gen && vitepress build --base /v/` 校验产物可访问性。

私有仓库需 Pages 付费计划（若私有则备选 Cloudflare Pages）。

## 10. 分期落地

| 阶段 | 内容 | 验收 |
|---|---|---|
| P1 | 站点骨架 + guide 4 篇 + docs.yml | 站点上线可访问（已实施：骨架+9 任务+链路验证完成，待 push main 触发部署验证） |
| P2 | gen-docs.mjs + 28 组件底稿 + 场景文件 + Playground 宿主页 | 已实施：13 组件 17 场景可交互（高频 10 + calendar/search-bar/stepper），gen-docs 幂等 + 示例嵌入 + iframe 在线调试，vitest 1116 全绿，待部署验证 |
| P3 | blocks/charts/runtime 章节 + ai-collaboration 深度内容 | 全 API 覆盖 |

## 11. 风险

| 风险 | 缓解 |
|---|---|
| index.d.ts 解析脆弱（手工维护、非标准 JSDoc） | gen-docs 容错 + 生成失败即 CI 拦截，不阻塞人工区 |
| 28 组件场景编写量大 | P2 先覆盖高频 10 组件，其余降级为单场景，渐进补齐 |
| GitHub Pages 国内访问不稳 | 备选 Cloudflare Pages，配置层切换成本低 |
| Playground 面板代码进入 src/ 误触组件 ESLint 规则 | 面板代码仅存在于 demo/，不进 src/ |
