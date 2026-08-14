// eslint-plugin-aiflow 规则测试 —— no-inline-style
import { describe, it, expect } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../packages/eslint-plugin/rules/no-inline-style.js';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

describe('aiflow/no-inline-style', () => {
  it('forbidden 属性 padding：报错', () => {
    ruleTester.run('no-inline-style', rule, {
      valid: [],
      invalid: [{
        code: 'const html = `<div style="padding: 16px">x</div>`;',
        errors: [{ messageId: 'forbidden' }],
      }],
    });
  });

  it('forbidden 属性 color：报错', () => {
    ruleTester.run('no-inline-style', rule, {
      valid: [],
      invalid: [{
        code: 'const html = `<div style="color: red">x</div>`;',
        errors: [{ messageId: 'forbidden' }],
      }],
    });
  });

  it('布局属性 display：放行', () => {
    ruleTester.run('no-inline-style', rule, {
      valid: [{ code: 'const html = `<div style="display: flex">x</div>`;' }],
      invalid: [],
    });
  });

  it('布局属性 width：放行', () => {
    ruleTester.run('no-inline-style', rule, {
      valid: [{ code: 'const html = `<div style="width: 100%">x</div>`;' }],
      invalid: [],
    });
  });

  it('普通字符串字面量中的 forbidden 属性：报错', () => {
    ruleTester.run('no-inline-style', rule, {
      valid: [],
      invalid: [{
        code: 'const html = "<div style=\\"padding: 16px\\">x</div>";',
        errors: [{ messageId: 'forbidden' }],
      }],
    });
  });

  it('无 style 属性：放行', () => {
    ruleTester.run('no-inline-style', rule, {
      valid: [{ code: 'const html = `<div class="card">x</div>`;' }],
      invalid: [],
    });
  });

  it('allowProperties 配置项放行指定属性', () => {
    ruleTester.run('no-inline-style', rule, {
      valid: [{
        code: 'const html = `<div style="padding: 16px">x</div>`;',
        options: [{ allowProperties: ['padding'] }],
      }],
      invalid: [],
    });
  });

  // === setProperty / .style.xxx 绕过检测（L4 有效性补强） ===
  it('el.style.setProperty("color", ...) 绕过：报错', () => {
    ruleTester.run('no-inline-style', rule, {
      valid: [],
      invalid: [{
        code: 'el.style.setProperty("color", "red");',
        errors: [{ messageId: 'forbidden' }],
      }],
    });
  });

  it('el.style.setProperty("padding", ...) 绕过：报错', () => {
    ruleTester.run('no-inline-style', rule, {
      valid: [],
      invalid: [{
        code: 'el.style.setProperty("padding", "16px");',
        errors: [{ messageId: 'forbidden' }],
      }],
    });
  });

  it('el.style.setProperty("--af-list-h", ...) CSS 变量：放行', () => {
    ruleTester.run('no-inline-style', rule, {
      valid: [{ code: 'el.style.setProperty("--af-list-h", "100px");' }],
      invalid: [],
    });
  });

  it('el.style.setProperty("display", ...) 布局属性：放行', () => {
    ruleTester.run('no-inline-style', rule, {
      valid: [{ code: 'el.style.setProperty("display", "flex");' }],
      invalid: [],
    });
  });

  it('el.style.color = "red" 赋值绕过：报错', () => {
    ruleTester.run('no-inline-style', rule, {
      valid: [],
      invalid: [{
        code: 'el.style.color = "red";',
        errors: [{ messageId: 'forbidden' }],
      }],
    });
  });

  it('el.style.backgroundColor = "red" 驼峰形式绕过：报错', () => {
    ruleTester.run('no-inline-style', rule, {
      valid: [],
      invalid: [{
        code: 'el.style.backgroundColor = "red";',
        errors: [{ messageId: 'forbidden' }],
      }],
    });
  });

  it('el.style.display = "flex" 布局属性赋值：放行', () => {
    ruleTester.run('no-inline-style', rule, {
      valid: [{ code: 'el.style.display = "flex";' }],
      invalid: [],
    });
  });
});
