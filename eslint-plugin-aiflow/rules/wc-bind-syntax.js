// L3.5 aiflow/wc-bind-syntax（error）
// 检测：HTML attribute :bind 只能绑定到 state.xxx / computed.xxx / {ref}.xxx
// 由于 ESLint 解析 JS 不解析 HTML，本规则扫描字符串字面量中的 :xxx="..." 模式
// 适用：消费端代码（非 src/），且不检测库源码
// 注：JSX/TSX 不在本规则范围，本规则针对模板字符串中的 HTML 片段
const BIND_RE = /:([a-zA-Z-]+)\s*=\s*"([^"]+)"/g;

export default {
  meta: {
    type: 'problem',
    docs: { description: ':bind 只能绑定到 state.*/computed.*/{ref}.* 字段' },
    schema: [],
    messages: {
      invalid: "':{{attr}}=\"{{expr}}\"' must bind to state.xxx / computed.xxx / {ref}.xxx (where {ref} is af-data ref name)",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    // 库源码放行（库内部模板生成 :bind）
    if (/src[\\/](components|blocks|lib)[\\/].*\.js$/.test(filename)) return {};
    // 测试夹具放行
    if (/test[\\/]eslint-plugin[\\/]/.test(filename)) return {};

    function checkBinding(expr, node) {
      // 合法形式：state.xxx / computed.xxx / {refName}.xxx（refName 是 af-data 的 ref 属性值）
      // refName 是标识符（如 ds / cfg），后跟 .xxx
      if (/^state\.[a-zA-Z_$][\w$]*(\.[a-zA-Z_$][\w$]*)*$/.test(expr)) return;
      if (/^computed\.[a-zA-Z_$][\w$]*$/.test(expr)) return;
      // 任意标识符.xxx 形式视为合法（refName.xxx）
      if (/^[a-zA-Z_$][\w$]*\.[a-zA-Z_$][\w$]*$/.test(expr)) return;
      // 支持声明式指令：redirect:/path / toast:$msg / setState:k=v / action:fn / dialog:id
      if (/^(redirect|toast|setState|action|dialog):/.test(expr)) return;
      context.report({ node, messageId: 'invalid', data: { attr: '', expr } });
    }

    return {
      Literal(node) {
        if (typeof node.value !== 'string') return;
        let m;
        BIND_RE.lastIndex = 0;
        while ((m = BIND_RE.exec(node.value)) !== null) {
          const expr = m[2];
          checkBinding(expr, node);
        }
      },
      TemplateElement(node) {
        const raw = node.value?.raw;
        if (!raw) return;
        let m;
        BIND_RE.lastIndex = 0;
        while ((m = BIND_RE.exec(raw)) !== null) {
          const expr = m[2];
          checkBinding(expr, node);
        }
      },
    };
  },
};
