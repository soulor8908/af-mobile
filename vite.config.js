// AIFlow UI —— demo 站 Vite 配置（IP-9: 自建 demo，原生优先，不用 Storybook）
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: 'demo',
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
      },
    },
  },
});
