// af-mobile UI —— demo 站 Vite 配置（IP-9: 自建 demo，原生优先，不用 Storybook）
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readdirSync } from 'node:fs';

const ROOT = dirname(fileURLToPath(import.meta.url));

// demo/components/*.html 每个组件一个静态 demo 页，全部作为多页入口打包
function componentInputs() {
  const dir = resolve(ROOT, 'demo/components');
  const inputs = {};
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.html'))) {
    inputs[f.replace(/\.html$/, '')] = resolve(dir, f);
  }
  return inputs;
}

export default defineConfig({
  root: 'demo',
  base: '/af-mobile/demo/',
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
        ...componentInputs(),
      },
    },
  },
});
