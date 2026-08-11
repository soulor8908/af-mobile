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

// L3.5 Block 层规则（src/blocks/ 适用）
// 库作者写 Block，启用 Block 自身质量规则 + L3 Light DOM 规则
// 不启用消费端规则（no-internal-ref/effects-whitelist/transform-pure/bind-syntax/no-addeventlistener/definepage-single/state-schema/pure-function 是约束 AI 生成代码的）
const BLOCK_RULES = {
  ...COMPONENT_RULES,
  // L3.5 Block 质量规则
  'aiflow/wc-block-states': 'error',
  'aiflow/wc-block-props-count': 'error',
  'aiflow/wc-block-variant-enum': 'warn',
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
  // 库源码：src/blocks/ 下 Block 文件启用 BLOCK_RULES（含 Block 质量规则 + L3 Light DOM 规则）
  {
    files: ['src/blocks/**/*.js'],
    plugins: { aiflow },
    rules: { ...BLOCK_RULES },
  },
  // 库源码：src/components/ 和 src/lib/ 下 JS 文件用 COMPONENT_RULES（不启用 Block 规则）
  {
    files: ['src/components/**/*.js', 'src/lib/**/*.js', 'src/index.js'],
    plugins: { aiflow },
    rules: { ...COMPONENT_RULES },
  },
  // AI 生成的代码 / 测试文件 / 脚本 / ai-fix 临时文件：启用完整 AI 规则集
  {
    files: ['**/*.test.js', 'test/**/*.js', 'scripts/**/*.js', '.cache/**/*.js'],
    plugins: { aiflow },
    rules: { ...AI_RULES },
  },
  // ESLint 规则测试夹具 + ai-fix 循环测试：含故意违规用例以验证规则/修复本身，关闭 AI 约束
  {
    files: ['test/eslint-plugin/**/*.js', 'test/ai-fix.test.js'],
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
