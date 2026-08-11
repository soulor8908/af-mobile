// L3.5 aiflow/wc-effects-whitelist（error）
// 检测：definePage({ effects: {...} }) 的 key 只能在白名单
// 白名单：mount / unmount / route / online / offline / visible / hidden / storage / interval / resize / themechange / localechange
const WHITELIST = new Set([
  'mount', 'unmount', 'route',
  'online', 'offline', 'visible', 'hidden',
  'storage', 'interval', 'resize',
  'themechange', 'localechange',
]);

export default {
  meta: {
    type: 'problem',
    docs: { description: 'definePage.effects 的 key 只能在白名单内' },
    schema: [],
    messages: {
      invalidKey: "effects key '{{key}}' not in whitelist; allowed: mount/unmount/route/online/offline/visible/hidden/storage/interval/resize/themechange/localechange",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== 'Identifier' || callee.name !== 'definePage') return;
        const arg = node.arguments[0];
        if (!arg || arg.type !== 'ObjectExpression') return;

        const effectsProp = arg.properties.find(
          p => p.type === 'Property' && p.key?.name === 'effects'
        );
        if (!effectsProp || effectsProp.value?.type !== 'ObjectExpression') return;

        for (const prop of effectsProp.value.properties) {
          if (prop.type !== 'Property') continue;
          const key = prop.computed ? prop.key?.value : (prop.key?.name || prop.key?.value);
          if (key && !WHITELIST.has(key)) {
            context.report({ node: prop.key, messageId: 'invalidKey', data: { key } });
          }
        }
      },
    };
  },
};
