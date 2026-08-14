// L3.5 aiflow/wc-definepage-single（error）
// 检测：单文件内 definePage( 调用数 ≤ 1
export default {
  meta: {
    type: 'problem',
    docs: { description: '每页只允许一个 definePage 调用', fixable: 'manual' },
    schema: [],
    messages: {
      multiple: 'multiple definePage() calls in one file; only one page definition allowed',
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    // 非消费端放行：库源码/单元测试（page.test.js 需多 definePage 隔离）/构建脚本
    if (/src[\\/]|test[\\/]|scripts[\\/]/.test(filename)) return {};
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
