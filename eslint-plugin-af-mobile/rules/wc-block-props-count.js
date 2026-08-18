// L3.5 af-mobile/wc-block-props-count（error）
// 检测：Block 类的 AfElement.defineProp 调用数必须在 2-5 之间
// 适用：src/blocks/**/*.js
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Block props 数必须在 2-5' },
    schema: [],
    messages: {
      tooFew: "Block '{{name}}' has {{n}} prop(s); minimum is 2 (合并到现有 Block 或补充必要 props)",
      tooMany: "Block '{{name}}' has {{n}} props; maximum is 5 (拆分为多个 Block)",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    if (!/src[\\/]blocks[\\/].*\.js$/.test(filename)) return {};

    const MIN = 2, MAX = 5;
    let definePropCalls = 0;
    let className = 'unknown';

    return {
      ClassDeclaration(node) {
        if (node.id?.name) className = node.id.name;
      },
      CallExpression(node) {
        // 匹配 AfElement.defineProp(...) 或 this.constructor.defineProp(...)
        const callee = node.callee;
        const isDefineProp =
          (callee.type === 'MemberExpression' &&
           callee.property?.type === 'Identifier' &&
           callee.property.name === 'defineProp') ||
          (callee.type === 'MemberExpression' &&
           callee.object?.type === 'MemberExpression' &&
           callee.object.property?.name === 'constructor' &&
           callee.property?.name === 'defineProp');
        if (isDefineProp) definePropCalls++;
      },
      'Program:exit'() {
        if (definePropCalls > 0 && definePropCalls < MIN) {
          context.report({ loc: { line: 1, column: 0 }, messageId: 'tooFew', data: { name: className, n: definePropCalls } });
        } else if (definePropCalls > MAX) {
          context.report({ loc: { line: 1, column: 0 }, messageId: 'tooMany', data: { name: className, n: definePropCalls } });
        }
      },
    };
  },
};
