// @af-mobile/mcp 内嵌 ESLint 配置（pkg-publish 设计 §3.5）
// check_compliance 检测的是用户/AI 生成的页面代码 → 消费端 AI_RULES
// （与仓库根配置对 .cache/** 的规则集一致，开发态/发布态行为等价）
import afMobilePlugin from '@af-mobile/eslint-plugin';

export default [
  {
    // dist 为构建产物（内嵌 prompt 机制源码字面量，非消费端代码），不参与 lint
    ignores: ['node_modules/**', 'dist/**'],
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    plugins: { 'af-mobile': afMobilePlugin },
    rules: { ...afMobilePlugin.configs.recommended.rules },
  },
];
