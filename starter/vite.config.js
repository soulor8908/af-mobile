// af-mobile Starter —— Vite 仅作打包器，零框架零插件（设计 §4.1）
import { defineConfig } from 'vite';
// OPT-4：构建期按实际 register() 调用裁剪 LAZY 懒注册表 → 未用组件不出 chunk
import afMobileTrimLazy from '@af-mobile/ui/vite';

export default defineConfig({
  // 相对 base：hash 路由下文档 URL 不变，子路径部署（GitHub Pages /repo/、妙搭 /app/xxx/）JS/CSS/配件不 404
  base: './',
  // 本仓开发用 file: 链接依赖（adapters 的 peer 依赖经 realpath 解析会失败），保持符号链接路径解析
  resolve: { preserveSymlinks: true },
  plugins: [afMobileTrimLazy()],
  build: { target: 'es2022' },
  // test 段供 vitest 复用（jsdom 环境 + 桩来自 @af-mobile/ui/test，与框架版本自动同步）
  /// <reference types="vitest" />
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.js'],
  },
});
