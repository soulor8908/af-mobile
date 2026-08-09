// AIFlow UI —— eslint-plugin-aiflow 入口（ESLint 9 flat config 兼容）
// 16 条规则（13 error + 3 warn），本文件先实装 2 条最小闭环，其余逐步补充
import noTokenModification from './rules/no-token-modification.js';
import noInlineStyle from './rules/no-inline-style.js';

const plugin = {
  meta: { name: 'eslint-plugin-aiflow', version: '1.0.0' },
  rules: {
    'no-token-modification': noTokenModification,
    'no-inline-style': noInlineStyle,
  },
  configs: {},
};

// recommended 配置：所有已实装规则按设计文档 severity 启用
Object.assign(plugin.configs, {
  recommended: {
    plugins: { aiflow: plugin },
    rules: {
      'aiflow/no-token-modification': 'error',
      'aiflow/no-inline-style': 'error',
    },
  },
});

export default plugin;
