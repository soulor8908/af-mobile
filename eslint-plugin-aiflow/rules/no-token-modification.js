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
    };
  },
};
