// eslint-plugin-af-mobile L2 规则测试（7 条合并）
import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import tokenWhitelist from '../../eslint-plugin-af-mobile/rules/token-whitelist.js';
import noRecipeBreak from '../../eslint-plugin-af-mobile/rules/no-recipe-break.js';
import noVariantConflict from '../../eslint-plugin-af-mobile/rules/no-variant-conflict.js';
import noArbitraryValue from '../../eslint-plugin-af-mobile/rules/no-arbitrary-value.js';
import noTailwindSyntax from '../../eslint-plugin-af-mobile/rules/no-tailwind-syntax.js';
import preferComponent from '../../eslint-plugin-af-mobile/rules/prefer-component.js';
import atomicDuplicate from '../../eslint-plugin-af-mobile/rules/atomic-duplicate.js';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

describe('L2-1 af-mobile/token-whitelist', () => {
  it('白名单内 class 放行', () => {
    ruleTester.run('token-whitelist', tokenWhitelist, {
      valid: [{ code: 'const html = `<div class="btn btn-sm">x</div>`;' }],
      invalid: [],
    });
  });
  it('白名单外 class 报错', () => {
    ruleTester.run('token-whitelist', tokenWhitelist, {
      valid: [],
      invalid: [{
        code: 'const html = `<div class="custom-btn">x</div>`;',
        errors: [{ messageId: 'unknownClass', data: { name: 'custom-btn', suggest: '' } }],
      }],
    });
  });
  it('extraClass 配置项放行', () => {
    ruleTester.run('token-whitelist', tokenWhitelist, {
      valid: [{ code: 'const html = `<div class="custom-btn">x</div>`;', options: [{ extraClass: ['custom-btn'] }] }],
      invalid: [],
    });
  });
  it('白名单外自定义元素报错', () => {
    ruleTester.run('token-whitelist', tokenWhitelist, {
      valid: [],
      invalid: [{
        code: 'const html = `<my-widget></my-widget>`;',
        errors: [{ messageId: 'unknownComponent', data: { name: 'my-widget', suggest: '' } }],
      }],
    });
  });
  it('白名单内自定义元素放行', () => {
    ruleTester.run('token-whitelist', tokenWhitelist, {
      valid: [{ code: 'const html = `<af-dialog></af-dialog>`;' }],
      invalid: [],
    });
  });
  it('classList.add 白名单外 class 报错（补洞：原规则漏检动态拼接）', () => {
    ruleTester.run('token-whitelist', tokenWhitelist, {
      valid: [],
      invalid: [{
        code: 'el.classList.add("custom-btn");',
        errors: [{ messageId: 'unknownClass', data: { name: 'custom-btn', suggest: '' } }],
      }],
    });
  });
  it('classList.add 白名单内 class 放行', () => {
    ruleTester.run('token-whitelist', tokenWhitelist, {
      valid: [{ code: 'el.classList.add("btn");' }],
      invalid: [],
    });
  });
  it('classList.toggle 白名单外 class 报错', () => {
    ruleTester.run('token-whitelist', tokenWhitelist, {
      valid: [],
      invalid: [{
        code: 'el.classList.toggle("my-class");',
        errors: [{ messageId: 'unknownClass', data: { name: 'my-class', suggest: '' } }],
      }],
    });
  });
  it('classList.remove 数组参数白名单外 class 报错', () => {
    ruleTester.run('token-whitelist', tokenWhitelist, {
      valid: [],
      invalid: [{
        code: 'el.classList.remove(["btn", "custom-cls"]);',
        errors: [{ messageId: 'unknownClass', data: { name: 'custom-cls', suggest: '' } }],
      }],
    });
  });
  it('含 ${} 插值的 class 报 interpolatedClass（非伪报 unknownClass）', () => {
    ruleTester.run('token-whitelist', tokenWhitelist, {
      valid: [],
      invalid: [{
        // 单引号字符串不插值：整串作为 Literal 检查，token 含 ${ → 应引导改写而非伪报"不在白名单"
        code: `const html = '<div class="btn-\${type}">x</div>';`,
        errors: [{ messageId: 'interpolatedClass', data: { name: 'btn-${type}' } }],
      }],
    });
  });
  it('typo class 消息带最近邻建议（sk-lin → sk-ln）', () => {
    ruleTester.run('token-whitelist', tokenWhitelist, {
      valid: [],
      invalid: [{
        code: 'const html = `<div class="sk-lin">x</div>`;',
        errors: [{ messageId: 'unknownClass', data: { name: 'sk-lin', suggest: " Did you mean 'sk-ln'?" } }],
      }],
    });
  });
  it('远离白名单的 class 无建议（suggest 为空串）', () => {
    ruleTester.run('token-whitelist', tokenWhitelist, {
      valid: [],
      invalid: [{
        code: 'const html = `<div class="zzzzzzzzzz">x</div>`;',
        errors: [{ messageId: 'unknownClass', data: { name: 'zzzzzzzzzz', suggest: '' } }],
      }],
    });
  });
});

