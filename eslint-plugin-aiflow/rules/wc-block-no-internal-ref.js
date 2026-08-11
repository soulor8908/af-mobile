// L3.5 aiflow/wc-block-no-internal-ref（error）
// 检测：消费端代码（非 src/）禁止穿透 Block 边界访问内部
// 反例：querySelector('af-auth-form > div') / blockInstance.shadowRoot.querySelector(...)
// 正例：document.querySelector('af-auth-form').setAttribute('loading', 'true')
export default {
  meta: {
    type: 'problem',
    docs: { description: '消费端禁止穿透 Block 边界访问内部' },
    schema: [],
    messages: {
      childSelector: "querySelector('{{sel}}') penetrates Block boundary; only root tag selector allowed (e.g. 'af-auth-form')",
      shadowRoot: "accessing .shadowRoot of Block '{{name}}' is forbidden; use props/events only",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    // 库源码放行：库作者实现 Block 内部
    if (/src[\\/](components|blocks|lib)[\\/].*\.js$/.test(filename)) return {};
    // 测试夹具放行
    if (/test[\\/]eslint-plugin[\\/]/.test(filename)) return {};

    // af-* 标签选择器（含子代/后代穿透）：af-xxx > 或 af-xxx 空格 后跟其他选择器
    const PENETRATE_RE = /af-[a-z]+(?:[>+~]|\s+[^,)\]]+)/;

    return {
      CallExpression(node) {
        const callee = node.callee;
        // 匹配 xxx.querySelector(...) / querySelectorAll(...)
        if (callee.type !== 'MemberExpression') return;
        const propName = callee.property?.name;
        if (propName !== 'querySelector' && propName !== 'querySelectorAll') return;

        const selArg = node.arguments[0];
        if (!selArg) return;
        let sel = '';
        if (selArg.type === 'Literal' && typeof selArg.value === 'string') sel = selArg.value;
        else if (selArg.type === 'TemplateLiteral' && selArg.quasis.length === 1) sel = selArg.quasis[0].value.raw;

        // 穿透检测：af-xxx > div / af-xxx div / af-xxx > .foo
        if (sel && PENETRATE_RE.test(sel)) {
          context.report({ node: selArg, messageId: 'childSelector', data: { sel } });
        }
      },
      // 检测 blockInstance.shadowRoot 访问
      MemberExpression(node) {
        // 形如 xxx.shadowRoot
        if (node.property?.type === 'Identifier' && node.property.name === 'shadowRoot') {
          // 只对 af-* 开头的变量名报错（近似 Block 实例）
          const obj = node.object;
          let name = '';
          if (obj.type === 'Identifier') name = obj.name;
          else if (obj.type === 'MemberExpression' && obj.property?.name) name = obj.property.name;
          // 启发式：变量名含 af 或块名关键词视为 Block 实例
          if (/af|block|form|grid|card|list/i.test(name)) {
            context.report({ node: node.property, messageId: 'shadowRoot', data: { name } });
          }
        }
      },
    };
  },
};
