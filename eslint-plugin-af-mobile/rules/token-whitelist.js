// L2-1 af-mobile/token-whitelist（error）
// 检测：class="" 中的 class / 自定义元素 tagName → 与 whitelist + extraClass/extraComponents 对比
// 模板插值 class（btn-${type}）无法静态解析 → 单独报 interpolatedClass（伪报为"不在白名单"会误导修法）
import { ALL_CLASSES, ALL_COMPONENTS, extractAllClassLists, extractCustomElements, suggestNearest } from '../utils/helpers.js';

export default {
  meta: {
    type: 'problem',
    docs: { description: 'class 名和自定义元素必须在白名单内' },
    schema: [{
      type: 'object',
      properties: {
        extraClass: { type: 'array', items: { type: 'string' } },
        extraComponents: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    }],
    messages: {
      unknownClass: "Class '{{name}}' not in whitelist.{{suggest}} Use recipe/atomic, or paste into eslint.config.js: 'af-mobile/token-whitelist': ['error', { extraClass: ['{{name}}'] }]",
      unknownComponent: "Component '{{name}}' not in whitelist.{{suggest}} Paste into eslint.config.js: 'af-mobile/token-whitelist': ['error', { extraComponents: ['{{name}}'] }]",
      interpolatedClass: "Class '{{name}}' contains template interpolation and cannot be checked statically. Use static whitelist classes plus data-* attributes, or a ternary switching between whitelisted classes",
    },
  },
  create(context) {
    const options = context.options[0] || {};
    const allowClass = new Set([...ALL_CLASSES, ...(options.extraClass || [])]);
    const allowComp = new Set([...ALL_COMPONENTS, ...(options.extraComponents || [])]);
    const extraClasses = [...allowClass];
    const extraComps = [...allowComp];

    function checkString(str, node) {
      // class 检查
      for (const { classes } of extractAllClassLists(str)) {
        for (const cls of classes) {
          if (cls.includes('${')) {
            context.report({ node, messageId: 'interpolatedClass', data: { name: cls } });
          } else if (!allowClass.has(cls)) {
            context.report({ node, messageId: 'unknownClass', data: { name: cls, suggest: suggestNearest(cls, extraClasses) } });
          }
        }
      }
      // 自定义元素检查
      for (const tag of extractCustomElements(str)) {
        if (!allowComp.has(tag)) {
          context.report({ node, messageId: 'unknownComponent', data: { name: tag, suggest: suggestNearest(tag, extraComps) } });
        }
      }
    }

    return {
      Literal(node) { if (typeof node.value === 'string') checkString(node.value, node); },
      TemplateElement(node) { if (node.value?.raw) checkString(node.value.raw, node); },
      // 检测 classList.add/remove/toggle 的字符串参数（绕过 class="..." 字面量检测）
      CallExpression(node) {
        const callee = node.callee;
        if (callee?.type !== 'MemberExpression') return;
        if (callee.object?.type !== 'MemberExpression') return;
        if (callee.object.property?.name !== 'classList') return;
        const method = callee.property?.name;
        if (!['add', 'remove', 'toggle'].includes(method)) return;
        for (const arg of node.arguments) {
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            for (const cls of arg.value.split(/\s+/).filter(Boolean)) {
              if (!allowClass.has(cls)) {
                context.report({ node: arg, messageId: 'unknownClass', data: { name: cls, suggest: suggestNearest(cls, extraClasses) } });
              }
            }
          }
          if (arg.type === 'ArrayExpression') {
            for (const el of arg.elements) {
              if (el?.type === 'Literal' && typeof el.value === 'string') {
                for (const cls of el.value.split(/\s+/).filter(Boolean)) {
                  if (!allowClass.has(cls)) {
                    context.report({ node: el, messageId: 'unknownClass', data: { name: cls, suggest: suggestNearest(cls, extraClasses) } });
                  }
                }
              }
            }
          }
        }
      },
    };
  },
};
