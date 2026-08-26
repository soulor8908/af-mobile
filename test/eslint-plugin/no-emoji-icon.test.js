// eslint-plugin-af-mobile 规则测试 —— no-emoji-icon（v1.6.1 新增）
import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../eslint-plugin-af-mobile/rules/no-emoji-icon.js';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

describe('af-mobile/no-emoji-icon', () => {
  it('tabbar 配置 icon 属性含 emoji：报 warn', () => {
    ruleTester.run('no-emoji-icon', rule, {
      valid: [],
      invalid: [{
        code: `const TABS = [{ label: '待办', icon: '📋' }, { label: '统计', icon: '📊' }];`,
        errors: [
          { messageId: 'emojiIcon' },
          { messageId: 'emojiIcon' },
        ],
      }],
    });
  });

  it('tab-item 元素内 emoji：报 warn', () => {
    ruleTester.run('no-emoji-icon', rule, {
      valid: [],
      invalid: [{
        code: 'const html = `<button class="tab-item">📋 首页</button>`;',
        errors: [{ messageId: 'emojiIcon' }],
      }],
    });
  });

  it('data-role="icon" 元素内 emoji：报 warn', () => {
    ruleTester.run('no-emoji-icon', rule, {
      valid: [],
      invalid: [{
        code: 'const html = `<span data-role="icon">📍</span>`;',
        errors: [{ messageId: 'emojiIcon' }],
      }],
    });
  });

  it('非图标语境的 emoji（正文文本）：放行', () => {
    ruleTester.run('no-emoji-icon', rule, {
      valid: [{ code: 'const text = `今日活动含糖警告 🍬 请注意`;' }],
      invalid: [],
    });
  });

  it('icon 属性为 SVG / 纯文字：放行', () => {
    ruleTester.run('no-emoji-icon', rule, {
      valid: [
        { code: `const TABS = [{ label: '待办' }, { label: '统计' }];` },
        { code: `const cfg = { icon: '<svg viewBox="0 0 24 24"></svg>' };` },
      ],
      invalid: [],
    });
  });

  it('tab-item 内 SVG 图标 + 文字：放行', () => {
    ruleTester.run('no-emoji-icon', rule, {
      valid: [{
        code: 'const html = `<button class="tab-item"><svg viewBox="0 0 24 24" width="22" height="22"></svg>首页</button>`;',
      }],
      invalid: [],
    });
  });

  it('模板字符串中的 icon 属性插值（无法静态判定）：放行', () => {
    ruleTester.run('no-emoji-icon', rule, {
      valid: [{ code: 'const cfg = { icon: `${name}` };' }],
      invalid: [],
    });
  });
});
