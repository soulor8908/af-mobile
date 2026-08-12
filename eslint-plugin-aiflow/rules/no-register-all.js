// L3 aiflow/no-register-all（error）
// 检测：registerAll() 调用（已废弃，诱导全量加载，失去 Tree Shaking）
// 正确：register('af-list', 'af-dialog') 显式列名，配合 Tree Shaking 按需打包
export default {
  meta: {
    type: 'problem',
    docs: { description: '禁止 registerAll()，改用 register(...names) 显式列名' },
    schema: [],
    messages: {
      registerAll: "registerAll() 已废弃（诱导全量加载，失去 Tree Shaking），改用 register(...names) 显式列名",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type === 'Identifier' && callee.name === 'registerAll') {
          context.report({ node, messageId: 'registerAll' });
        }
      },
    };
  },
};
