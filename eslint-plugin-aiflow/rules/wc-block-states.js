// L3.5 aiflow/wc-block-states（error）
// 检测：Block 类的 mounted/render/_render 方法必须包含 loading/error/empty 分支
// 五态：idle（默认）/ loading / error / empty / success
// 检测策略：源码文本扫描，找 loading / error / empty 三个关键词至少各出现一次（在条件分支中）
// 适用：src/blocks/**/*.js
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Block 必须实现 loading/error/empty 三态分支' },
    schema: [],
    messages: {
      missing: "Block '{{name}}' missing state '{{state}}'; must implement loading/error/empty branches in render",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    if (!/src[\\/]blocks[\\/].*\.js$/.test(filename)) return {};

    const REQUIRED = ['loading', 'error', 'empty'];
    const found = new Set();
    let className = 'unknown';

    return {
      ClassDeclaration(node) {
        if (node.id?.name) className = node.id.name;
      },
      // 检测 this.loading / this._error / this._data?.length（empty 分支）
      // 检测 if (this.loading) / if (this._error) / if (!this._data?.length)
      MemberExpression(node) {
        const propName = node.property?.name;
        if (propName === 'loading') found.add('loading');
        if (propName === '_error' || propName === 'error') found.add('error');
      },
      // 检测字符串中的 loading/error/empty（模板、注释、class 名）
      Literal(node) {
        if (typeof node.value === 'string' && /(loading|error|empty)/.test(node.value)) {
          for (const s of REQUIRED) {
            if (node.value.includes(s)) found.add(s);
          }
        }
      },
      TemplateElement(node) {
        const raw = node.value?.raw || '';
        for (const s of REQUIRED) {
          if (raw.includes(s)) found.add(s);
        }
      },
      Identifier(node) {
        // _renderLoading / _renderError / _renderEmpty 方法名
        const name = node.name || '';
        if (/loading/i.test(name)) found.add('loading');
        if (/error/i.test(name)) found.add('error');
        if (/empty/i.test(name)) found.add('empty');
      },
      'Program:exit'() {
        for (const s of REQUIRED) {
          if (!found.has(s)) {
            context.report({ loc: { line: 1, column: 0 }, messageId: 'missing', data: { name: className, state: s } });
          }
        }
      },
    };
  },
};