describe('L2-2 af-mobile/no-recipe-break', () => {
  it('.cell + f 报错', () => {
    ruleTester.run('no-recipe-break', noRecipeBreak, {
      valid: [],
      invalid: [{ code: 'const html = `<div class="cell f">x</div>`;', errors: [{ messageId: 'cellFlex' }] }],
    });
  });
  it('.cell 无 f 放行', () => {
    ruleTester.run('no-recipe-break', noRecipeBreak, {
      valid: [{ code: 'const html = `<div class="cell p-4">x</div>`;' }],
      invalid: [],
    });
  });
  it('.btn + text-brand 报错', () => {
    ruleTester.run('no-recipe-break', noRecipeBreak, {
      valid: [],
      invalid: [{ code: 'const html = `<button class="btn text-brand">x</button>`;', errors: [{ messageId: 'btnColor' }] }],
    });
  });
  it('.btn-ghost + text-brand 放行', () => {
    ruleTester.run('no-recipe-break', noRecipeBreak, {
      valid: [{ code: 'const html = `<button class="btn btn-ghost text-brand">x</button>`;' }],
      invalid: [],
    });
  });
  it('.cell + fi 报错（inline-flex 同样破坏布局）', () => {
    ruleTester.run('no-recipe-break', noRecipeBreak, {
      valid: [],
      invalid: [{ code: 'const html = `<div class="cell fi">x</div>`;', errors: [{ messageId: 'cellFlex' }] }],
    });
  });
  it('.btn + bg-card 报错（白底白字不可见）', () => {
    ruleTester.run('no-recipe-break', noRecipeBreak, {
      valid: [],
      invalid: [{ code: 'const html = `<button class="btn bg-card">x</button>`;', errors: [{ messageId: 'btnBg' }] }],
    });
  });
  it('.btn-ghost + bg-muted 放行（透明底可叠背景）', () => {
    ruleTester.run('no-recipe-break', noRecipeBreak, {
      valid: [{ code: 'const html = `<button class="btn btn-ghost bg-muted">x</button>`;' }],
      invalid: [],
    });
  });
  it('.input + t-sm 报错', () => {
    ruleTester.run('no-recipe-break', noRecipeBreak, {
      valid: [],
      invalid: [{ code: 'const html = `<input class="input t-sm">`;', errors: [{ messageId: 'inputFont' }] }],
    });
  });
  it('.search-input/.textarea + t-xs 同样报错（v6 表单控件恒 16px）', () => {
    ruleTester.run('no-recipe-break', noRecipeBreak, {
      valid: [{ code: 'const html = `<input class="search-input">`;' }],
      invalid: [
        { code: 'const html = `<input class="search-input t-xs">`;', errors: [{ messageId: 'inputFont' }] },
        { code: 'const html = `<textarea class="textarea t-sm">`;', errors: [{ messageId: 'inputFont' }] },
      ],
    });
  });
});

