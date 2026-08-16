// AIFlow Starter —— AI 代码约束（设计 §4.5）：保存即受 154 白名单 + 15 规则约束
// recipes.project.css 约定块内的 class 自动并入白名单（项目级扩展，无需手写 extraClass）
import aiflow from '@af-mobile/eslint-plugin';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'scripts/**'],
  },
  {
    files: ['src/**/*.js'],
    plugins: { aiflow },
    rules: aiflow.withProjectRules('recipes.project.css'),
  },
];
