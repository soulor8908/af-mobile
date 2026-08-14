// L3.5 aiflow/wc-pure-function（error）
// 检测：definePage.computed 和 definePage.actions 必须是纯函数
// - computed：禁止 fetch/document/window/外部赋值（与 transform 同）
// - actions：仅允许赋值 state.* 字段，禁止 fetch/DOM/其他副作用
const FORBIDDEN_GLOBALS = new Set(['fetch', 'setTimeout', 'setInterval', 'requestAnimationFrame', 'addEventListener', 'removeEventListener']);

export default {
  meta: {
    type: 'problem',
    docs: { description: 'computed/actions 必须纯函数（actions 仅允许赋值 state.*）' },
    schema: [],
    messages: {
      fetch: "{{section}}.{{name}} contains forbidden '{{fn}}()'; must be pure",
      dom: "{{section}}.{{name}} accesses '{{obj}}'; DOM/window forbidden in computed/actions",
      assignNonState: "{{section}}.{{name}} assigns non-state variable '{{target}}'; actions may only assign state.* fields",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    // 非消费端放行：库源码/单元测试/构建脚本
    if (/src[\\/]|test[\\/]|scripts[\\/]/.test(filename)) return {};
    const sourceCode = context.sourceCode || context.getSourceCode();

    function isInField(node, fieldName) {
      let parent = node.parent;
      while (parent) {
        if (parent.type === 'Property' &&
            parent.key?.type === 'Identifier' &&
            parent.key.name === fieldName &&
            parent.parent?.type === 'ObjectExpression') {
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

    function findFieldName(node) {
      // 找出当前所在 action/computed 字段名（用于错误消息）
      let parent = node.parent;
      while (parent) {
        if (parent.type === 'Property' &&
            parent.key?.type === 'Identifier' &&
            (parent.parent?.type === 'ObjectExpression')) {
          const obj = parent.parent;
          const objParent = obj.parent;
          if (objParent?.type === 'Property' &&
              (objParent.key?.name === 'computed' || objParent.key?.name === 'actions')) {
            return { section: objParent.key.name, name: parent.key.name };
          }
        }
        parent = parent.parent;
      }
      return null;
    }

    return {
      CallExpression(node) {
        const inComputed = isInField(node, 'computed');
        const inActions = isInField(node, 'actions');
        if (!inComputed && !inActions) return;

        const callee = node.callee;
        if (callee.type === 'Identifier' && FORBIDDEN_GLOBALS.has(callee.name)) {
          const info = findFieldName(node) || { section: 'unknown', name: 'fn' };
          context.report({ node: callee, messageId: 'fetch', data: { ...info, fn: callee.name } });
          return;
        }
        if (callee.type === 'MemberExpression' && callee.property?.name === 'fetch') {
          const info = findFieldName(node) || { section: 'unknown', name: 'fn' };
          context.report({ node: callee.property, messageId: 'fetch', data: { ...info, fn: 'fetch' } });
        }
      },
      MemberExpression(node) {
        const inComputed = isInField(node, 'computed');
        const inActions = isInField(node, 'actions');
        if (!inComputed && !inActions) return;
        const obj = node.object;
        if (obj.type === 'Identifier' && (obj.name === 'document' || obj.name === 'window' || obj.name === 'globalThis')) {
          const info = findFieldName(node) || { section: 'unknown', name: 'fn' };
          context.report({ node: obj, messageId: 'dom', data: { ...info, obj: obj.name } });
        }
      },
      AssignmentExpression(node) {
        // 只在 actions 内检测赋值（computed 不应有赋值，transform-pure 已管 transform）
        const inActions = isInField(node, 'actions');
        if (!inActions) return;
        const left = node.left;
        // 允许：state.xxx = ... 或 state.xxx.yyy = ... 或 state.xxx[i] = ...
        // 允许：state.xxx.push/splice 等是 CallExpression，不走这里
        let target = left;
        while (target.type === 'MemberExpression') target = target.object;
        if (target.type === 'Identifier' && target.name !== 'state') {
          const info = findFieldName(node) || { section: 'actions', name: 'fn' };
          context.report({ node: left, messageId: 'assignNonState', data: { ...info, target: target.name } });
        }
      },
    };
  },
};
