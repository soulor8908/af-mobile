// af-mobile UI —— 项目 ESLint 配置（flat config）
import afMobilePlugin from './eslint-plugin-af-mobile/index.js';

// AI 代码约束规则集（token-whitelist/no-inline-style/no-recipe-break 等）
// 仅约束 AI 生成的代码，不约束库源码（库有设计文档约束）
const AI_RULES = afMobilePlugin.configs.recommended.rules;

// 库源码 L3 代码质量规则（组件文件适用）
// 启用 L3 全部 6 条规则（wc-light-no-style/wc-shadow-use-token/wc-part-naming/wc-event-naming/wc-aria-required/wc-cleanup）
const COMPONENT_RULES = {
  // L3 error
  'af-mobile/wc-light-no-style': 'error',
  'af-mobile/wc-shadow-use-token': 'error',
  'af-mobile/wc-event-naming': 'error',
  'af-mobile/wc-aria-required': 'error',
  // L3 warn
  'af-mobile/wc-part-naming': 'warn',
  'af-mobile/wc-cleanup': 'warn',
  // 关闭 AI 约束规则（库源码有自己的设计约束，不被 AI 白名单约束）
  'af-mobile/token-whitelist': 'off',
  'af-mobile/no-inline-style': 'off',
  'af-mobile/no-recipe-break': 'off',
  'af-mobile/no-variant-conflict': 'off',
  'af-mobile/no-arbitrary-value': 'off',
  'af-mobile/no-tailwind-syntax': 'off',
  'af-mobile/prefer-component': 'off',
  'af-mobile/atomic-duplicate': 'off',
};

export default [
  // 忽略：CSS（ESLint 不解析 @layer）/ node_modules / dist / docs
  // 注意：.cache/** 不忽略——ai-fix.mjs 把待修代码写入 .cache/ai-fix/snippet.js 需被 AI 规则检测
  {
    ignores: [
      'node_modules/**', 'dist/**', 'docs/**',
      'starter/node_modules/**', 'starter/dist/**',
      'mcp/dist/**', 'prompt/dist/**',
      'src/**/*.css', 'eslint-plugin-af-mobile/**/*.css',
    ],
  },
  // 库源码：src/ 下所有 JS 文件关闭 AI 约束规则
  {
    files: ['src/**/*.js'],
    plugins: { 'af-mobile': afMobilePlugin },
    rules: { ...COMPONENT_RULES },
  },
  // AI 生成的代码 / 测试文件 / 脚本 / prompt 构建 / ai-fix 临时文件：启用完整 AI 规则集
  // .mjs 一并覆盖（AGENTS #9：ESLint 范围必须覆盖所有含 JS 的目录）
  {
    files: ['**/*.test.js', 'test/**/*.js', 'scripts/**/*.js', 'scripts/**/*.mjs', 'prompt/**/*.js', 'mcp/**/*.js', 'mcp/**/*.mjs', 'eval/**/*.mjs', '.cache/**/*.js'],
    plugins: { 'af-mobile': afMobilePlugin },
    rules: { ...AI_RULES },
  },
  // eslint-plugin 自身源码（index.js + rules/ + utils/）：库代码，用旧式规则 API（create/context），不受 L4 AI 约束
  {
    files: ['eslint-plugin-af-mobile/**/*.js'],
    plugins: { 'af-mobile': afMobilePlugin },
    rules: {},
  },
  // adapters 包源码（supabase:// 等 scheme 适配器）：库代码，无 DOM/CSS，不受 AI 白名单约束
  {
    files: ['adapters/**/*.js'],
    plugins: { 'af-mobile': afMobilePlugin },
    rules: {},
  },
  // create-af-mobile 薄壳 CLI：库代码，无 DOM/CSS，不受 AI 白名单约束
  {
    files: ['create-af-mobile/**/*.mjs'],
    plugins: { 'af-mobile': afMobilePlugin },
    rules: {},
  },
  // Starter 模板页面代码：消费端代码，启用完整 AI 规则集（模板自身必须过自己的约束闸门）
  {
    files: ['starter/src/**/*.js'],
    plugins: { 'af-mobile': afMobilePlugin },
    rules: { ...AI_RULES },
  },
  // ESLint 规则测试夹具 + ai-fix 循环测试 + 修复循环回归测试 + MCP 工具测试 + lint 采集测试：含故意违规用例以验证规则/修复/采集本身，关闭 AI 约束
  {
    files: ['test/eslint-plugin/**/*.js', 'test/ai-fix.test.js', 'test/fix-loop-regression.test.js', 'test/mcp.test.js', 'test/mcp-bundle.test.js', 'test/lint-flywheel.test.js'],
    plugins: { 'af-mobile': afMobilePlugin },
    rules: {
      'af-mobile/token-whitelist': 'off',
      'af-mobile/no-inline-style': 'off',
      'af-mobile/no-recipe-break': 'off',
      'af-mobile/no-variant-conflict': 'off',
      'af-mobile/no-arbitrary-value': 'off',
      'af-mobile/no-tailwind-syntax': 'off',
      'af-mobile/prefer-component': 'off',
      'af-mobile/atomic-duplicate': 'off',
      'af-mobile/no-emoji-icon': 'off',
    },
  },
];
