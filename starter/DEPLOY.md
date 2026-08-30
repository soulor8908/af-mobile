# 部署指南（Cloudflare Pages / IGA Pages）

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

## 路径 C：IGA Pages（国内用户推荐）

火山引擎体系，部署后自动提供平台默认域名，国内可达性更优；自定义域名可选。

```bash
npm i -g @iga-pages/cli@latest
iga login          # 本地浏览器登录；远程/CI 用 iga login --accessKey <AK> --secretKey <SK>（火山引擎 IAM 控制台取）
npm run build
af-mobile deploy --provider iga    # 首次指定后记住选择，之后 af-mobile deploy 即可
```

- **环境变量顺序**：先 `iga pages env add VITE_SUPABASE_URL`（配置项目级 env）**再** deploy——IGA 的 env 在下次 deploy 才生效，而 `VITE_*` 是构建时注入，顺序反了线上白屏
- 更省事：`iga pages integration link supabase` 连接火山 Supabase，连接变量自动同步，免两处手工配置
- 预览链接带 `?iga_token=…` 参数，分享时必须带全，否则打不开

## 自定义域名（可选）

Pages 项目 → Custom domains → 添加域名并按提示加 CNAME 记录，HTTPS 由平台自动签发。

## 环境变量红线

部署类凭据（数据库连接串、平台 API token 等）**禁止加 `VITE_` 前缀**——带前缀会被 vite 打进前端 bundle 直接泄露。`VITE_` 前缀只给"本就该暴露给浏览器的值"（如 Supabase URL / anon key）。

## 错误监控（可选）

本模板不内置监控。上线后如需观测线上报错，可接入 Sentry 等外部方案：安装 SDK → 在 `src/main.js` 顶部初始化 → 把 DSN 配成 `VITE_` 变量（DSN 本身是公开的，可加前缀）。

## 子路径部署

脚手架默认相对路径（vite `base: './'`、manifest `start_url: "./"`、index.html 配件 `./` 引用），
GitHub Pages `/repo/`、Vercel 子目录等子路径部署开箱即用，无需配置。
前提是 hash 路由（本脚手架默认）；若自行切换 history 路由需重新评估 base 策略。
