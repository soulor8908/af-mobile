// k-2 af-mobile/k-no-object-interpolation（error）
// k 的 html`` 插值经 String(val)：对象字面量渲染成 "[object Object]" 文本
// 典型来源：主包 html`` 的可信 HTML 语法 `${{ raw: '<b>x</b>' }}` 在 k 不存在（JSX/主包双重幻觉）
// 修正：插 signal/getter、字符串或 DOM 节点；数组合法（bindKids 展开为多节点）不报
// 仅对从 k 入口（@af-mobile/ui/k）导入的 html 生效；主包 html`` 的 { raw } 语法不受约束
import { collectKImports } from '../utils/helpers.js';

export default {
  meta: {
    type: 'problem',
    docs: { description: 'k html`` 插值禁止对象字面量（渲染 "[object Object]"；k 无 { raw } 语法）' },
    schema: [],
    messages: {
      objectInterpolation: 'Object literal in k html`` renders "[object Object]" — k has no { raw } syntax; interpolate a signal/getter, string, or DOM node instead (arrays are legal, they expand to multiple nodes)',
    },
  },
  create(context) {
    const kNames = collectKImports(context.sourceCode.ast.body);
    if (kNames.html.size === 0) return {};
    return {
      TaggedTemplateExpression(node) {
        if (node.tag.type !== 'Identifier' || !kNames.html.has(node.tag.name)) return;
        for (const expr of node.quasi.expressions) {
          if (expr.type === 'ObjectExpression') {
            context.report({ node: expr, messageId: 'objectInterpolation' });
          }
        }
      },
    };
  },
};
