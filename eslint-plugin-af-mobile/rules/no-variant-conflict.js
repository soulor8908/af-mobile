// L2-3 af-mobile/no-variant-conflict（warn，可自动修）
// 检测：同属性互斥变体对同时出现，自动修：保留最后一个
import { extractAllClassLists } from '../utils/helpers.js';

// 互斥变体组：同组内只能出现一个
const CONFLICT_GROUPS = [
  ['btn-sm', 'btn-lg'],
  ['tag-ok', 'tag-warn', 'tag-danger'],
  // 圆角类
  ['r-s', 'r-m', 'r-l', 'r-f'],
  // padding 类
  ['p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'p-7', 'p-8', 'p-10'],
  // display 类（同为 display 属性）
  ['f', 'fi', 'fc'],
  // 行高类
  ['lh-tight', 'lh-normal'],
  // 背景类
  ['bg-brand', 'bg-card', 'bg-muted'],
];

export default {
  meta: {
    type: 'suggestion',
    docs: { description: '检测互斥变体冲突，保留最后一个' },
    schema: [],
    messages: {
      conflict: "Variant conflict: '{{a}}' and '{{b}}' — only the later one takes effect, remove the earlier one",
    },
    fixable: 'code',
  },
  create(context) {
    function checkClasses(classes, node, raw, offset) {
      for (const group of CONFLICT_GROUPS) {
        const found = [];
        for (const cls of classes) {
          if (group.includes(cls)) found.push(cls);
        }
        if (found.length < 2) continue;
        // 保留最后一个，删除前面的
        const keep = found[found.length - 1];
        const remove = found.slice(0, -1);
        for (const r of remove) {
          context.report({
            node,
            messageId: 'conflict',
            data: { a: r, b: keep },
            fix(fixer) {
              // 删除 class 名 + 其后的一个空格（保留的类在后面，必有空格可吃）
              const sourceCode = context.sourceCode || context.getSourceCode();
              const text = sourceCode.getText(node);
              const idx = text.indexOf(raw);
              if (idx < 0) return null;
              const classIdx = idx + raw.indexOf(r);
              const before = text.slice(0, classIdx);
              const after = text.slice(classIdx + r.length).replace(/^\s+/, '');
              return fixer.replaceText(node, before + after);
            },
          });
        }
      }
    }
    function checkString(str, node) {
      for (const { classes, raw, offset } of extractAllClassLists(str)) {
        checkClasses(classes, node, raw, offset);
      }
    }
    return {
      Literal(node) { if (typeof node.value === 'string') checkString(node.value, node); },
      TemplateElement(node) { if (node.value?.raw) checkString(node.value.raw, node); },
    };
  },
};
