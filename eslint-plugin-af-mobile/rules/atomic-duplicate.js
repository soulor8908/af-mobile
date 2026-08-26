// L2-7 af-mobile/atomic-duplicate（warn，可自动修）
// 检测：同一 class 属性内出现两个同属性原子（如 p-4 p-2），保留最后一个
import { extractAllClassLists } from '../utils/helpers.js';

// 字重类与字号类共享 t- 前缀但作用于不同属性（font-weight vs font-size），必须分桶判定：
// t-xl t-b 是"大字号+粗体"的合法排版组合，不是字号重复
// （v1.6.1 修复：旧前缀正则曾把两者混为 font-size，autofix 直接删掉字号类，破坏视觉强调）
const FONT_SIZE = new Set(['t-display', 't-xs', 't-sm', 't-md', 't-lg', 't-xl']);
const FONT_WEIGHT = new Set(['t-b', 't-m', 't-semibold']);

// 属性桶：p-* → padding, m-* → margin, t-* → font-size, r-* → border-radius, 字重类 → font-weight
function getPropPrefix(cls) {
  if (FONT_WEIGHT.has(cls)) return 'fw';
  if (FONT_SIZE.has(cls)) return 't';
  const m = cls.match(/^([pmtr])-(.+)$/);
  return m ? m[1] : null;
}

const PROP_LABELS = { p: 'padding', m: 'margin', t: 'font-size', r: 'border-radius', fw: 'font-weight' };

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
              // 删除被覆盖的 class + 其后的空格（保留的类在后面，必有空格可吃）
              const sourceCode = context.sourceCode || context.getSourceCode();
              const text = sourceCode.getText(node);
              const idx = text.indexOf(raw);
              if (idx < 0) return null;
              const classIdx = idx + raw.indexOf(prev.cls);
              const before = text.slice(0, classIdx);
              const after = text.slice(classIdx + prev.cls.length).replace(/^\s+/, '');
              return fixer.replaceText(node, before + after);
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
