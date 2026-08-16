// L3-6 aiflow/wc-cleanup（warn）
// 检测：组件 JS 中有 addEventListener/IntersectionObserver/ResizeObserver/setTimeout/setInterval/rAF
//       但 unmounted() 内无对应清理调用
const RESOURCE_PATTERNS = [
  { name: 'addEventListener', cleanup: 'removeEventListener', msg: "addEventListener has no matching removeEventListener in unmounted(); potential memory leak" },
  { name: 'IntersectionObserver', cleanup: 'disconnect', msg: "IntersectionObserver has no matching disconnect() in unmounted(); potential memory leak" },
  { name: 'ResizeObserver', cleanup: 'disconnect', msg: "ResizeObserver has no matching disconnect() in unmounted(); potential memory leak" },
  { name: 'setTimeout', cleanup: 'clearTimeout', msg: "setTimeout has no matching clearTimeout() in unmounted(); potential memory leak" },
  { name: 'setInterval', cleanup: 'clearInterval', msg: "setInterval has no matching clearInterval() in unmounted(); potential memory leak" },
  { name: 'requestAnimationFrame', cleanup: 'cancelAnimationFrame', msg: "requestAnimationFrame has no matching cancelAnimationFrame() in unmounted(); potential leak" },
];

export default {
  meta: {
    type: 'suggestion',
    docs: { description: '检测资源未在 unmounted() 中清理' },
    schema: [],
    messages: {
      leak: '{{name}} {{msg}}',
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    if (!/src[\\/](?:charts[\\/])?components[\\/].*\.js$/.test(filename)) return {};

    const sourceCode = context.sourceCode || context.getSourceCode();
    const found = new Map(); // resource name → true

    return {
      CallExpression(node) {
        const callee = node.callee;
        let name = null;
        if (callee.type === 'Identifier') name = callee.name;
        else if (callee.type === 'MemberExpression') name = callee.property?.name;
        else if (callee.type === 'NewExpression') name = callee.callee?.name;
        // new IntersectionObserver(...) 的 callee 是 Identifier
        if (!name && callee.type === 'Identifier') name = callee.name;

        for (const p of RESOURCE_PATTERNS) {
          if (name === p.name || (node.callee?.type === 'Identifier' && node.callee.name === p.name)) {
            found.set(p.name, p);
            break;
          }
          // new IntersectionObserver / new ResizeObserver
          if (callee.type === 'Identifier' && callee.name === p.name) {
            found.set(p.name, p);
            break;
          }
        }
      },
      NewExpression(node) {
        const name = node.callee?.name;
        for (const p of RESOURCE_PATTERNS) {
          if (name === p.name) { found.set(p.name, p); break; }
        }
      },
      'Program:exit'() {
        const source = sourceCode.getText();
        // 检测 unmounted 方法是否存在（宽松匹配：unmounted() { ... } 到匹配的闭合大括号）
        // 用计数法提取 unmounted body，支持任意层级嵌套
        let unmountedBody = '';
        const startMatch = source.match(/unmounted\s*\(\s*\)\s*\{/);
        if (startMatch) {
          let depth = 1;
          let i = startMatch.index + startMatch[0].length;
          while (i < source.length && depth > 0) {
            if (source[i] === '{') depth++;
            else if (source[i] === '}') depth--;
            if (depth > 0) unmountedBody += source[i];
            i++;
          }
        }
        for (const [name, p] of found) {
          if (!unmountedBody.includes(p.cleanup)) {
            context.report({ loc: { line: 1, column: 0 }, messageId: 'leak', data: { name, msg: p.msg } });
          }
        }
      },
    };
  },
};
