// e2e 测试页 Vite 配置：root 指向 e2e/，允许从 ../src 引入组件源码
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  root: ROOT,
  // 原型夹具（e2e/prototype/*.html）用 <link href="/src/index.css"> 引库样式：
  // vite root 在 e2e/，URL /src/* 需别名映射到仓库根的 src/（JS 相对 import '../src/*' 不受影响）
  resolve: {
    alias: { '/src': resolve(ROOT, '..', 'src') },
  },
  server: {
    port: 5181,
    fs: { allow: [resolve(ROOT, '..')] },
  },
  build: { outDir: resolve(ROOT, '.dist'), emptyOutDir: true },
});
