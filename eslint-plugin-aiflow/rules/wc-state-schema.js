// L3.5 aiflow/wc-state-schema（error）
// 检测：definePage({ state: {...} }) 的每个字段必须声明类型（同行或上方 // {Type} 注释）
// 正例：tab: 'all',        // String
// 反例：tab: 'all',    （无类型注释）
export default {
  meta: {
    type: 'problem',
    docs: { description: 'definePage.state 字段必须声明类型注释' },
    schema: [],
    messages: {
      missing: "state field '{{key}}' missing type comment; add '// {Type}' on same line (e.g. tab: 'all', // String)",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== 'Identifier' || callee.name !== 'definePage') return;
        const arg = node.arguments[0];
        if (!arg || arg.type !== 'ObjectExpression') return;

        const stateProp = arg.properties.find(
          p => p.type === 'Property' && p.key?.name === 'state'
        );
        if (!stateProp || stateProp.value?.type !== 'ObjectExpression') return;

        for (const prop of stateProp.value.properties) {
          if (prop.type !== 'Property') continue;
          const key = prop.computed ? prop.key?.value : (prop.key?.name || prop.key?.value);
          if (!key) continue;

          // 取当前字段所在行，检查该行尾或上一行是否有 // {Type} 注释
          const line = prop.loc.start.line;
          const lineText = sourceCode.lines[line - 1] || '';
          const prevLineText = sourceCode.lines[line - 2] || '';

          // 同行尾注释：// String / // Number / // Boolean / // Array / // Object / // Array<T> / // Object<T>
          const TYPE_RE = /\/\/\s*(String|Number|Boolean|Array(?:<[^>]+>)?|Object(?:<[^>]+>)?)/;
          // 上一行单行注释
          if (TYPE_RE.test(lineText)) continue;
          if (/\/\//.test(prevLineText) && TYPE_RE.test(prevLineText)) continue;

          context.report({ node: prop, messageId: 'missing', data: { key } });
        }
      },
    };
  },
};
