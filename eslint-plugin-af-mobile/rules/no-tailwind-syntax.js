// L2-5 af-mobile/no-tailwind-syntax（error）
// 检测：class 含 sm:/md:/lg:/xl:/hover:/focus:/active:/dark: 前缀
import { extractAllClassLists } from '../utils/helpers.js';

const TAILWIND_PREFIX = /^(sm|md|lg|xl|hover|focus|active|dark):/;

export default {
  meta: {
    type: 'problem',
    docs: { description: '禁止 Tailwind 响应式/状态前缀语法' },
    schema: [],
    messages: {
      tailwind: "'{{name}}' responsive/state prefix syntax forbidden. Use @container in recipes.project.css for container-queries responsive behavior",
    },
  },
  create(context) {
    function checkString(str, node) {
      for (const { classes } of extractAllClassLists(str)) {
        for (const cls of classes) {
          if (TAILWIND_PREFIX.test(cls)) {
            context.report({ node, messageId: 'tailwind', data: { name: cls } });
          }
        }
      }
    }
    return {
      Literal(node) { if (typeof node.value === 'string') checkString(node.value, node); },
      TemplateElement(node) { if (node.value?.raw) checkString(node.value.raw, node); },
    };
  },
};
