// k-1 af-mobile/k-no-bare-and（error）
// k 的 html`` 子位渲染 String(val)：裸 && 在假值时把字面量 "false" 渲染成文本节点
// （JSX `cond && <X/>` 的幻觉写法；k 无"假值不渲染"语义）
// 修正：三元 `${cond ? x : null}`（null → 空串）或 Show({ when, kids })
// 仅对从 k 入口（@af-mobile/ui/k）导入的 html 生效；主包 html``（字符串拼接）不受约束
import { collectKImports } from '../utils/helpers.js';

export default {
  meta: {
    type: 'problem',
    docs: { description: 'k html`` 子位禁止裸 && 表达式（假值渲染 "false" 文本）' },
    schema: [],
    messages: {
      bareAnd: 'Bare && in k html`` renders literal text "false" when falsy — use a ternary `${cond ? x : null}` or Show({ when, kids })',
    },
  },
  create(context) {
    const kNames = collectKImports(context.sourceCode.ast.body);
    if (kNames.html.size === 0) return {};
    return {
      TaggedTemplateExpression(node) {
        if (node.tag.type !== 'Identifier' || !kNames.html.has(node.tag.name)) return;
        for (const expr of node.quasi.expressions) {
          if (expr.type === 'LogicalExpression' && expr.operator === '&&') {
            context.report({ node: expr, messageId: 'bareAnd' });
          }
        }
      },
    };
  },
};
