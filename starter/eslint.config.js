// AIFlow Starter —— AI 代码约束（设计 §4.5）：保存即受 154 白名单 + 15 规则约束
import aiflow from '@af-mobile/eslint-plugin';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'scripts/**'],
  },
  {
    files: ['src/**/*.js'],
    plugins: { aiflow },
    rules: { ...aiflow.configs.recommended.rules },
  },
];
