// AIFlow 脚手架：node scripts/create-app.mjs <dir>
// 生成最小可运行工程（npm 版本依赖 + hash 路由 + FOUC 防闪 + ESLint 约束），
// 并自动安装 aiflow-grill skill（多工具目标），形成迭代闭环。
// 用法等价：npx -p @af-mobile/ui aiflow create <dir>
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

const dirArg = process.argv[2];
if (!dirArg) {
  console.error('用法：node scripts/create-app.mjs <目录名>');
  process.exit(1);
}

const dir = resolve(dirArg);
const name = basename(dir).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'aiflow-app';

if (existsSync(dir) && readdirSync(dir).length > 0) {
  console.error(`✗ 目录已存在且非空：${dir}`);
  process.exit(1);
}

const files = {
  'package.json': `{
  "name": "${name}",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src/"
  },
  "dependencies": {
    "@af-mobile/ui": "^${version}"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "eslint": "^9.0.0",
    "@af-mobile/eslint-plugin": "^2.0.0"
  }
}
`,

  'index.html': `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${name}</title>
  <script>
    // 先于首次 paint 设定主题，避免暗色模式 FOUC（无需等组件库加载）
    try {
      var t = localStorage.getItem('theme');
      if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    } catch (e) {}
  </script>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
`,

  'vite.config.js': `// Vite 仅作打包器，零框架零插件
import { defineConfig } from 'vite';

export default defineConfig({
  build: { target: 'es2022' },
});
`,

  'eslint.config.js': `// AI 代码约束：保存即受 154 白名单 + 15 规则约束
import aiflow from '@af-mobile/eslint-plugin';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'scripts/**'],
  },
  {
    files: ['src/**/*.js'],
    plugins: { aiflow },
    rules: { ...aiflow.configs.recommended.rules },
  },
];
`,

  '.gitignore': `node_modules/
dist/
`,

  'src/main.js': `// 应用入口：注册组件 → 声明路由 → 启动（hash 模式，静态托管零配置）
import '@af-mobile/ui/css';
import { registerAll, route, start, initTheme } from '@af-mobile/ui';
import homePage from './pages/home.js';
import docsPage from './pages/docs.js';

registerAll();
initTheme();

route('/', homePage);
route('/docs', docsPage);

start('#app', { hash: true });
`,

  'src/styles.css': `/* 项目级自定义样式：只用 var(--*) token；新增 class 需登记项目白名单 */
`,

  'src/pages/home.js': `// home —— 首页：编辑这里开始你的应用
import { go } from '@af-mobile/ui';

export default async function homePage(params, ctx) {
  ctx.outlet.innerHTML = \`
    <main class="page">
      <header class="navbar navbar-fixed"><h1 class="title">我的应用</h1></header>
      <section class="hero">
        <h2 class="title">项目已就绪</h2>
        <p class="caption">用 TRAE 或任意 AI 编码工具打开本项目，说出你的想法，aiflow-grill skill 会引导你完成需求确认与页面生成。</p>
      </section>
      <div class="card">
        <h3 class="subtitle">下一步</h3>
        <p class="body">编辑 src/pages/home.js 开始开发。</p>
      </div>
      <div class="actions">
        <button class="btn" data-role="go-docs">查看开发指引</button>
      </div>
    </main>\`;

  ctx.outlet.querySelector('[data-role="go-docs"]')
    .addEventListener('click', () => go('/docs'));
}
`,

  'src/pages/docs.js': `// docs —— 开发指引
export default async function docsPage(params, ctx) {
  ctx.outlet.innerHTML = \`
    <main class="page">
      <header class="navbar navbar-fixed"><h1 class="title">开发指引</h1></header>
      <div class="card">
        <h3 class="subtitle">约束</h3>
        <p class="body">只用 154 白名单 class 和 af-* 组件标签；禁止内联 style 与 Tailwind 语法。</p>
      </div>
      <div class="card">
        <h3 class="subtitle">组件 API</h3>
        <p class="body">见 node_modules/@af-mobile/ui/README.md。</p>
      </div>
      <div class="actions">
        <button class="btn btn-ghost" data-role="back">返回首页</button>
      </div>
    </main>\`;

  ctx.outlet.querySelector('[data-role="back"]')
    .addEventListener('click', () => history.back());
}
`,
};

for (const [rel, content] of Object.entries(files)) {
  const dest = join(dir, rel);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, content);
  console.log(`+ ${rel}`);
}

// 自动安装 aiflow-grill skill（多工具目标 + AGENTS.md 指引段）
const skill = spawnSync(process.execPath, [join(ROOT, 'scripts/skill-add.mjs'), dir], {
  stdio: 'inherit',
});
if (skill.status !== 0) process.exit(skill.status);

console.log(`
✓ 项目已生成：${dir}

下一步：
  cd ${basename(dir)}
  npm install
  npm run dev

然后用 AI 编码工具（TRAE / Claude Code / Cursor 等）打开项目，
说一句你的想法（如"我想做一个习惯打卡应用"），skill 会引导你完成后续开发。
`);
