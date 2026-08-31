// af-mobile 脚手架：node scripts/create-app.mjs <dir> [--flywheel] [--desc <描述>] [--theme <主题色>]
// 生成最小可运行工程（npm 版本依赖 + hash 路由 + FOUC 防闪 + ESLint 约束 + vitest 测试链路 + PWA 配件），
// 并自动安装 af-mobile-grill skill（多工具目标），形成迭代闭环。
// --flywheel：生成 .mcp.json（@af-mobile/mcp 数据飞轮，显式 opt-in，默认不开启以尊重隐私）
// --desc：应用描述（进 manifest / meta description / og）；--theme：主题色（进 manifest / meta theme-color）
// 用法等价：npx @af-mobile/ui create <dir>
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

const args = process.argv.slice(2);
const flywheel = args.includes('--flywheel');
const dirArg = args.find((a) => !a.startsWith('--'));
if (!dirArg) {
  console.error('用法：node scripts/create-app.mjs <目录名> [--flywheel] [--desc <描述>] [--theme <主题色>]');
  process.exit(1);
}

const dir = resolve(dirArg);
const name = basename(dir).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'af-mobile-app';

// PWA 配件变量（consumer-delivery-design.md §3.1）
function flagValue(flag, fallback) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
}
const APP_DESCRIPTION = flagValue('--desc', `${name} app`);
const THEME_COLOR = /^#[0-9a-fA-F]{6}$/.test(flagValue('--theme', '')) ? flagValue('--theme', '') : '#1677ff';

if (existsSync(dir) && readdirSync(dir).length > 0) {
  console.error(`✗ 目录已存在且非空：${dir}`);
  process.exit(1);
}

