// L3.5 af-mobile/wc-block-variant-enum（warn）
// 检测：Block 类的 variant 属性必须在 defineProp 时声明枚举值，或在 onAttributeChange 中校验
// 策略：检测 defineProp(proto, 'variant', { ... }) 调用，检查是否有 enum / values / 一行注释枚举
// 或：onAttributeChange 内有 variant 的 if/switch 校验
// 适用：src/blocks/**/*.js
export default {
  meta: {
    type: 'suggestion',
    docs: { description: 'variant 属性必须限制枚举值' },
    schema: [],
    messages: {
      noEnum: "Block variant property has no enum constraint; declare allowed values via comment or validate in onAttributeChange",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    if (!/src[\\/]blocks[\\/].*\.js$/.test(filename)) return {};

    const sourceCode = context.sourceCode || context.getSourceCode();
    const source = sourceCode.getText();
    let hasVariantProp = false;
    let variantEnumDeclared = false;

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== 'MemberExpression' || callee.property?.name !== 'defineProp') return;
        const arg = node.arguments[1];
        if (arg?.type !== 'Literal' || arg.value !== 'variant') return;
        hasVariantProp = true;

        // 检查 defineProp 第三参数是否有 enum/values 字段
        const optsArg = node.arguments[2];
        if (optsArg?.type === 'ObjectExpression') {
          for (const prop of optsArg.properties) {
            if (prop.type === 'Property' && (prop.key?.name === 'enum' || prop.key?.name === 'values')) {
              variantEnumDeclared = true;
              return;
            }
          }
        }
        // 检查上方注释是否含枚举值（// variant: phone-code / password / sms）
        const line = node.loc.start.line;
        const commentLines = [];
        for (let i = line - 1; i >= 1; i--) {
          const l = sourceCode.lines[i - 1];
          if (l.trim() === '') break;
          if (/\bvariant\b.*\//.test(l) || /variant\s*:/i.test(l)) {
            commentLines.push(l);
            break;
          }
          if (l.trim().startsWith('//')) { commentLines.push(l); break; }
          break;
        }
        if (commentLines.some(l => /variant\s*:?\s*[a-z-]+(\s*\/\s*[a-z-]+)+/i.test(l))) {
          variantEnumDeclared = true;
        }
      },
      // 检测 onAttributeChange 内是否校验 variant
      MethodDefinition(node) {
        if (node.key?.name !== 'onAttributeChange') return;
        const bodyText = sourceCode.getText(node.value);
        if (/variant/.test(bodyText) && /(if|switch)/.test(bodyText)) {
          variantEnumDeclared = true;
        }
      },
      // 赋值形式：AfFoo.prototype.onAttributeChange = function (name) { ... }
      AssignmentExpression(node) {
        const left = node.left;
        if (left?.type !== 'MemberExpression' || left.property?.name !== 'onAttributeChange') return;
        const bodyText = sourceCode.getText(node.right);
        if (/variant/.test(bodyText) && /(if|switch)/.test(bodyText)) {
          variantEnumDeclared = true;
        }
      },
      'Program:exit'() {
        if (hasVariantProp && !variantEnumDeclared) {
          context.report({ loc: { line: 1, column: 0 }, messageId: 'noEnum' });
        }
      },
    };
  },
};
