// L3-1 aiflow/wc-light-no-style（error）
// 检测：Light 组件（useShadow=false）中 .style.xxx 赋值 / innerHTML 含 <style> 标签
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Light DOM 组件不能有内联样式，必须用 L2 class' },
    schema: [],
    messages: {
      styleProp: "Light DOM component must use L2 recipe classes only. Custom styles → use Shadow component or recipes.project.css",
      styleTag: "Light DOM component must not contain <style> tags. Move to Shadow component or recipes.project.css",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    // 仅检查 src/components/*.js 文件
    if (!/src\/components\/.*\.js$/.test(filename)) return {};

    const sourceCode = context.sourceCode || context.getSourceCode();
    const source = sourceCode.getText();
    // 检测是否为 Light 组件（含 useShadow = false）
    if (!/useShadow\s*=\s*false/.test(source)) return {};

    return {
      AssignmentExpression(node) {
        // .style.xxx = 赋值
        if (node.left?.type === 'MemberExpression' &&
            node.left.object?.type === 'MemberExpression' &&
            node.left.object.property?.name === 'style') {
          context.report({ node, messageId: 'styleProp' });
        }
      },
      CallExpression(node) {
        // 检测 x.style.setProperty('prop', ...) 绕过：非 CSS 自定义属性（--*）的视觉属性
        const callee = node.callee;
        if (callee?.type !== 'MemberExpression') return;
        if (callee.object?.type !== 'MemberExpression') return;
        if (callee.object.property?.name !== 'style') return;
        if (callee.property?.name !== 'setProperty') return;
        const propArg = node.arguments?.[0];
        if (!propArg || propArg.type !== 'Literal' || typeof propArg.value !== 'string') return;
        // CSS 自定义属性（--*）允许：用于主题变量传递，非视觉属性
        if (propArg.value.startsWith('--')) return;
        context.report({ node, messageId: 'styleProp' });
      },
      Literal(node) {
        if (typeof node.value === 'string' && /<style[\s>]/i.test(node.value)) {
          context.report({ node, messageId: 'styleTag' });
        }
      },
      TemplateElement(node) {
        if (node.value?.raw && /<style[\s>]/i.test(node.value.raw)) {
          context.report({ node, messageId: 'styleTag' });
        }
      },
    };
  },
};
