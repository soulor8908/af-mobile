// L3 af-mobile/no-register-all（error）
// 检测：registerAll() 调用（已废弃/已移除，诱导全量加载，失去 Tree Shaking）
// 正确：register('af-list', 'af-dialog') 显式列名，配合 Tree Shaking 按需打包
export default {
  meta: {
    type: 'problem',
    docs: { description: '禁止 registerAll()，改用 register(...names) 显式列名', fixable: 'ai-rewrite' },
    schema: [],
    messages: {
      registerAll: "registerAll() 已废弃/已移除（全量注册 = 全局引入），改用 register(...names) 显式列名",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    // 非消费端放行：单元测试夹具 / 构建脚本
    // 注意：原正则含 `src[\\/]` 会误伤消费端 src/main.js——消费端恰恰是要约束的对象。
    // 库源码 src/ 不在此 skip 也安全：库源码已移除 registerAll（按需引入铁律）。
    if (/test[\\/]|scripts[\\/]/.test(filename)) return {};
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
