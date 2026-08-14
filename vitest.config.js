import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));

export default defineConfig({
  resolve: {
    alias: {
      // 框架适配层以裸导入引用 @af-mobile/ui（与发布后消费一致），单测环境用别名指向本地源码
      '@af-mobile/ui/components': resolve(ROOT, 'src/components'),
      '@af-mobile/ui': resolve(ROOT, 'src/index.js'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.js'],
    include: ['test/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/index.js']
    }
  }
});
