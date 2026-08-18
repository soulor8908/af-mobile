// L3-2 af-mobile/wc-shadow-use-token（error）
// 检测：Shadow 组件 CSS 字符串中颜色/间距/字号/圆角硬编码（非 var(--*)）
// 例外：backdrop 遮罩半透明黑
import postcss from 'postcss';

// 硬编码模式：颜色（#xxx / rgb / rgba / 命名色）、间距（Npx / Nrem）、字号、圆角
const COLOR_RE = /(#([0-9a-f]{3,8})\b|rgb\(|rgba\(|\b(red|blue|green|white|black|gray|yellow|orange|purple|pink|brown|cyan)\b)/i;
const SIZE_RE = /\b\d+(px|rem)\b/;

// 需要检查的 CSS 属性
const CHECKED_PROPS = new Set([
  'color', 'background', 'background-color', 'border-color', 'border',
  'padding', 'margin', 'font-size', 'border-radius', 'width', 'height',
  'top', 'right', 'bottom', 'left', 'gap', 'box-shadow',
]);

// 例外属性值（放行）
const EXCEPTIONS = /backdrop|mask/i;

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Shadow 组件 CSS 必须使用 token 变量' },
    schema: [],
    messages: {
      hardcoded: "'{{prop}}: {{value}}' in Shadow CSS must use var(--*). Use token variables for cross-theme visual consistency",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    if (!/src[\\/](?:charts[\\/])?components[\\/].*\.js$/.test(filename)) return {};

    const sourceCode = context.sourceCode || context.getSourceCode();
    const source = sourceCode.getText();
    // 仅检查 Shadow 组件（含 useShadow = true）
    if (!/useShadow\s*=\s*true/.test(source)) return {};

    // 提取 JS 中所有模板字符串内容（CSS 常量）
    function checkCss(cssText, node) {
      if (!cssText.includes(':')) return;
      try {
        const root = postcss.parse(cssText);
        root.walkDecls(decl => {
          if (!CHECKED_PROPS.has(decl.prop)) return;
          // 放行 var(--*) 值
          if (/^var\(/.test(decl.value.trim())) return;
          // 放行 backdrop 例外：选择器含 ::backdrop（遮罩半透明黑，L1 无 mask token，见 L4 §3.4 L3-2）
          const selector = decl.parent?.selector || '';
          if (EXCEPTIONS.test(selector) || EXCEPTIONS.test(decl.prop) || EXCEPTIONS.test(decl.value)) return;
          // 检测硬编码
          if (COLOR_RE.test(decl.value) || SIZE_RE.test(decl.value)) {
            context.report({
              node,
              loc: {
                start: { line: decl.source.start.line, column: decl.source.start.column - 1 },
                end: { line: decl.source.end.line, column: decl.source.end.column },
              },
              messageId: 'hardcoded',
              data: { prop: decl.prop, value: decl.value },
            });
          }
        });
      } catch { /* 非 CSS 内容跳过 */ }
    }

    return {
      TemplateElement(node) {
        if (node.value?.raw) checkCss(node.value.raw, node);
      },
    };
  },
};