describe('L2-3 af-mobile/no-variant-conflict', () => {
  it('btn-sm + btn-lg 报错', () => {
    ruleTester.run('no-variant-conflict', noVariantConflict, {
      valid: [],
      invalid: [{
        code: 'const html = `<button class="btn-sm btn-lg">x</button>`;',
        output: 'const html = `<button class="btn-lg">x</button>`;',
        errors: [{ messageId: 'conflict' }],
      }],
    });
  });
  it('无冲突放行', () => {
    ruleTester.run('no-variant-conflict', noVariantConflict, {
      valid: [{ code: 'const html = `<button class="btn btn-sm">x</button>`;' }],
      invalid: [],
    });
  });
  it('tag-ok + tag-warn 报错', () => {
    ruleTester.run('no-variant-conflict', noVariantConflict, {
      valid: [],
      invalid: [{
        code: 'const html = `<span class="tag-ok tag-warn">x</span>`;',
        output: 'const html = `<span class="tag-warn">x</span>`;',
        errors: [{ messageId: 'conflict' }],
      }],
    });
  });
  it('f + fi display 冲突报错', () => {
    ruleTester.run('no-variant-conflict', noVariantConflict, {
      valid: [],
      invalid: [{
        code: 'const html = `<div class="f fi">x</div>`;',
        output: 'const html = `<div class="fi">x</div>`;',
        errors: [{ messageId: 'conflict' }],
      }],
    });
  });
  it('lh-tight + lh-normal 行高冲突报错', () => {
    ruleTester.run('no-variant-conflict', noVariantConflict, {
      valid: [],
      invalid: [{
        code: 'const html = `<p class="lh-tight lh-normal">x</p>`;',
        output: 'const html = `<p class="lh-normal">x</p>`;',
        errors: [{ messageId: 'conflict' }],
      }],
    });
  });
  it('bg-card + bg-muted 背景冲突报错', () => {
    ruleTester.run('no-variant-conflict', noVariantConflict, {
      valid: [],
      invalid: [{
        code: 'const html = `<div class="bg-card bg-muted">x</div>`;',
        output: 'const html = `<div class="bg-muted">x</div>`;',
        errors: [{ messageId: 'conflict' }],
      }],
    });
  });
  it('纯色背景 + 渐变背景冲突报错（v1.6.1 新增背景类）', () => {
    ruleTester.run('no-variant-conflict', noVariantConflict, {
      valid: [],
      invalid: [{
        code: 'const html = `<div class="bg-brand bg-grad-brand">x</div>`;',
        output: 'const html = `<div class="bg-grad-brand">x</div>`;',
        errors: [{ messageId: 'conflict' }],
      }],
    });
  });
  it('px 定向间距重复冲突报错（v1.6.1）', () => {
    ruleTester.run('no-variant-conflict', noVariantConflict, {
      valid: [],
      invalid: [{
        code: 'const html = `<div class="px-3 px-4">x</div>`;',
        output: 'const html = `<div class="px-4">x</div>`;',
        errors: [{ messageId: 'conflict' }],
      }],
    });
  });
  it('px 与 py 正交放行（不同属性）', () => {
    ruleTester.run('no-variant-conflict', noVariantConflict, {
      valid: [{ code: 'const html = `<div class="px-4 py-3">x</div>`;' }],
      invalid: [],
    });
  });
  it('grid 网格类冲突报错（v1.6.1）', () => {
    ruleTester.run('no-variant-conflict', noVariantConflict, {
      valid: [],
      invalid: [{
        code: 'const html = `<div class="grid-2 grid-3">x</div>`;',
        output: 'const html = `<div class="grid-3">x</div>`;',
        errors: [{ messageId: 'conflict' }],
      }],
    });
  });
  it('tag-plain 语义色变体互斥报错（v1.6.1）', () => {
    ruleTester.run('no-variant-conflict', noVariantConflict, {
      valid: [],
      invalid: [{
        code: 'const html = `<span class="tag-plain-ok tag-plain-danger">x</span>`;',
        output: 'const html = `<span class="tag-plain-danger">x</span>`;',
        errors: [{ messageId: 'conflict' }],
      }],
    });
  });
  it('aspect 比例类冲突报错（v1.6.1）', () => {
    ruleTester.run('no-variant-conflict', noVariantConflict, {
      valid: [],
      invalid: [{
        code: 'const html = `<img class="aspect-1 aspect-16-9" src="a.png" alt="">`;',
        output: 'const html = `<img class="aspect-16-9" src="a.png" alt="">`;',
        errors: [{ messageId: 'conflict' }],
      }],
    });
  });
});

describe('L2-4 af-mobile/no-arbitrary-value', () => {
  it('p-[13px] 报错', () => {
    ruleTester.run('no-arbitrary-value', noArbitraryValue, {
      valid: [],
      invalid: [{ code: 'const html = `<div class="p-[13px]">x</div>`;', errors: [{ messageId: 'arbitrary' }] }],
    });
  });
  it('p-9 档位越界报错', () => {
    ruleTester.run('no-arbitrary-value', noArbitraryValue, {
      valid: [],
      invalid: [{ code: 'const html = `<div class="p-9">x</div>`;', errors: [{ messageId: 'outOfRange' }] }],
    });
  });
  it('p-7 白名单档位放行', () => {
    ruleTester.run('no-arbitrary-value', noArbitraryValue, {
      valid: [{ code: 'const html = `<div class="p-7">x</div>`;' }],
      invalid: [],
    });
  });
  it('p-4 合法档位放行', () => {
    ruleTester.run('no-arbitrary-value', noArbitraryValue, {
      valid: [{ code: 'const html = `<div class="p-4">x</div>`;' }],
      invalid: [],
    });
  });
  it('t-md 合法档位放行', () => {
    ruleTester.run('no-arbitrary-value', noArbitraryValue, {
      valid: [{ code: 'const html = `<div class="t-md">x</div>`;' }],
      invalid: [],
    });
  });
});

