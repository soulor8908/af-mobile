// L3.5 aiflow/wc-definepage-single（error）
// 检测：单文件内 definePage( 调用数 ≤ 1
export default {
  meta: {
    type: 'problem',
    docs: { description: '每页只允许一个 definePage 调用' },
    schema: [],
    messages: {
      multiple: 'multiple definePage() calls in one file; only one page definition allowed',
    },
  },
  create(context) {
    const calls = [];
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type === 'Identifier' && callee.name === 'definePage') {
          calls.push(node);
        }
      },
      'Program:exit'() {
        if (calls.length > 1) {
          // 从第二个开始报错
          for (let i = 1; i < calls.length; i++) {
            context.report({ node: calls[i], messageId: 'multiple' });
          }
        }
      },
    };
  },
};
