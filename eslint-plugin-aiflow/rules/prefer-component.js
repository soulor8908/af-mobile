// L2-6 aiflow/prefer-component（warn）
// 检测：(a) .toast class + setTimeout / (b) .sheet class vs <af-action-sheet> / (c) .list class + scroll 监听
import { extractAllClassLists } from '../utils/helpers.js';

export default {
  meta: {
    type: 'suggestion',
    docs: { description: '建议使用 L3 组件替代手动实现' },
    schema: [],
    messages: {
      toast: "Manual .toast + setTimeout detected, prefer <af-toast> for singleton queue / auto-dismiss / aria-live",
      sheet: "Manual .sheet class detected, prefer <af-action-sheet> for touch-friendly bottom sheet / gesture dismiss",
      list: "Manual .list + scroll listener detected, prefer <af-list> for virtual scroll / pull refresh / load more",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();
    let hasToast = false, hasSheet = false, hasList = false;
    let hasSetTimeout = false, hasScrollListener = false;

    function scan(str) {
      for (const { classes } of extractAllClassLists(str)) {
        if (classes.includes('toast')) hasToast = true;
        if (classes.includes('sheet')) hasSheet = true;
        if (classes.includes('list')) hasList = true;
      }
    }

    return {
      Literal(node) { if (typeof node.value === 'string') scan(node.value); },
      TemplateElement(node) { if (node.value?.raw) scan(node.value.raw); },
      CallExpression(node) {
        // setTimeout 检测
        const callee = node.callee;
        if (callee.type === 'Identifier' && callee.name === 'setTimeout') hasSetTimeout = true;
        // addEventListener('scroll', ...) 检测
        if (callee.type === 'MemberExpression' && callee.property?.name === 'addEventListener') {
          const arg = node.arguments[0];
          if (arg?.value === 'scroll') hasScrollListener = true;
        }
      },
      'Program:exit'() {
        if (hasToast && hasSetTimeout) {
          context.report({ loc: { line: 1, column: 0 }, messageId: 'toast' });
        }
        if (hasSheet) {
          context.report({ loc: { line: 1, column: 0 }, messageId: 'sheet' });
        }
        if (hasList && hasScrollListener) {
          context.report({ loc: { line: 1, column: 0 }, messageId: 'list' });
        }
      },
    };
  },
};
