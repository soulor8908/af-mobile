// L3-3 aiflow/wc-part-naming（warn）
// 检测：part="xxx" 属性名非 kebab-case
const KEBAB_RE = /^[a-z]+(-[a-z0-9]+)*$/;

export default {
  meta: {
    type: 'suggestion',
    docs: { description: 'part 属性名必须 kebab-case' },
    schema: [],
    messages: {
      naming: "Part name '{{name}}' should be kebab-case (e.g. 'dialog-content')",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    if (!/src[\\/]components[\\/].*\.js$/.test(filename)) return {};

    function checkString(str, node) {
      const re = /part\s*=\s*"([^"]*)"/g;
      let m;
      while ((m = re.exec(str))) {
        const partName = m[1].trim();
        if (partName && !KEBAB_RE.test(partName)) {
          context.report({ node, messageId: 'naming', data: { name: partName } });
        }
      }
    }
    return {
      Literal(node) { if (typeof node.value === 'string') checkString(node.value, node); },
      TemplateElement(node) { if (node.value?.raw) checkString(node.value.raw, node); },
    };
  },
};
