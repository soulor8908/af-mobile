// L3-5 af-mobile/wc-aria-required（error）
// 检测：组件 render 输出的 DOM 缺少必需的 ARIA 角色/属性
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ariaPath = resolve(__dirname, '../utils/aria-requirements.json');
const ARIA_REQ = JSON.parse(readFileSync(ariaPath, 'utf8'));

export default {
  meta: {
    type: 'problem',
    docs: { description: '组件必须包含声明的必需 ARIA 角色/属性' },
    schema: [],
    messages: {
      missingRole: "af-{{comp}} missing role=\"{{role}}\"; required by WAI-ARIA, see aria-requirements.json",
      missingAriaLabel: "af-{{comp}} missing aria-label; required for screen reader accessibility",
      missingAriaLive: "af-{{comp}} missing aria-live; required for dynamic content announcements",
      missingAriaChecked: "af-{{comp}} missing aria-checked; required for switch/checkbox state",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    if (!/src[\\/](?:(?:charts|chat)[\\/])?components[\\/].*\.js$/.test(filename)) return {};

    // 从文件名提取组件名（af-xxx.js → af-xxx）
    const m = filename.match(/(af-[a-z-]+)\.js$/);
    if (!m) return {};
    const compName = m[1];
    const req = ARIA_REQ[compName];
    if (!req) return {};

    const sourceCode = context.sourceCode || context.getSourceCode();

    return {
      'Program:exit'() {
        const source = sourceCode.getText();
        // 识别两种形式：(a) 字面量 role="xxx" (b) setAttribute('role', 'xxx')
        const hasRole = (r) =>
          source.includes(`role="${r}"`) ||
          source.includes(`role='${r}'`) ||
          source.includes(`setAttribute('role', '${r}')`) ||
          source.includes(`setAttribute("role", "${r}")`);
        if (req.role && !hasRole(req.role)) {
          context.report({ loc: { line: 1, column: 0 }, messageId: 'missingRole', data: { comp: compName, role: req.role } });
        }
        if (req.ariaLabel && !source.includes('aria-label') && !source.includes("ariaLabel")) {
          context.report({ loc: { line: 1, column: 0 }, messageId: 'missingAriaLabel', data: { comp: compName } });
        }
        if (req.ariaLive && !source.includes('aria-live') && !source.includes("ariaLive")) {
          context.report({ loc: { line: 1, column: 0 }, messageId: 'missingAriaLive', data: { comp: compName } });
        }
        if (req.ariaChecked && !source.includes('aria-checked') && !source.includes("ariaChecked")) {
          context.report({ loc: { line: 1, column: 0 }, messageId: 'missingAriaChecked', data: { comp: compName } });
        }
      },
    };
  },
};
