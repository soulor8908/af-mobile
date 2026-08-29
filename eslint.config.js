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

// L3.5 Block 实验标签放行（A/B 实验期）：不进 whitelist-v1.json——默认 System Prompt 的标签云/组件表
// 仍不含 Block（l3.5 冻结声明），仅放行 lint，供 build-prompt BLOCK_META 与 Block 臂生成页使用。
// 消费端项目同样经 extraComponents 登记（token-whitelist 规则的错误提示即指引该路径）
const BLOCK_TAGS_OPT = { extraComponents: ['af-product-card', 'af-setting-group', 'af-product-grid', 'af-order-list', 'af-auth-form'] };

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
  // L3.5 Block 源码：组件质量规则 + Block 协议规则（五态/props 2-5/variant 枚举，仅组件文件；index.js 入口与 list-block 基座不适用）
  {
    files: ['src/blocks/af-*.js'],
    plugins: { 'af-mobile': afMobilePlugin },
    rules: {
      ...COMPONENT_RULES,
      'af-mobile/wc-block-states': 'error',
      'af-mobile/wc-block-props-count': 'error',
      'af-mobile/wc-block-no-internal-ref': 'error',
      'af-mobile/wc-block-variant-enum': 'warn',
    },
  },
  // AI 生成的代码 / 测试文件 / 脚本 / prompt 构建 / e2e / ai-fix 临时文件：启用完整 AI 规则集
  // .mjs 一并覆盖（docs/incidents.md #9：ESLint 范围必须覆盖所有含 JS 的目录）
  // scripts/ 与 .cache/ 含 Block 标签字面量（build-prompt BLOCK_META / Block 臂生成页）→ extraComponents 放行
  {
    files: ['**/*.test.js', 'test/**/*.js', 'scripts/**/*.js', 'scripts/**/*.mjs', 'e2e/**/*.js', 'mcp/**/*.js', 'mcp/**/*.mjs', 'eval/**/*.mjs'],
    ignores: ['mcp/dist/**'], // dist 为构建产物（内嵌 prompt 机制源码字面量），不参与 lint
    plugins: { 'af-mobile': afMobilePlugin },
    rules: { ...AI_RULES },
  },
  {
    files: ['.cache/**/*.js'],
    plugins: { 'af-mobile': afMobilePlugin },
    rules: { ...AI_RULES, 'af-mobile/token-whitelist': ['error', BLOCK_TAGS_OPT] },
  },
  // scripts/ 中 build-prompt.mjs 的 BLOCK_META 含 <af-product-*> 字面量（仅提示文本，非消费代码）
  {
    files: ['scripts/**/*.js', 'scripts/**/*.mjs'],
    plugins: { 'af-mobile': afMobilePlugin },
    rules: { 'af-mobile/token-whitelist': ['error', BLOCK_TAGS_OPT] },
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
  // create-af-mobile 薄壳 CLI + prompt 包 CLI（bin.mjs/index.mjs，无 DOM/CSS）：库代码，不受 AI 白名单约束
  {
    files: ['create-af-mobile/**/*.mjs', 'prompt/**/*.mjs'],
    plugins: { 'af-mobile': afMobilePlugin },
    rules: {},
  },
  // Starter 模板页面代码：消费端代码，启用完整 AI 规则集（模板自身必须过自己的约束闸门）
  {
    files: ['starter/src/**/*.js'],
    plugins: { 'af-mobile': afMobilePlugin },
    rules: { ...AI_RULES },
  },
  // Demo 页面代码：消费端示范代码，启用完整 AI 规则集（demo 是 AI 学习组件库的第一手素材，本身必须合规）
  // 分层沿用 scripts/check-demo.mjs 的既有设计意图：
  //   demo/components/ + demo/scenarios/ = 组件示范区（AI 逐行模仿）→ 严格白名单
  //   demo/playground/ + props-panel.js  = 宿主页面（调试台/属性面板）→ 宿主骨架 class 豁免白名单
  // 注：demo 目录曾长期不在 lint 范围（docs/incidents.md #9），导致 25 处违规被 demo:check 漏检
  {
    files: ['demo/components/**/*.js', 'demo/scenarios/**/*.js'],
    plugins: { 'af-mobile': afMobilePlugin },
    rules: { ...AI_RULES, 'af-mobile/token-whitelist': ['error', BLOCK_TAGS_OPT] },
  },
  {
    files: ['demo/playground/**/*.js', 'demo/props-panel.js'],
    plugins: { 'af-mobile': afMobilePlugin },
    rules: { ...AI_RULES, 'af-mobile/token-whitelist': 'off' },
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
