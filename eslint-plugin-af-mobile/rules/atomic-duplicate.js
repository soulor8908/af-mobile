// L2-7 af-mobile/atomic-duplicate（warn，可自动修）
// 检测：同一 class 属性内出现两个同属性原子（如 p-4 p-2），保留最后一个
import { extractAllClassLists } from '../utils/helpers.js';

// 属性前缀映射：p-* → padding, m-* → margin, t-* → font-size, r-* → border-radius
function getPropPrefix(cls) {
  const m = cls.match(/^([pmtr])-(.+)$/);
  return m ? m[1] : null;
}

const PROP_LABELS = { p: 'padding', m: 'margin', t: 'font-size', r: 'border-radius' };

export default {
  meta: {
    type: 'suggestion',
    docs: { description: '检测同属性原子类重复，保留最后一个' },
    schema: [],
    messages: {
      duplicate: "Duplicate {{prop}}: '{{a}}' is overwritten by '{{b}}'. Keep only '{{b}}'",
    },
    fixable: 'code',
  },
  create(context) {
    function checkClasses(classes, node, raw) {
      const seen = new Map(); // prefix → { cls, index }
      for (let i = 0; i < classes.length; i++) {
        const cls = classes[i];
        const prefix = getPropPrefix(cls);
        if (!prefix) continue;
        if (seen.has(prefix)) {
          const prev = seen.get(prefix);
          context.report({
            node,
            messageId: 'duplicate',
            data: { prop: PROP_LABELS[prefix] || prefix, a: prev.cls, b: cls },
            fix(fixer) {
              const sourceCode = context.sourceCode || context.getSourceCode();
              const text = sourceCode.getText(node);
              const idx = text.indexOf(raw);
              if (idx < 0) return null;
              const classIdx = idx + raw.indexOf(prev.cls);
              const before = text.slice(0, classIdx);
              const after = text.slice(classIdx + prev.cls.length);
              const trimmedBefore = before.replace(/\s+$/, '');
              return fixer.replaceText(node, trimmedBefore + after);
            },
          });
        }
        seen.set(prefix, { cls, index: i });
      }
    }
    function checkString(str, node) {
      for (const { classes, raw } of extractAllClassLists(str)) checkClasses(classes, node, raw);
    }
    return {
      Literal(node) { if (typeof node.value === 'string') checkString(node.value, node); },
      TemplateElement(node) { if (node.value?.raw) checkString(node.value.raw, node); },
    };
  },
};
