// AIFlow UI —— 项目 ESLint 配置（flat config）
import aiflow from './eslint-plugin-aiflow/index.js';

// AI 代码约束规则集（token-whitelist/no-inline-style/no-recipe-break 等）
// 仅约束 AI 生成的代码，不约束库源码（库有设计文档约束）
const AI_RULES = aiflow.configs.recommended.rules;

// 库源码 L3 代码质量规则（组件文件适用）
// 启用 L3 全部 6 条规则（wc-light-no-style/wc-shadow-use-token/wc-part-naming/wc-event-naming/wc-aria-required/wc-cleanup）
const COMPONENT_RULES = {
  // L3 error
  'aiflow/wc-light-no-style': 'error',
  'aiflow/wc-shadow-use-token': 'error',
  'aiflow/wc-event-naming': 'error',
  'aiflow/wc-aria-required': 'error',
  // L3 warn
  'aiflow/wc-part-naming': 'warn',
  'aiflow/wc-cleanup': 'warn',
  // 关闭 AI 约束规则（库源码有自己的设计约束，不被 AI 白名单约束）
  'aiflow/token-whitelist': 'off',
  'aiflow/no-inline-style': 'off',
  'aiflow/no-recipe-break': 'off',
  'aiflow/no-variant-conflict': 'off',
  'aiflow/no-arbitrary-value': 'off',
  'aiflow/no-tailwind-syntax': 'off',
  'aiflow/prefer-component': 'off',
  'aiflow/atomic-duplicate': 'off',
};

export default [
  // 忽略：CSS（ESLint 不解析 @layer）/ node_modules / dist / docs
  // 注意：.cache/** 不忽略——ai-fix.mjs 把待修代码写入 .cache/ai-fix/snippet.js 需被 AI 规则检测
  {
    ignores: [
      'node_modules/**', 'dist/**', 'docs/**',
      'src/**/*.css', 'eslint-plugin-aiflow/**/*.css',
    ],
  },
  // 库源码：src/ 下所有 JS 文件关闭 AI 约束规则
  {
    files: ['src/**/*.js'],
    plugins: { aiflow },
    rules: { ...COMPONENT_RULES },
  },
  // AI 生成的代码 / 测试文件 / 脚本 / prompt 构建 / ai-fix 临时文件：启用完整 AI 规则集
  {
    files: ['**/*.test.js', 'test/**/*.js', 'scripts/**/*.js', 'prompt/**/*.js', 'mcp/**/*.js', '.cache/**/*.js'],
    plugins: { aiflow },
    rules: { ...AI_RULES },
  },
  // 框架适配层（vue/react wrapper）：库代码，非 L3 组件也非消费端，不受 L4 AI 约束
  // （wc-no-addeventlistener / wc-event-naming 等规则面向 Web Component 组件，wrapper 用框架 API 属正常用法）
  {
    files: ['vue/**/*.js', 'react/**/*.js'],
    plugins: { aiflow },
    rules: {},
  },
  // eslint-plugin 自身源码（index.js + rules/ + utils/）：库代码，用旧式规则 API（create/context），不受 L4 AI 约束
  {
    files: ['eslint-plugin-aiflow/**/*.js'],
    plugins: { aiflow },
    rules: {},
  },
  // ESLint 规则测试夹具 + ai-fix 循环测试 + MCP 工具测试：含故意违规用例以验证规则/修复本身，关闭 AI 约束
  {
    files: ['test/eslint-plugin/**/*.js', 'test/ai-fix.test.js', 'test/mcp.test.js'],
    plugins: { aiflow },
    rules: {
      'aiflow/token-whitelist': 'off',
      'aiflow/no-inline-style': 'off',
      'aiflow/no-recipe-break': 'off',
      'aiflow/no-variant-conflict': 'off',
      'aiflow/no-arbitrary-value': 'off',
      'aiflow/no-tailwind-syntax': 'off',
      'aiflow/prefer-component': 'off',
      'aiflow/atomic-duplicate': 'off',
    },
  },
];
