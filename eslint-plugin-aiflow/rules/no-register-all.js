// L3 aiflow/no-register-all（error）
// 检测：registerAll() 调用（已废弃，诱导全量加载，失去 Tree Shaking）
// 正确：register('af-list', 'af-dialog') 显式列名，配合 Tree Shaking 按需打包
export default {
  meta: {
    type: 'problem',
    docs: { description: '禁止 registerAll()，改用 register(...names) 显式列名', fixable: 'ai-rewrite' },
    schema: [],
    messages: {
      registerAll: "registerAll() 已废弃（诱导全量加载，失去 Tree Shaking），改用 register(...names) 显式列名",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    // 非消费端放行：库源码（index.js 导出 registerAll）/单元测试/构建脚本（build.mjs 全量入口）
    if (/src[\\/]|test[\\/]|scripts[\\/]/.test(filename)) return {};
    return {
      CallExpression(node) {
        const callee = node.callee;
        const name = callee.type === 'Identifier' ? callee.name
          : callee.type === 'MemberExpression' && callee.property.type === 'Identifier' ? callee.property.name
            : null;
        if (name === 'registerAll') {
          context.report({ node, messageId: 'registerAll' });
        }
      },
    };
  },
};
