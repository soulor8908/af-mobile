# 应用配方

从零到一个可部署应用的**规则入口页**。理念见[架构理念](/guide/architecture)，本页只列「写代码时高频要查的规则」+ 链接，避免规则散落。

## 五步建应用

1. `npx @af-mobile/ui create my-app` 生成工程（Vite + vitest + ESLint + PWA 配件 + grill skill 齐备）
2. `src/main.js`：`register(...tags)` 按需注册页面用到的组件（**禁 registerAll**，丢 Tree Shaking）
3. `route(path, page)` 声明路由 + `start('#app', { hash: true })`
4. `src/pages/*.js` 用 `createPage` 写页面（HTML 模板 + 白名单 class + 组件事件）
5. `npm run dev` 起服务；`af-mobile deploy` 部署（子路径部署已默认适配）

## 注册规则

- 主库：`register('af-list', 'af-search-bar', ...)` 变参，懒加载需 await
- charts 子库：`import { registerChart } from '@af-mobile/ui/charts'`，**单标签逐个** `await registerChart('af-chart-bar')`
- chat 子库：`import { registerChat } from '@af-mobile/ui/chat'`，`registerChat()` 无参默认注册 `af-chat`
- 三者语义一致（变参），但**子库必须从子入口引**，主入口没有——这是最高频的坑（涉及聊天/图表需求必须用子库，禁止手写气泡流/CSS 图表）
- DEV 模式漏注册会在控制台告警（生产构建零成本）

## 路由规则

- hash 路由：`route('/detail/:id', page)` + `go(path)` + `start('#app', { hash: true })`
- 守卫：`beforeEach/afterEach`（登录重定向、tabbar 高亮联动见 [快速开始](/guide/quick-start)）
- hash 路由下文档 URL 不变 → 资源可全用相对路径，子路径部署零配置

## 样式规则（红线）

- 只用 **L2 白名单 class**（recipe + atomic，见 `eslint-plugin-af-mobile/utils/whitelist-v1.json`）；白名单外 class 会被 ESLint 拦截
- token 变量（`--c-*` / `--s-*` / `--r-*`）禁重定义；禁内联 style；禁 Tailwind 语法
- 自定义样式写 `src/styles.css`（main.js 已引入，漏引 = 死文件）

## 子库

| 子库 | 引入 | 能力 |
|---|---|---|
| chat | `@af-mobile/ui/chat` | af-chat 组件 + createSession/defineTool 工具循环 + sessions 多会话 |
| charts | `@af-mobile/ui/charts` | af-chart-line/bar/pie/radar/funnel 五态图表内核 |

## 测试

- 环境桩：`test/setup.js` 里 `import '@af-mobile/ui/test'`（matchMedia/popover/IntersectionObserver 等一键注入）
- 用例间清理：localStorage/DOM 复位写在项目自己的 setup（预设不带 beforeEach 钩子）

## 部署

- 脚手架默认相对路径（vite `base: './'` + manifest `start_url: "./"`），GitHub Pages / Vercel 子目录 / 妙搭等子路径部署开箱即用
- 完整链路见 starter `DEPLOY.md`；最小完整应用源码见仓库 `demo/apps/ai-todo/`（教程：从零到跑通）
