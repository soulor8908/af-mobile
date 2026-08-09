// L1-2 aiflow/no-inline-style（error，部分可自动修）
// 检测：style="" 中设置 forbiddenInlineStyle 列表内的属性
// 例外：display/transform/z-index/width/height 等布局属性放行；skeleton class 元素内 width/height 放行
// 适用：HTML/JS 文件中所有字符串字面量（含 template literal），覆盖组件 innerHTML 赋值场景
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

// 加载 whitelist（与规则文件同级目录 ../utils/whitelist-v1.json）
const __dirname = dirname(fileURLToPath(import.meta.url));
const whitelistPath = resolve(__dirname, '../utils/whitelist-v1.json');
const whitelist = JSON.parse(readFileSync(whitelistPath, 'utf8'));
const FORBIDDEN = new Set(whitelist.forbiddenInlineStyle);

// 布局类属性放行（设计文档 L1-2 例外）
const ALLOWED_LAYOUT = new Set([
  'display', 'transform', 'z-index', 'width', 'height',
  'position', 'top', 'right', 'bottom', 'left',
  'flex', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items',
  'grid-template-columns', 'grid-template-rows', 'gap',
  'overflow', 'overflow-x', 'overflow-y',
]);

// 提取 style="..." 内容中的属性名
function extractStyleProps(styleContent) {
  const props = [];
  // 匹配 prop-name: value; 形式
  const re = /([a-z-]+)\s*:/g;
  let m;
  while ((m = re.exec(styleContent))) props.push(m[1].toLowerCase());
  return props;
}

// 检测 style="" 字符串中的 forbidden 属性
function checkStyleString(str) {
  const violations = [];
  const styleRe = /style\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = styleRe.exec(str))) {
    const styleContent = m[1];
    const props = extractStyleProps(styleContent);
    for (const prop of props) {
      if (FORBIDDEN.has(prop)) {
        violations.push({ prop, value: styleContent });
      }
    }
  }
  return violations;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: '禁止 inline style 中使用 forbidden 属性（应使用 L2 class）',
    },
    schema: [{
      type: 'object',
      properties: {
        allowProperties: {
          type: 'array',
          items: { type: 'string' },
          description: '项目级额外放行的属性名',
        },
      },
      additionalProperties: false,
    }],
    messages: {
      forbidden: "Inline style '{{value}}' is forbidden. Use class instead",
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const extraAllow = new Set(options.allowProperties || []);

    return {
      // 检测字符串字面量（含 template literal）
      Literal(node) {
        if (typeof node.value !== 'string') return;
        const violations = checkStyleString(node.value);
        for (const v of violations) {
          if (extraAllow.has(v.prop)) continue;
          context.report({ node, messageId: 'forbidden', data: { value: v.value } });
        }
      },
      TemplateElement(node) {
        if (!node.value || !node.value.raw) return;
        const violations = checkStyleString(node.value.raw);
        for (const v of violations) {
          if (extraAllow.has(v.prop)) continue;
          context.report({ node, messageId: 'forbidden', data: { value: v.value } });
        }
      },
      // 检测 el.style.setProperty('color', ...) / el.style.xxx = '...' 绕过
      // 仅当属性名为 forbidden 视觉属性且非常量 --* CSS 变量时报告
      CallExpression(node) {
        const callee = node.callee;
        if (callee?.type !== 'MemberExpression') return;
        if (callee.object?.type !== 'MemberExpression') return;
        if (callee.object.property?.name !== 'style') return;
        if (callee.property?.name !== 'setProperty') return;
        const propArg = node.arguments?.[0];
        if (!propArg || propArg.type !== 'Literal' || typeof propArg.value !== 'string') return;
        // CSS 自定义属性（--*）豁免：用于主题变量传递，由 no-token-modification 规则单独管
        if (propArg.value.startsWith('--')) return;
        const prop = propArg.value.toLowerCase();
        if (FORBIDDEN.has(prop) && !ALLOWED_LAYOUT.has(prop) && !extraAllow.has(prop)) {
          context.report({ node, messageId: 'forbidden', data: { value: `${prop}` } });
        }
      },
      AssignmentExpression(node) {
        // el.style.color = 'red' 形式
        if (node.left?.type !== 'MemberExpression') return;
        if (node.left.object?.type !== 'MemberExpression') return;
        if (node.left.object.property?.name !== 'style') return;
        const propName = node.left.property?.name;
        if (!propName) return;
        // kebab-case 转换：backgroundColor → background-color
        const kebab = propName.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
        if (FORBIDDEN.has(kebab) && !ALLOWED_LAYOUT.has(kebab) && !extraAllow.has(kebab)) {
          context.report({ node, messageId: 'forbidden', data: { value: kebab } });
        }
      },
    };
  },
};
