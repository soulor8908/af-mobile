// af-mobile Starter —— AI 代码约束（设计 §4.5）：保存即受 164 白名单 + 15 规则约束
import afMobilePlugin from '@af-mobile/eslint-plugin';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'scripts/**'],
  },
  {
    files: ['src/**/*.js'],
    plugins: { 'af-mobile': afMobilePlugin },
    rules: { ...afMobilePlugin.configs.recommended.rules },
  },
];
