// L3-1 aiflow/wc-light-no-style（error）
// 检测：Light 组件（useShadow=false）中 .style.xxx 赋值 / innerHTML 含 <style> 标签 / innerHTML 含 style="..." 属性
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Light DOM 组件不能有内联样式，必须用 L2 class' },
    schema: [],
    messages: {
      styleProp: "Light DOM component must use L2 recipe classes only. Custom styles → use Shadow component or recipes.project.css",
      styleTag: "Light DOM component must not contain <style> tags. Move to Shadow component or recipes.project.css",
      styleAttr: 'Light DOM component must not contain style="..." attributes in innerHTML. Use L2 recipe/atomic classes instead',
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    // 仅检查 src/components/*.js 文件
    if (!/src[\\/]components[\\/].*\.js$/.test(filename)) return {};

    const sourceCode = context.sourceCode || context.getSourceCode();
    const source = sourceCode.getText();
    // 检测是否为 Light 组件（含 useShadow = false）
    if (!/useShadow\s*=\s*false/.test(source)) return {};

    // 检测 innerHTML / 模板字符串中的 style="..." 或 style='...' 属性
    // 例外：style="--xxx:..."（CSS 自定义属性传递，非视觉属性，与 setProperty('--*') 同理）
    const hasVisualStyleAttr = (str) => {
      if (!str) return false;
      // 匹配 style="..." 或 style='...'，且值非 -- 开头（CSS 自定义属性放行）
      const re = /\bstyle=(["'])([^"']*)\1/gi;
      let m;
      while ((m = re.exec(str))) {
        const val = m[2];
        // CSS 自定义属性（--xxx）放行：用于主题变量传递
        if (val.trim().startsWith('--')) continue;
        // 任何非空 style 属性都违规（视觉属性）
        if (val.trim()) return true;
      }
      return false;
    };

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
        if (typeof node.value !== 'string') return;
        // <style> 标签
        if (/<style[\s>]/i.test(node.value)) {
          context.report({ node, messageId: 'styleTag' });
        }
        // style="..." 属性（视觉属性）
        if (hasVisualStyleAttr(node.value)) {
          context.report({ node, messageId: 'styleAttr' });
        }
      },
      TemplateElement(node) {
        if (!node.value?.raw) return;
        // <style> 标签
        if (/<style[\s>]/i.test(node.value.raw)) {
          context.report({ node, messageId: 'styleTag' });
        }
        // style="..." 属性（视觉属性）
        if (hasVisualStyleAttr(node.value.raw)) {
          context.report({ node, messageId: 'styleAttr' });
        }
      },
    };
  },
};
