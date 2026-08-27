// k-3 af-mobile/k-for-require-key（warn）
// For 省略 key 时以项本身为键：原始值列表语义正确；对象列表以引用为键——
// 数据源每次 set 新数组即整行重建，keyed 复用失效（src/k/README.md 词表卡 key 边界）
// 修正：显式传 key: 'id'（稳定字段名）；纯原始值列表可显式关闭本规则
// 仅对从 k 入口（@af-mobile/ui/k）导入的 For 生效
import { collectKImports } from '../utils/helpers.js';

export default {
  meta: {
    type: 'suggestion',
    docs: { description: 'k For 建议显式传 key（对象项省略 key 以引用为键，引用变则整行重建）' },
    schema: [],
    messages: {
      forKeyMissing: 'For is missing "key" — object items are keyed by reference when omitted, so every source change rebuilds all rows; pass key: "id" (primitive lists may disable this rule)',
    },
  },
  create(context) {
    const kNames = collectKImports(context.sourceCode.ast.body);
    if (kNames.For.size === 0) return {};
    return {
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || !kNames.For.has(node.callee.name)) return;
        const arg = node.arguments[0];
        if (!arg || arg.type !== 'ObjectExpression') return;
        const hasKey = arg.properties.some((p) => p.type === 'Property' && (
          (p.key.type === 'Identifier' && p.key.name === 'key')
          || (p.key.type === 'Literal' && p.key.value === 'key')
        ));
        if (!hasKey) context.report({ node: arg, messageId: 'forKeyMissing' });
      },
    };
  },
};
