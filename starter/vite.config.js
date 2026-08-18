// af-mobile Starter —— Vite 仅作打包器，零框架零插件（设计 §4.1）
import { defineConfig } from 'vite';

export default defineConfig({
  // 本仓开发用 file: 链接依赖（adapters 的 peer 依赖经 realpath 解析会失败），保持符号链接路径解析
  resolve: { preserveSymlinks: true },
  build: { target: 'es2022' },
});
