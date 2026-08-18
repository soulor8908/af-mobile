// L2-4 af-mobile/no-arbitrary-value（error，部分可自动修）
// 检测：class 含 [xxx] 任意值语法 / 档位越界（如 p-7）
import { extractAllClassLists, ALL_CLASSES } from '../utils/helpers.js';

// 合法档位
const RANGES = {
  'p': ['0', '1', '2', '3', '4', '5', '6', '8', '10'],
  'm': ['0', '1', '2', '3', '4', '5', '6'],
  't': ['xs', 'sm', 'md', 'lg', 'xl'],
  'r': ['s', 'm', 'l', 'f'],
};

export default {
  meta: {
    type: 'problem',
    docs: { description: '禁止任意值语法和档位越界' },
    schema: [],
    messages: {
      arbitrary: "'{{name}}' arbitrary value syntax forbidden; use closest atomic or extend recipes.project.css",
      outOfRange: "'{{name}}' out of range ({{valid}}); use closest atomic",
    },
  },
  create(context) {
    function checkClass(cls, node) {
      // 白名单内的 class 直接放行（如 t-center/t-b 是合法原子类，非档位）
      if (ALL_CLASSES.has(cls)) return;
      // [xxx] 任意值
      if (/[\[\]]/.test(cls)) {
        context.report({ node, messageId: 'arbitrary', data: { name: cls } });
        return;
      }
      // 档位越界：前缀-档位
      const m = cls.match(/^([pmtr])-(.+)$/);
      if (m) {
        const [, prefix, val] = m;
        const valid = RANGES[prefix.toUpperCase()] || RANGES[prefix];
        if (valid && !valid.includes(val)) {
          context.report({ node, messageId: 'outOfRange', data: { name: cls, valid: valid.join('/') } });
        }
      }
    }
    function checkString(str, node) {
      for (const { classes } of extractAllClassLists(str)) {
        for (const cls of classes) checkClass(cls, node);
      }
    }
    return {
      Literal(node) { if (typeof node.value === 'string') checkString(node.value, node); },
      TemplateElement(node) { if (node.value?.raw) checkString(node.value.raw, node); },
    };
  },
};
