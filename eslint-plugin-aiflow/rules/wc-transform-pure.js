// L3.5 aiflow/wc-transform-pure（error）
// 检测：definePage({ transform }) 函数体无副作用
// 禁止：fetch / document / window / 赋值外部变量 / 调用方法（除 map/filter/reduce/Object.assign/解构）
// 允许：return { ... } / 纯函数链式调用
const ALLOWED_METHODS = new Set([
  'map', 'filter', 'reduce', 'reduceRight', 'forEach',
  'slice', 'concat', 'join', 'flat', 'flatMap',
  'keys', 'values', 'entries', 'fromEntries',
  'toString', 'valueOf', 'toFixed', 'toPrecision',
  'trim', 'split', 'replace', 'toLowerCase', 'toUpperCase',
  'Object', 'Array', 'Number', 'String', 'Boolean', 'Math',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite',
]);

// 赋值外部变量：左侧是 Identifier 且非 const/let/var 声明
// 副作用调用：fetch / setTimeout / setInterval / addEventListener 等
const FORBIDDEN_GLOBALS = new Set(['fetch', 'setTimeout', 'setInterval', 'requestAnimationFrame', 'addEventListener', 'removeEventListener']);

export default {
  meta: {
    type: 'problem',
    docs: { description: 'transform 函数体无副作用（fetch/document/window/外部赋值）' },
    schema: [],
    messages: {
      fetch: "transform contains forbidden '{{name}}()'; transform must be pure",
      dom: "transform accesses '{{name}}'; DOM/window access forbidden in transform",
      assign: "transform assigns external variable '{{name}}'; only local const/let declarations allowed",
      call: "transform calls method '{{name}}' which may have side effects",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        // 只在 definePage.transform 函数体内检测
        if (!isInTransform(node, context)) return;
        const callee = node.callee;

        // fetch(...) / setTimeout(...) 等全局副作用调用
        if (callee.type === 'Identifier' && FORBIDDEN_GLOBALS.has(callee.name)) {
          context.report({ node: callee, messageId: 'fetch', data: { name: callee.name } });
          return;
        }
        // obj.fetch(...) 形式
        if (callee.type === 'MemberExpression' && callee.property?.name === 'fetch') {
          context.report({ node: callee.property, messageId: 'fetch', data: { name: 'fetch' } });
          return;
        }
        // 方法调用：检查是否在白名单内
        if (callee.type === 'MemberExpression') {
          const methodName = callee.property?.name;
          if (methodName && !ALLOWED_METHODS.has(methodName)) {
            // 但允许 obj.method() 其中 obj 是参数字段（如 raw.list.map）
            // 启发式：只对显式副作用方法报错
            if (['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'set', 'add', 'delete', 'clear'].includes(methodName)) {
              context.report({ node: callee.property, messageId: 'call', data: { name: methodName } });
            }
          }
        }
      },
      MemberExpression(node) {
        if (!isInTransform(node, context)) return;
        // document.xxx / window.xxx 访问
        const obj = node.object;
        if (obj.type === 'Identifier' && (obj.name === 'document' || obj.name === 'window' || obj.name === 'globalThis')) {
          context.report({ node: obj, messageId: 'dom', data: { name: obj.name } });
        }
      },
      AssignmentExpression(node) {
        if (!isInTransform(node, context)) return;
        // 赋值左侧是 Identifier（非成员表达式）→ 外部变量赋值
        // 排除 transform 函数体内的 const/let/var 声明（那是 VariableDeclaration，不走 AssignmentExpression）
        if (node.left.type === 'Identifier') {
          context.report({ node: node.left, messageId: 'assign', data: { name: node.left.name } });
        }
      },
    };
  },
};

// 判断节点是否在 definePage({ transform: () => { ... } }) 函数体内
function isInTransform(node, context) {
  let parent = node.parent;
  while (parent) {
    if (parent.type === 'Property' &&
        parent.key?.type === 'Identifier' &&
        parent.key.name === 'transform' &&
        parent.parent?.type === 'ObjectExpression') {
      // 上溯检查是否在 definePage 调用
      let p = parent.parent.parent;
      while (p) {
        if (p.type === 'CallExpression' && p.callee?.type === 'Identifier' && p.callee.name === 'definePage') {
          return true;
        }
        p = p.parent;
      }
    }
    parent = parent.parent;
  }
  return false;
}
