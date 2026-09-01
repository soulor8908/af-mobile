// eslint-plugin-af-mobile 规则测试 —— no-af-pierce（OPT-5 新增）
import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../eslint-plugin-af-mobile/rules/no-af-pierce.js';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

describe('af-mobile/no-af-pierce', () => {
  it('querySelector 穿透 Shadow 组件内部：报 error', () => {
    ruleTester.run('no-af-pierce', rule, {
      valid: [],
      invalid: [{
        code: `document.querySelector('af-dialog [data-role="panel"]');`,
        errors: [{ messageId: 'pierce' }],
      }],
    });
  });

  it('模板串中的穿透选择器：报 error', () => {
    ruleTester.run('no-af-pierce', rule, {
      valid: [],
      invalid: [{
        code: 'const sel = `af-tabbar .tab-item`;',
        errors: [{ messageId: 'pierce' }],
      }],
    });
  });

  it('innerHTML 内嵌 style 段穿透 Light 组件内部：报 error', () => {
    ruleTester.run('no-af-pierce', rule, {
      valid: [],
      invalid: [{
        code: 'const html = `<style>.hero-grad af-progress .progress { color: red }</style>`;',
        errors: [{ messageId: 'pierce' }],
      }],
    });
  });

  it('宿主自身层选择器放行（attr / :hover / ::part / 单标签）', () => {
    ruleTester.run('no-af-pierce', rule, {
      valid: [
        { code: `document.querySelector('af-dialog[open]');` },
        { code: `document.querySelectorAll('af-list > af-item').length;` },
        { code: 'const css = `af-dialog::part(header) { background: red }`;' },
        { code: 'const css = `af-progress:hover { opacity: .8 }`;' },
      ],
      invalid: [],
    });
  });

  it('HTML 多行属性标签不误报', () => {
    ruleTester.run('no-af-pierce', rule, {
      valid: [{
        code: 'const html = `<af-dialog\n  title="确认"\n  variant="center"></af-dialog>`;',
      }],
      invalid: [],
    });
  });
});
