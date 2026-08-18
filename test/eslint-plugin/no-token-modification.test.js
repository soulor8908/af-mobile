// eslint-plugin-af-mobile 规则测试 —— no-token-modification
// CSS 文本无法过 RuleTester（其先把 code 按 JS parse，CSS 必 fatal），
// CSS 分支用直调 create().Program 的轻量 harness；JS 分支走 RuleTester。
import { describe, it, expect } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../eslint-plugin-af-mobile/rules/no-token-modification.js';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

// 直调规则 CSS 分支：构造最小 context，收集 report
function runCssRule(filename, css) {
  const reports = [];
  const handlers = rule.create({
    filename,
    sourceCode: { getText: () => css },
    report: (r) => reports.push(r),
  });
  handlers.Program?.({ type: 'Program' });
  return reports;
}

describe('af-mobile/no-token-modification', () => {
  it('tokens.css 文件内重定义 token：放行', () => {
    expect(runCssRule('src/tokens.css', ':root { --c-brand: #07c160; }')).toHaveLength(0);
  });

  it('tokens.project.css 文件内重定义 token：放行', () => {
    expect(runCssRule('src/tokens.project.css', ':root { --c-brand: #ff0000; }')).toHaveLength(0);
  });

  it('非 tokens.css 文件内重定义 --c-brand：报错', () => {
    const reports = runCssRule('src/components/af-dialog.js', ':root { --c-brand: red; }');
    expect(reports).toHaveLength(1);
    expect(reports[0].messageId).toBe('locked');
    expect(reports[0].data).toEqual({ name: '--c-brand' });
  });

  it('非 tokens.css 文件内重定义 --s-4：报错', () => {
    const reports = runCssRule('src/components/foo.css', '.card { --s-4: 20px; }');
    expect(reports).toHaveLength(1);
    expect(reports[0].messageId).toBe('locked');
    expect(reports[0].data).toEqual({ name: '--s-4' });
  });

  it('非 token 前缀的 CSS 变量：放行', () => {
    expect(runCssRule('src/components/foo.css', '.card { --my-custom-var: 10px; }')).toHaveLength(0);
  });

  it('不含 -- 的文件：放行', () => {
    expect(runCssRule('src/components/foo.css', '.card { color: red; }')).toHaveLength(0);
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
