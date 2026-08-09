// AIFlow UI —— 项目 ESLint 配置（flat config）
import aiflow from './eslint-plugin-aiflow/index.js';

export default [
  // 忽略
  { ignores: ['node_modules/**', 'dist/**', 'docs/**'] },
  // 所有 JS 文件：启用 aiflow recommended
  {
    files: ['**/*.js'],
    plugins: { aiflow },
    rules: {
      ...aiflow.configs.recommended.rules,
      // 源码自身已在白名单内，组件自检规则对组件文件可能误报
      // 实际项目中按需启用
    },
  },
  // 组件文件：启用 L3 规则
  {
    files: ['src/components/**/*.js'],
    plugins: { aiflow },
    rules: {
      'aiflow/wc-event-naming': 'error',
      'aiflow/wc-aria-required': 'error',
      'aiflow/wc-cleanup': 'warn',
    },
  },
  // CSS 文件：启用 L1 规则
  {
    files: ['**/*.css'],
    plugins: { aiflow },
    rules: {
      'aiflow/no-token-modification': 'error',
    },
  },
];
