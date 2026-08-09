// L3-4 aiflow/wc-event-naming（error，可自动修）
// 检测：emit('xxx') 调用名不匹配 /^af-[a-z0-9]+:[a-z]+$/
const EVENT_RE = /^af-[a-z0-9]+:[a-z]+$/;

export default {
  meta: {
    type: 'problem',
    docs: { description: '事件名必须匹配 af-{component}:{action} 格式' },
    schema: [],
    messages: {
      naming: "Event name '{{name}}' should match 'af-{component}:{action}' (e.g. 'af-list:loadmore')",
    },
    fixable: 'code',
  },
  create(context) {
    return {
      CallExpression(node) {
        // 检测 emit('xxx') 或 this.emit('xxx')
        const callee = node.callee;
        const isEmit = (callee.type === 'Identifier' && callee.name === 'emit') ||
                       (callee.type === 'MemberExpression' && callee.property?.name === 'emit');
        if (!isEmit) return;
        const arg = node.arguments[0];
        if (arg?.type !== 'Literal' || typeof arg.value !== 'string') return;
        const name = arg.value;
        if (EVENT_RE.test(name)) return;
        // 自动修：尝试转换为 af-xxx:yyy 格式
        let fixed = name;
        // snake_case / camelCase → kebab + colon
        fixed = fixed.replace(/_/g, '-')
          .replace(/([a-z])([A-Z])/g, '$1-$2')
          .toLowerCase();
        // 如果不含冒号，尝试在组件名后插入冒号
        if (!fixed.includes(':')) {
          // 检测 af- 前缀
          if (fixed.startsWith('af-')) {
            // 在 af-xxx 后插入 : （xxx 是第一个单词）
            fixed = fixed.replace(/^af-([a-z0-9]+)/, 'af-$1:');
          } else {
            // 无 af- 前缀，添加 af- 前缀 + 冒号
            fixed = 'af-component:' + fixed;
          }
        }
        context.report({
          node: arg,
          messageId: 'naming',
          data: { name },
          fix(fixer) {
            return fixer.replaceText(arg, `'${fixed}'`);
          },
        });
      },
    };
  },
};