describe('L2-5 af-mobile/no-tailwind-syntax', () => {
  it('md:p-4 报错', () => {
    ruleTester.run('no-tailwind-syntax', noTailwindSyntax, {
      valid: [],
      invalid: [{ code: 'const html = `<div class="md:p-4">x</div>`;', errors: [{ messageId: 'tailwind' }] }],
    });
  });
  it('hover:btn 报错', () => {
    ruleTester.run('no-tailwind-syntax', noTailwindSyntax, {
      valid: [],
      invalid: [{ code: 'const html = `<button class="hover:btn">x</button>`;', errors: [{ messageId: 'tailwind' }] }],
    });
  });
  it('无前缀放行', () => {
    ruleTester.run('no-tailwind-syntax', noTailwindSyntax, {
      valid: [{ code: 'const html = `<div class="p-4 m-2">x</div>`;' }],
      invalid: [],
    });
  });
});

describe('L2-6 af-mobile/prefer-component', () => {
  it('.toast + setTimeout 报 warn', () => {
    ruleTester.run('prefer-component', preferComponent, {
      valid: [],
      invalid: [{
        code: 'const html = `<div class="toast">x</div>`; setTimeout(() => {}, 2000);',
        errors: [{ messageId: 'toast' }],
      }],
    });
  });
  it('.sheet 报 warn', () => {
    ruleTester.run('prefer-component', preferComponent, {
      valid: [],
      invalid: [{ code: 'const html = `<div class="sheet">x</div>`;', errors: [{ messageId: 'sheet' }] }],
    });
  });
  it('无匹配放行', () => {
    ruleTester.run('prefer-component', preferComponent, {
      valid: [{ code: 'const html = `<div class="card">x</div>`;' }],
      invalid: [],
    });
  });
});

describe('L2-7 af-mobile/atomic-duplicate', () => {
  it('p-4 p-2 报 warn', () => {
    ruleTester.run('atomic-duplicate', atomicDuplicate, {
      valid: [],
      invalid: [{
        code: 'const html = `<div class="p-4 p-2">x</div>`;',
        output: 'const html = `<div class="p-2">x</div>`;',
        errors: [{ messageId: 'duplicate' }],
      }],
    });
  });
  it('t-md t-lg 报 warn', () => {
    ruleTester.run('atomic-duplicate', atomicDuplicate, {
      valid: [],
      invalid: [{
        code: 'const html = `<span class="t-md t-lg">x</span>`;',
        output: 'const html = `<span class="t-lg">x</span>`;',
        errors: [{ messageId: 'duplicate' }],
      }],
    });
  });
  it('字号 + 字重组合放行（t-xl t-b 不再误判，v1.6.1 修复）', () => {
    ruleTester.run('atomic-duplicate', atomicDuplicate, {
      valid: [
        { code: 'const html = `<span class="t-xl t-b text-danger">¥68</span>`;' },
        { code: 'const html = `<span class="t-lg t-semibold">4.9</span>`;' },
        { code: 'const html = `<span class="t-b t-md">x</span>`;' },
      ],
      invalid: [],
    });
  });
  it('两个字重类重复报 warn（font-weight 桶）', () => {
    ruleTester.run('atomic-duplicate', atomicDuplicate, {
      valid: [],
      invalid: [{
        code: 'const html = `<span class="t-b t-m">x</span>`;',
        output: 'const html = `<span class="t-m">x</span>`;',
        errors: [{ message: "Duplicate font-weight: 't-b' is overwritten by 't-m'. Keep only 't-m'" }],
      }],
    });
  });
  it('字号 + 字重 + 字号重复：只报字号对，autofix 只删首个字号类', () => {
    ruleTester.run('atomic-duplicate', atomicDuplicate, {
      valid: [],
      invalid: [{
        code: 'const html = `<span class="t-xl t-b t-lg">x</span>`;',
        output: 'const html = `<span class="t-b t-lg">x</span>`;',
        errors: [{ messageId: 'duplicate' }],
      }],
    });
  });
  it('不同属性放行', () => {
    ruleTester.run('atomic-duplicate', atomicDuplicate, {
      valid: [{ code: 'const html = `<div class="p-4 m-2 t-md">x</div>`;' }],
      invalid: [],
    });
  });
});
