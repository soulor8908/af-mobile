// e2e 测试页 Vite 配置：root 指向 e2e/，允许从 ../src 引入组件源码
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  root: ROOT,
  server: {
    port: 5181,
    fs: { allow: [resolve(ROOT, '..')] },
  },
  build: { outDir: resolve(ROOT, '.dist'), emptyOutDir: true },
});
