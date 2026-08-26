// L2-8 af-mobile/no-emoji-icon（warn）
// 检测 emoji 当图标——"廉价感"第一视觉来源（v1.6.1 规则化，配套 prompt 图标规范）
// 检测点（低误报，只查图标语境）：
//   1. icon 属性值：tabs/tabbar 配置对象 { label: 'x', icon: '📋' }（旧 few-shot 示例的反模式）
//   2. HTML 字符串中 tab-item 元素 / data-role="icon" 元素的文本内容含 emoji
// 修正：用 24px stroke SVG（prompt 图标 path 库）；af-tabbar 的 icon 仅支持文本字符，需要图标时省略 icon 字段
const EMOJI_RE = /\p{Extended_Pictographic}/u;

function firstEmoji(str) {
  const m = str.match(EMOJI_RE);
  return m ? m[0] : null;
}

// HTML 字符串中的图标语境：tab-item 元素 / data-role="icon" 元素（取开闭标签之间的纯文本段）
const ICON_CONTEXT_RES = [
  /<[\w-]+[^>]*\bclass="[^"]*\btab-item\b[^"]*"[^>]*>([^<]*)</g,
  /<[\w-]+[^>]*\bdata-role="icon"[^>]*>([^<]*)</g,
];

function checkHtmlString(str, node, report) {
  for (const re of ICON_CONTEXT_RES) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(str))) {
      const emoji = firstEmoji(m[1]);
      if (emoji) report(node, emoji);
    }
  }
}

export default {
  meta: {
    type: 'suggestion',
    docs: { description: '禁止 emoji 当图标（用 24px stroke SVG）' },
    schema: [],
    messages: {
      emojiIcon: "Emoji {{emoji}} used as icon — use a 24px stroke SVG instead; af-tabbar's icon prop only supports text characters",
    },
  },
  create(context) {
    const report = (node, emoji) => context.report({ node, messageId: 'emojiIcon', data: { emoji } });
    return {
      // { icon: '📋' } 配置对象（af-tabbar / af-tabs 的 tabs 数组）
      Property(node) {
        const keyName = node.key.type === 'Identifier'
          ? node.key.name
          : (node.key.type === 'Literal' ? String(node.key.value) : null);
        if (keyName !== 'icon') return;
        const v = node.value;
        if (v.type === 'Literal' && typeof v.value === 'string') {
          const emoji = firstEmoji(v.value);
          if (emoji) report(v, emoji);
        } else if (v.type === 'TemplateLiteral' && v.expressions.length === 0) {
          const emoji = firstEmoji(v.quasis[0].value.raw);
          if (emoji) report(v, emoji);
        }
      },
      // HTML 字符串（含 template literal）中的图标语境元素
      Literal(node) {
        if (typeof node.value !== 'string') return;
        checkHtmlString(node.value, node, report);
      },
      TemplateElement(node) {
        if (!node.value || !node.value.raw) return;
        checkHtmlString(node.value.raw, node, report);
      },
    };
  },
};
