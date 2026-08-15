// eslint-plugin-aiflow 规则测试 —— no-token-modification
import { describe, it, expect } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../eslint-plugin-aiflow/rules/no-token-modification.js';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

describe('aiflow/no-token-modification', () => {
  it('tokens.css 文件内重定义 token：放行', () => {
    ruleTester.run('no-token-modification', rule, {
      valid: [{ filename: 'src/tokens.css', code: ':root { --c-brand: #07c160; }' }],
      invalid: [],
    });
  });

  it('tokens.project.css 文件内重定义 token：放行', () => {
    ruleTester.run('no-token-modification', rule, {
      valid: [{ filename: 'src/tokens.project.css', code: ':root { --c-brand: #ff0000; }' }],
      invalid: [],
    });
  });

  it('非 tokens.css 文件内重定义 --c-brand：报错', () => {
    ruleTester.run('no-token-modification', rule, {
      valid: [],
      invalid: [{
        filename: 'src/components/af-dialog.js',
        code: ':root { --c-brand: red; }',
        errors: [{ messageId: 'locked', data: { name: '--c-brand' } }],
      }],
    });
  });

  it('非 tokens.css 文件内重定义 --s-4：报错', () => {
    ruleTester.run('no-token-modification', rule, {
      valid: [],
      invalid: [{
        filename: 'src/components/foo.css',
        code: '.card { --s-4: 20px; }',
        errors: [{ messageId: 'locked', data: { name: '--s-4' } }],
      }],
    });
  });

  it('非 token 前缀的 CSS 变量：放行', () => {
    ruleTester.run('no-token-modification', rule, {
      valid: [{ filename: 'src/components/foo.css', code: '.card { --my-custom-var: 10px; }' }],
      invalid: [],
    });
  });

  it('不含 -- 的文件：放行', () => {
    ruleTester.run('no-token-modification', rule, {
      valid: [{ filename: 'src/components/foo.css', code: '.card { color: red; }' }],
      invalid: [],
    });
  });

  // === JS 内 setProperty / 间接覆盖 token 检测（L4 有效性补强） ===
  it('JS 内 setProperty("--c-brand", ...) 间接覆盖 token：报错', () => {
    ruleTester.run('no-token-modification', rule, {
      valid: [],
      invalid: [{
        filename: 'src/components/af-dialog.js',
        code: 'el.style.setProperty("--c-brand", "#ff0000");',
        errors: [{ messageId: 'locked', data: { name: '--c-brand' } }],
      }],
    });
  });

  it('JS 内 setProperty("--s-4", ...) 间接覆盖 token：报错', () => {
    ruleTester.run('no-token-modification', rule, {
      valid: [],
      invalid: [{
        filename: 'src/components/af-list.js',
        code: 'el.style.setProperty("--s-4", "20px");',
        errors: [{ messageId: 'locked', data: { name: '--s-4' } }],
      }],
    });
  });

  it('JS 内 setProperty("--af-list-h", ...) 非 token 前缀：放行', () => {
    ruleTester.run('no-token-modification', rule, {
      valid: [{
        filename: 'src/components/af-list.js',
        code: 'el.style.setProperty("--af-list-h", "100px");',
      }],
      invalid: [],
    });
  });

  it('JS 内 removeProperty("--c-brand") 删除 token：报错', () => {
    ruleTester.run('no-token-modification', rule, {
      valid: [],
      invalid: [{
        filename: 'src/components/af-dialog.js',
        code: 'el.style.removeProperty("--c-brand");',
        errors: [{ messageId: 'locked', data: { name: '--c-brand' } }],
      }],
    });
  });

  it('JS 内 el.style["--c-brand"] = ... 计算属性访问：报错', () => {
    ruleTester.run('no-token-modification', rule, {
      valid: [],
      invalid: [{
        filename: 'src/components/af-dialog.js',
        code: 'el.style["--c-brand"] = "#ff0000";',
        errors: [{ messageId: 'locked', data: { name: '--c-brand' } }],
      }],
    });
  });

  it('JS 内 el.style.cssText = "--c-brand: red" 间接覆盖：报错', () => {
    ruleTester.run('no-token-modification', rule, {
      valid: [],
      invalid: [{
        filename: 'src/components/af-dialog.js',
        code: 'el.style.cssText = "--c-brand: red; --s-4: 20px;";',
        errors: [
          { messageId: 'locked', data: { name: '--c-brand' } },
          { messageId: 'locked', data: { name: '--s-4' } },
        ],
      }],
    });
  });
});
