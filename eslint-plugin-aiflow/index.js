// AIFlow UI —— eslint-plugin-aiflow 入口（ESLint 9 flat config 兼容）
// 15 条规则（10 error + 5 warn），L1(2) + L2(7) + L3(6)
import noTokenModification from './rules/no-token-modification.js';
import noInlineStyle from './rules/no-inline-style.js';
import tokenWhitelist from './rules/token-whitelist.js';
import noRecipeBreak from './rules/no-recipe-break.js';
import noVariantConflict from './rules/no-variant-conflict.js';
import noArbitraryValue from './rules/no-arbitrary-value.js';
import noTailwindSyntax from './rules/no-tailwind-syntax.js';
import preferComponent from './rules/prefer-component.js';
import atomicDuplicate from './rules/atomic-duplicate.js';
import wcLightNoStyle from './rules/wc-light-no-style.js';
import wcShadowUseToken from './rules/wc-shadow-use-token.js';
import wcPartNaming from './rules/wc-part-naming.js';
import wcEventNaming from './rules/wc-event-naming.js';
import wcAriaRequired from './rules/wc-aria-required.js';
import wcCleanup from './rules/wc-cleanup.js';

const plugin = {
  meta: { name: 'eslint-plugin-aiflow', version: '1.0.0' },
  rules: {
    // L1（2 条，全部 error；tokens-css-locked 由 CODEOWNERS + 分支保护，非 ESLint 规则）
    'no-token-modification': noTokenModification,
    'no-inline-style': noInlineStyle,
    // L1-3 tokens-css-locked 是 CODEOWNERS + 分支保护，非 ESLint 规则
    // L2（7 条：4 error + 3 warn）
    'token-whitelist': tokenWhitelist,
    'no-recipe-break': noRecipeBreak,
    'no-variant-conflict': noVariantConflict,
    'no-arbitrary-value': noArbitraryValue,
    'no-tailwind-syntax': noTailwindSyntax,
    'prefer-component': preferComponent,
    'atomic-duplicate': atomicDuplicate,
    // L3（6 条：4 error + 2 warn）
    'wc-light-no-style': wcLightNoStyle,
    'wc-shadow-use-token': wcShadowUseToken,
    'wc-part-naming': wcPartNaming,
    'wc-event-naming': wcEventNaming,
    'wc-aria-required': wcAriaRequired,
    'wc-cleanup': wcCleanup,
  },
  configs: {},
};

// recommended 配置：按设计文档 L4 §3.2-3.4 的 severity 启用
Object.assign(plugin.configs, {
  recommended: {
    plugins: { aiflow: plugin },
    rules: {
      // L1 error
      'aiflow/no-token-modification': 'error',
      'aiflow/no-inline-style': 'error',
      // L2 error
      // extraComponents: af-data 属 L3.5 Block 层数据源元素（非 L3 注册组件，不在 whitelist-v1.json），
      // 但 AI 生成的页面代码（definePage/:bind 体系）需要能使用 <af-data>，故在规则级放行
      'aiflow/token-whitelist': ['error', { extraComponents: ['af-data'] }],
      'aiflow/no-recipe-break': 'error',
      'aiflow/no-arbitrary-value': 'error',
      'aiflow/no-tailwind-syntax': 'error',
      // L2 warn
      'aiflow/no-variant-conflict': 'warn',
      'aiflow/prefer-component': 'warn',
      'aiflow/atomic-duplicate': 'warn',
      // L3 error
      'aiflow/wc-light-no-style': 'error',
      'aiflow/wc-shadow-use-token': 'error',
      'aiflow/wc-event-naming': 'error',
      'aiflow/wc-aria-required': 'error',
      // L3 warn
      'aiflow/wc-part-naming': 'warn',
      'aiflow/wc-cleanup': 'warn',
    },
  },
});

export default plugin;