// --flywheel：lint 单命令化（gate + 遥测一次跑完）；备注：链路完善后此项默认不开启（保持隐私默认，显式 opt-in）
// 走 bin（af-mobile lint）而非包内路径：npm run 会把 node_modules/.bin 加进 PATH，对包内文件重构免疫
const lintScript = flywheel
  ? 'af-mobile lint src/ --source cli'
  : 'eslint src/';

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
    "lint": "${lintScript}",
    "test": "vitest run"
  },
  "dependencies": {
    "@af-mobile/ui": "^${version}"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "vitest": "^1.6.0",
    "jsdom": "^24.0.0",
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
  <meta name="theme-color" content="${THEME_COLOR}">
  <meta name="description" content="${APP_DESCRIPTION}">
  <link rel="manifest" href="./manifest.webmanifest">
  <link rel="icon" href="./favicon.ico" sizes="any">
  <link rel="apple-touch-icon" href="./icon-192.png">
  <meta property="og:title" content="${name}">
  <meta property="og:description" content="${APP_DESCRIPTION}">
  <meta property="og:image" content="./icon-512.png">
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

  'public/manifest.webmanifest': `{
  "name": "${name}",
  "short_name": "${name}",
  "description": "${APP_DESCRIPTION}",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "${THEME_COLOR}",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
`,

  'vite.config.js': `// Vite 仅作打包器，零框架零插件；test 段供 vitest 复用（jsdom 环境 + setup 桩）
/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { target: 'es2022' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.js'],
  },
});
`,

  'test/setup.js': `// 测试环境：@af-mobile/ui/test 注入 jsdom 缺失的全部浏览器 API 桩
// （matchMedia / showModal / popover + ToggleEvent / IntersectionObserver / ResizeObserver /
//   requestAnimationFrame / slot assignedElements / createObjectURL / TouchEvent）
import '@af-mobile/ui/test';

// 全局清理：每个测试之间隔离
beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
});
`,

  'eslint.config.js': `// AI 代码约束：保存即受白名单 class 封闭集 + 规则集约束
import afMobilePlugin from '@af-mobile/eslint-plugin';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'scripts/**'],
  },
  {
    files: ['src/**/*.js'],
    plugins: { 'af-mobile': afMobilePlugin },
    rules: {
      ...afMobilePlugin.configs.recommended.rules,
      // 项目自定义 class/组件在此登记（未登记会报 af-mobile/token-whitelist error）。
      // 示例：优先改用白名单已有 class；确需自定义时，把报错信息里的语法片段粘贴到下方并填入你的 class：
      // 'af-mobile/token-whitelist': ['error', { extraClass: ['my-card'], extraComponents: ['my-widget'] }],
    },
  },
];
`,

  '.gitignore': `node_modules/
dist/
.af-mobile/
`,

  'src/main.js': `// 应用入口：注册组件 → 声明路由 → 启动（hash 模式，静态托管零配置）
import '@af-mobile/ui/css';
import './styles.css';                    // 项目级自定义样式入口（默认已引入，勿删）
import { route, start, initTheme, register } from '@af-mobile/ui';
import homePage from './pages/home.js';
import docsPage from './pages/docs.js';

// 按需注册页面用到的 af-* 组件（禁止 registerAll()，会失去 Tree Shaking）。
// 例：register('af-list', 'af-dialog', 'af-field', 'af-toast');
//
// ⚠️ 不要写「入口顶层 await register(...)」：生产构建（Vite/Rollup 分包）会把入口变成
// TLA 模块，与组件 chunk 形成 entry ↔ chunk 循环依赖 —— 组件永不注册、页面空白且零报错
// （dev 原生 ESM 不复现）。register() 只负责发起注册，router 首次渲染前会自动等待
// （start 内部 whenReady），直接调用即可；不使用 router 自绘时才手动 await whenReady()。
register();

initTheme();

route('/', homePage);
route('/docs', docsPage);

start('#app', { hash: true });
`,

  'src/styles.css': `/* 项目级自定义样式：只用 var(--*) token；新增 class 需登记项目白名单 */
`,

  'src/pages/home.js': `// home —— 首页：createPage 范式（state/computed/actions + :bind 响应式绑定）
import { createPage, go } from '@af-mobile/ui';

export default function homePage(params, ctx) {
  const page = createPage({
    state: { count: 0 },
    computed: { pct: (s) => Math.min(100, s.count * 10) },
    actions: { inc: (s) => { s.count += 1; } },
  });

  // app-shell：整屏三段式骨架（顶栏 / 内容区独立滚动 / 底栏），各页复用同一份结构
  // 底栏（.tabbar 或 <af-tabbar>）放在 .scroll-y 之后即可固定在视口底部
  ctx.outlet.innerHTML = \`
    <div class="app-shell">
      <header class="navbar"><h1 class="title">我的应用</h1></header>
      <main class="page-col scroll-y p-4">
        <section class="hero">
          <p class="eyebrow">af-mobile App</p>
          <h1 class="display">我的应用</h1>
          <p class="subtitle">项目已就绪</p>
        </section>
        <section class="card">
          <h3 class="section-tt">下一步</h3>
          <p class="body">用 TRAE 或任意 AI 编码工具打开本项目，说出你的想法，af-mobile-grill skill 会引导你完成需求确认与页面生成。</p>
          <progress max="100" :value="derived.pct"></progress>
          <button class="btn" data-role="inc">点我 +1</button>
        </section>
        <div class="actions">
          <button class="btn btn-block" data-role="go-docs">查看开发指引</button>
        </div>
      </main>
    </div>\`;

  ctx.outlet.querySelector('[data-role="inc"]')
    .addEventListener('click', page.actions.inc);
  ctx.outlet.querySelector('[data-role="go-docs"]')
    .addEventListener('click', () => go('/docs'));

  page.mount(ctx.outlet);   // 启动 :bind 扫描（:attr="state.x / derived.x" → 响应式属性）
  ctx.signal.addEventListener('abort', () => page.unmount());   // 路由离开时级联清理
}
`,

  'src/pages/docs.js': `// docs —— 开发指引（createPage 最小范式）
import { createPage } from '@af-mobile/ui';

export default function docsPage(params, ctx) {
  const page = createPage({});

  ctx.outlet.innerHTML = \`
    <div class="app-shell">
      <header class="navbar"><h1 class="title">开发指引</h1></header>
      <main class="page-col scroll-y p-4">
        <section class="card">
          <h3 class="section-tt">约束</h3>
          <p class="body">只用白名单 class 和 af-* 组件标签；禁止内联 style 与 Tailwind 语法。</p>
        </section>
        <section class="card">
          <h3 class="section-tt">页面范式</h3>
          <p class="body">createPage({ state, computed, actions }) 声明逻辑；:attr="state.x" 响应式绑定组件属性；page.mount(ctx.outlet) 启动绑定，路由离开时 page.unmount() 级联清理。</p>
        </section>
        <section class="card">
          <h3 class="section-tt">App 骨架</h3>
          <p class="body">.app-shell（整屏 + 移动端 640 居中）套 .page-col.scroll-y 内容区；需要底部 Tab 时把 .tabbar 或 &lt;af-tabbar&gt; 放在滚动区之后。</p>
        </section>
        <section class="card">
          <h3 class="section-tt">组件 API</h3>
          <p class="body">见 node_modules/@af-mobile/ui/src/index.d.ts（方法签名与事件 payload，一次读全）。</p>
        </section>
        <div class="actions">
          <button class="btn btn-ghost" data-role="back">返回首页</button>
        </div>
      </main>
    </div>\`;

  ctx.outlet.querySelector('[data-role="back"]')
    .addEventListener('click', () => history.back());

  page.mount(ctx.outlet);
  ctx.signal.addEventListener('abort', () => page.unmount());
}
`,
};

