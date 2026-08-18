// af-mobile UI —— demo 站 Vite 配置（IP-9: 自建 demo，原生优先，不用 Storybook）
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const ROOT = dirname(fileURLToPath(import.meta.url));
const BASE = '/af-mobile/demo/';
// demo HTML 用 <link href="../src/index.css"> 引用 src/，但 Vite root=demo，
// 浏览器把相对路径按 URL 解析为 /af-mobile/src/*（base 上一层），dev server 默认不服务该路径 → 404。
// 由 base 推导出需兜底服务的 URL 前缀：'/af-mobile/demo/' → '/af-mobile/src/'
const SRC_URL_PREFIX = BASE.replace(/\/[^/]+\/$/, '/src/');
const SRC_DIR = resolve(ROOT, 'src');
const MIME = { '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };

// demo/components/*.html 每个组件一个静态 demo 页，全部作为多页入口打包
function componentInputs() {
  const dir = resolve(ROOT, 'demo/components');
  const inputs = {};
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.html'))) {
    inputs[f.replace(/\.html$/, '')] = resolve(dir, f);
  }
  return inputs;
}

// dev 中间件：把 /af-mobile/src/* 映射到磁盘 src/ 目录，
// 让 <link href="../src/index.css"> 在本地 dev 不再 404。
// 仅作用于 dev（configureServer）；build 时 Vite 会按磁盘路径正常打包 <link>，生产不受影响。
function serveSrcOutsideRoot() {
  return {
    name: 'af-mobile-serve-src',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || '').split('?')[0];
        if (!url.startsWith(SRC_URL_PREFIX)) return next();
        const rel = decodeURIComponent(url.slice(SRC_URL_PREFIX.length));
        const filePath = resolve(SRC_DIR, rel);
        // 安全：仅允许 src/ 目录内文件，防穿越
        if (!filePath.startsWith(SRC_DIR)) return next();
        const ext = filePath.slice(filePath.lastIndexOf('.'));
        try {
          const content = await readFile(filePath);
          res.setHeader('Content-Type', (MIME[ext] || 'application/octet-stream') + '; charset=utf-8');
          res.end(content);
        } catch {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  root: 'demo',
  base: BASE,
  plugins: [serveSrcOutsideRoot()],
  server: {
    port: 5180,
    open: '/index.html',
    fs: { allow: [ROOT] }, // 允许从 ../src 引入组件源码
  },
  build: {
    outDir: resolve(ROOT, 'demo-dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(ROOT, 'demo/index.html'),
        playground: resolve(ROOT, 'demo/playground/index.html'),
        kitchenSink: resolve(ROOT, 'demo/kitchen-sink.html'),
        perf: resolve(ROOT, 'demo/perf.html'),
        ...componentInputs(),
      },
    },
  },
});
