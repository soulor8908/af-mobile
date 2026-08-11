// L3.5 aiflow/wc-no-addeventlistener（error）
// 检测：消费端代码（非 src/）禁止裸 addEventListener，必须走 definePage.effects 或 @event 绑定
// 例外：同行或上一行有 // eslint-disable-next-line wc-no-addeventlistener 注释
export default {
  meta: {
    type: 'problem',
    docs: { description: '消费端禁止裸 addEventListener，必须走 effects 或 @event' },
    schema: [],
    messages: {
      forbidden: "bare addEventListener forbidden; use definePage.effects (whitelist keys) or @event binding. Add '// eslint-disable-next-line wc-no-addeventlistener' with reason for exceptions (e.g. third-party SDK callbacks)",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    // 库源码放行：src/components/ 和 src/blocks/ 和 src/lib/ 内部允许 addEventListener（库作者实现交互）
    if (/src[\\/](components|blocks|lib)[\\/].*\.js$/.test(filename)) return {};
    // 测试目录放行：单元测试不属消费端代码，验证组件行为需要 addEventListener
    if (/test[\\/].*\.js$/.test(filename)) return {};
    // ESLint 规则测试夹具放行（夹具故意违规）
    if (/test[\\/]eslint-plugin[\\/]/.test(filename)) return {};

    const sourceCode = context.sourceCode || context.getSourceCode();
    const comments = sourceCode.getAllComments();
    // 收集所有 disable 注释所在行
    const disabledLines = new Set();
    for (const c of comments) {
      if (/eslint-disable-next-line.*wc-no-addeventlistener/.test(c.value)) {
        disabledLines.add(c.loc.end.line); // 注释行的下一行被禁用
      }
    }

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type === 'MemberExpression' &&
            callee.property?.type === 'Identifier' &&
            callee.property.name === 'addEventListener') {
          const line = node.loc.start.line;
          // 检查当前行或上一行是否有 disable 注释
          if (disabledLines.has(line) || disabledLines.has(line - 1)) return;
          context.report({ node: callee.property, messageId: 'forbidden' });
        }
      },
    };
  },
};
