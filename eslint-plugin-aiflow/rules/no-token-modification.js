// L1-1 aiflow/no-token-modification（error）
// 检测：非 tokens.css / tokens.project.css 文件内，重定义 --(c|s|r|t|lh|fw|shadow|z|ease|dur)-* 变量
// 例外：路径匹配 **/tokens.css 或 **/tokens.project.css
import postcss from 'postcss';

const TOKEN_PREFIX_RE = /^--(c|s|r|t|lh|fw|shadow|z|ease|dur)-/;

export default {
  meta: {
    type: 'problem',
    docs: {
      description: '禁止在 tokens.css 之外修改/重定义设计 token 变量',
    },
    schema: [],
    messages: {
      locked: "Token variable '{{name}}' is locked. Modify tokens.css or register in tokens.project.css instead",
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    // 例外文件：tokens.css 和 tokens.project.css
    if (/tokens(\.project)?\.css$/.test(filename)) return {};

    return {
      // ESLint 9 对 .css 文件原生支持不足，用源码文本直接喂 postcss
      Program(node) {
        const source = context.sourceCode || context.getSourceCode();
        const css = source.getText();
        if (!css.includes('--')) return;
        try {
          const root = postcss.parse(css);
          root.walkDecls(decl => {
            if (TOKEN_PREFIX_RE.test(decl.prop)) {
              context.report({
                node,
                loc: {
                  // postcss 节点有 source.start/end（行从 1 起，列从 0 起 → ESLint 期望 0 起）
                  start: { line: decl.source.start.line, column: decl.source.start.column - 1 },
                  end: { line: decl.source.end.line, column: decl.source.end.column },
                },
                messageId: 'locked',
                data: { name: decl.prop },
              });
            }
          });
        } catch {
          // 非 CSS 内容（如 .js 文件恰好进入此规则）：静默跳过
        }
      },
      // 检测 JS 内 el.style.setProperty('--c-brand', ...) / removeProperty('--c-brand') 间接覆盖 token
      // 也覆盖 el.style['--c-brand'] = ... 形式
      CallExpression(node) {
        const callee = node.callee;
        if (callee?.type !== 'MemberExpression') return;
        if (callee.object?.type !== 'MemberExpression') return;
        if (callee.object.property?.name !== 'style') return;
        const method = callee.property?.name;
        if (method !== 'setProperty' && method !== 'removeProperty') return;
        const propArg = node.arguments?.[0];
        if (!propArg || propArg.type !== 'Literal' || typeof propArg.value !== 'string') return;
        if (TOKEN_PREFIX_RE.test(propArg.value)) {
          context.report({ node, messageId: 'locked', data: { name: propArg.value } });
        }
      },
      AssignmentExpression(node) {
        // el.style['--c-brand'] = ... 或 el.style.cssText = '--c-brand: ...'
        if (node.left?.type !== 'MemberExpression') return;
        if (node.left.object?.type !== 'MemberExpression') return;
        if (node.left.object.property?.name !== 'style') return;
        // 计算属性访问 el.style['--c-brand']
        const propNode = node.left.property;
        if (propNode?.type === 'Literal' && typeof propNode.value === 'string'
            && TOKEN_PREFIX_RE.test(propNode.value)) {
          context.report({ node, messageId: 'locked', data: { name: propNode.value } });
        }
        // el.style.cssText = '--c-brand: red; ...' 间接覆盖
        if (propNode?.type === 'Identifier' && propNode.name === 'cssText') {
          const valNode = node.right;
          if (valNode?.type === 'Literal' && typeof valNode.value === 'string') {
            const matches = valNode.value.match(/--[a-z][\w-]*/g) || [];
            for (const m of matches) {
              if (TOKEN_PREFIX_RE.test(m)) {
                context.report({ node, messageId: 'locked', data: { name: m } });
              }
            }
          }
        }
      },
    };
  },
};
