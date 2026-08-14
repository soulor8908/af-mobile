// L2-2 aiflow/no-recipe-break（error，3 子规则）
// a: .cell + f/fc 原子 → 布局冲突
// b: .btn（非 .btn-ghost）+ text-brand/text-danger/text-success → 对比度问题
// c: .input + t-sm/t-xs → iOS 焦点缩放
import { extractAllClassLists } from '../utils/helpers.js';

const FLEX_ATOMS = new Set(['f', 'fc']);
const COLORED_TEXT = new Set(['text-brand', 'text-danger', 'text-success']);
const SMALL_FONT = new Set(['t-sm', 't-xs']);

export default {
  meta: {
    type: 'problem',
    docs: { description: '禁止原子类破坏 recipe 内置样式' },
    schema: [],
    messages: {
      cellFlex: ".cell has built-in display:flex, adding 'f'/'fc' may break layout",
      btnColor: ".btn background uses --c-brand, text color must keep --c-onbrand contrast. Use .btn-ghost instead for colored text",
      inputFont: ".input font-size must be 16px (--t-md) to prevent iOS focus zoom. Put help text in <label> or .form-err instead",
    },
  },
  create(context) {
    function checkClasses(classes, node) {
      const set = new Set(classes);
      // a: .cell + f/fc
      if (set.has('cell')) {
        for (const a of FLEX_ATOMS) {
          if (set.has(a)) { context.report({ node, messageId: 'cellFlex' }); break; }
        }
      }
      // b: .btn（非 .btn-ghost）+ colored text
      if (set.has('btn') && !set.has('btn-ghost')) {
        for (const a of COLORED_TEXT) {
          if (set.has(a)) { context.report({ node, messageId: 'btnColor' }); break; }
        }
      }
      // c: .input + t-sm/t-xs
      if (set.has('input')) {
        for (const a of SMALL_FONT) {
          if (set.has(a)) { context.report({ node, messageId: 'inputFont' }); break; }
        }
      }
    }
    function checkString(str, node) {
      for (const { classes } of extractAllClassLists(str)) checkClasses(classes, node);
    }
    return {
      Literal(node) { if (typeof node.value === 'string') checkString(node.value, node); },
      TemplateElement(node) { if (node.value?.raw) checkString(node.value.raw, node); },
    };
  },
};
