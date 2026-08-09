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
});
