# 部署指南（Cloudflare Pages）

产物是 `dist/` 纯静态站点。两条路径二选一，都免费、10 分钟内可跑通。

> replace：占位图标与 manifest 在 `public/`（icon-192 / icon-512 / icon-maskable-512 / favicon.ico / manifest.webmanifest），换成你自己的即可。`_redirects` 的 SPA fallback 只在文件不存在时生效，静态资源（manifest / 图标）不会被重写成 HTML。

## 路径 A：Git 集成（推荐，push 即部署）

1. 把项目推到 GitHub/GitLab
2. 打开 https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git**，选本仓库
3. 构建配置：
   - Build command: `npm run build`
   - Build output directory: `dist`
4. **关键易漏**：Settings → Environment variables，给 **Production 和 Preview 都**加上构建期变量：
   - `VITE_SUPABASE_URL` = 你的 Supabase 项目 URL
   - `VITE_SUPABASE_ANON_KEY` = 你的 anon key
   - `VITE_*` 是**构建时**注入的，只配本地 `.env` 不配这里 = 线上白屏
5. Save and Deploy，得到 `https://<project>.pages.dev`

之后每次 `git push` 自动重新构建部署，迭代闭环即建成。

## 路径 B：命令行手动部署

```bash
npm run build
npx wrangler pages deploy dist --project-name=<你的项目名>
```

首次运行 `wrangler` 会打开浏览器做一次性 OAuth 登录（免费 Cloudflare 账号即可）。之后重复执行这条命令就是"重新部署"，改代码 → 重跑即完成一轮迭代。

命令行方式不经过 Git 构建，环境变量取自本地 `.env`（`npm run build` 时注入）。

## 自定义域名（可选）

Pages 项目 → Custom domains → 添加域名并按提示加 CNAME 记录，HTTPS 由平台自动签发。

## 环境变量红线

部署类凭据（数据库连接串、平台 API token 等）**禁止加 `VITE_` 前缀**——带前缀会被 vite 打进前端 bundle 直接泄露。`VITE_` 前缀只给"本就该暴露给浏览器的值"（如 Supabase URL / anon key）。

## 错误监控（可选）

本模板不内置监控。上线后如需观测线上报错，可接入 Sentry 等外部方案：安装 SDK → 在 `src/main.js` 顶部初始化 → 把 DSN 配成 `VITE_` 变量（DSN 本身是公开的，可加前缀）。