for (const [rel, content] of Object.entries(files)) {
  const dest = join(dir, rel);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, content);
  console.log(`+ ${rel}`);
}

// PWA 图标与 favicon：随包分发的预生成占位图（PNG/ICO，apple-touch-icon 与 /favicon.ico 不支持 SVG），
// 消费端按需替换 public/ 下同名文件（见 README / DEPLOY.md）
for (const icon of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'favicon.ico']) {
  const dest = join(dir, 'public', icon);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(join(ROOT, 'assets', 'icons', icon), dest);
  console.log(`+ public/${icon}`);
}

// 数据飞轮（显式 opt-in）：生成 .mcp.json，MCP 客户端（TRAE / Claude Code / Cursor）自动注册
// @af-mobile/mcp。check_compliance 校验遥测自动落盘 .af-mobile/（本地、不含代码内容），
// 开发踩坑回流白名单/Prompt 迭代。不传 --flywheel 则完全不生成，尊重隐私敏感项目。
if (flywheel) {
  writeFileSync(join(dir, '.mcp.json'), `{
  "mcpServers": {
    "af-mobile": {
      "command": "npx",
      "args": ["-y", "@af-mobile/mcp"]
    }
  }
}
`);
  console.log('+ .mcp.json（数据飞轮：MCP 校验遥测已接入，显式 opt-in）');
  console.log('+ package.json lint 已挂遥测（npm run lint = gate + 采集一次跑完）');
}

// 自动安装 af-mobile-grill skill（多工具目标 + AGENTS.md 指引段）
const skill = spawnSync(process.execPath, [join(ROOT, 'scripts/skill-add.mjs'), dir], {
  stdio: 'inherit',
});
if (skill.status !== 0) process.exit(skill.status);

console.log(`
✓ 项目已生成：${dir}

下一步：
  cd ${basename(dir)}
  npm install
  npm run dev${flywheel ? '\n  # 数据飞轮已接入：用 MCP 客户端打开项目，check_compliance 校验遥测自动回流' : ''}

然后用 AI 编码工具（TRAE / Claude Code / Cursor 等）打开项目，
说一句你的想法（如"我想做一个习惯打卡应用"），skill 会引导你完成后续开发。
测试：npm test（vitest + jsdom，桩见 test/setup.js；缺的浏览器 API 桩在此追加）
`);
