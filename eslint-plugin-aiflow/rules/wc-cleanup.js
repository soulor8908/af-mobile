// L3-6 aiflow/wc-cleanup（warn）
// 检测两类资源泄漏（覆盖 src/components 与 src/blocks）：
// 1) addEventListener 未通过 this._listen() 登记（传 signal 选项的原生自动解绑除外）
//    —— 基类 disconnectedCallback 统一解绑 _listeners，绕过登记即泄漏
// 2) IntersectionObserver/ResizeObserver/MutationObserver/setTimeout/setInterval/rAF
//    在 unmounted() 中无对应清理调用
const TIMERS = [
  { name: 'setTimeout', cleanup: 'clearTimeout' },
  { name: 'setInterval', cleanup: 'clearInterval' },
  { name: 'requestAnimationFrame', cleanup: 'cancelAnimationFrame' },
];
const OBSERVERS = ['IntersectionObserver', 'ResizeObserver', 'MutationObserver'];

export default {
  meta: {
    type: 'problem',
    docs: { description: '组件资源清理：addEventListener 走 _listen，观察器/定时器在 unmounted() 清理' },
    schema: [],
    messages: {
      listen: 'addEventListener 需通过 this._listen(target, type, handler) 登记，由基类在断开时统一解绑（AbortController 场景可传 { signal }）',
      leak: '{{name}} 需在 unmounted() 中调用 {{cleanup}}，否则潜在内存泄漏',
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    // 覆盖 src/components、src/blocks 与 charts 子库 src/charts/components
    if (!/src[\\/](?:charts[\\/])?(?:components|blocks)[\\/].*\.js$/.test(filename)) return {};

    const sourceCode = context.sourceCode || context.getSourceCode();
    const leaks = []; // { node, name, cleanup }

    const hasSignal = (args) => args.some((a) => a.type === 'ObjectExpression'
      && a.properties.some((p) => p.key?.name === 'signal'));

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type === 'MemberExpression' && callee.property?.name === 'addEventListener') {
          if (!hasSignal(node.arguments)) context.report({ node, messageId: 'listen' });
          return;
        }
        if (callee.type === 'Identifier') {
          const p = TIMERS.find((t) => t.name === callee.name);
          if (p) leaks.push({ node, name: p.name, cleanup: p.cleanup });
        }
      },
      NewExpression(node) {
        if (OBSERVERS.includes(node.callee?.name)) {
          leaks.push({ node, name: node.callee.name, cleanup: 'disconnect' });
        }
      },
      'Program:exit'() {
        // 提取 unmounted() 方法体文本（括号计数，支持任意嵌套）
        const source = sourceCode.getText();
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
        for (const l of leaks) {
          if (!unmountedBody.includes(l.cleanup)) {
            context.report({ node: l.node, messageId: 'leak', data: { name: l.name, cleanup: l.cleanup } });
          }
        }
      },
    };
  },
};
