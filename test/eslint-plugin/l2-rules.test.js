// eslint-plugin-aiflow L2 规则测试（7 条合并）
import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import tokenWhitelist from '../../eslint-plugin-aiflow/rules/token-whitelist.js';
import noRecipeBreak from '../../eslint-plugin-aiflow/rules/no-recipe-break.js';
import noVariantConflict from '../../eslint-plugin-aiflow/rules/no-variant-conflict.js';
import noArbitraryValue from '../../eslint-plugin-aiflow/rules/no-arbitrary-value.js';
import noTailwindSyntax from '../../eslint-plugin-aiflow/rules/no-tailwind-syntax.js';
import preferComponent from '../../eslint-plugin-aiflow/rules/prefer-component.js';
import atomicDuplicate from '../../eslint-plugin-aiflow/rules/atomic-duplicate.js';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

describe('L2-1 aiflow/token-whitelist', () => {
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
        errors: [{ messageId: 'unknownClass', data: { name: 'custom-btn' } }],
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
        errors: [{ messageId: 'unknownComponent', data: { name: 'my-widget' } }],
      }],
    });
  });
  it('白名单内自定义元素放行', () => {
    ruleTester.run('token-whitelist', tokenWhitelist, {
      valid: [{ code: 'const html = `<af-dialog></af-dialog>`;' }],
      invalid: [],
    });
  });
});

describe('L2-2 aiflow/no-recipe-break', () => {
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
  it('.input + t-sm 报错', () => {
    ruleTester.run('no-recipe-break', noRecipeBreak, {
      valid: [],
      invalid: [{ code: 'const html = `<input class="input t-sm">`;', errors: [{ messageId: 'inputFont' }] }],
    });
  });
});

describe('L2-3 aiflow/no-variant-conflict', () => {
  it('btn-sm + btn-lg 报错', () => {
    ruleTester.run('no-variant-conflict', noVariantConflict, {
      valid: [],
      invalid: [{ code: 'const html = `<button class="btn-sm btn-lg">x</button>`;', errors: [{ messageId: 'conflict' }] }],
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
      invalid: [{ code: 'const html = `<span class="tag-ok tag-warn">x</span>`;', errors: [{ messageId: 'conflict' }] }],
    });
  });
});

describe('L2-4 aiflow/no-arbitrary-value', () => {
  it('p-[13px] 报错', () => {
    ruleTester.run('no-arbitrary-value', noArbitraryValue, {
      valid: [],
      invalid: [{ code: 'const html = `<div class="p-[13px]">x</div>`;', errors: [{ messageId: 'arbitrary' }] }],
    });
  });
  it('p-7 档位越界报错', () => {
    ruleTester.run('no-arbitrary-value', noArbitraryValue, {
      valid: [],
      invalid: [{ code: 'const html = `<div class="p-7">x</div>`;', errors: [{ messageId: 'outOfRange' }] }],
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

describe('L2-5 aiflow/no-tailwind-syntax', () => {
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

describe('L2-6 aiflow/prefer-component', () => {
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

describe('L2-7 aiflow/atomic-duplicate', () => {
  it('p-4 p-2 报 warn', () => {
    ruleTester.run('atomic-duplicate', atomicDuplicate, {
      valid: [],
      invalid: [{ code: 'const html = `<div class="p-4 p-2">x</div>`;', errors: [{ messageId: 'duplicate' }] }],
    });
  });
  it('t-md t-lg 报 warn', () => {
    ruleTester.run('atomic-duplicate', atomicDuplicate, {
      valid: [],
      invalid: [{ code: 'const html = `<div class="t-md t-lg">x</div>`;', errors: [{ messageId: 'duplicate' }] }],
    });
  });
  it('不同属性放行', () => {
    ruleTester.run('atomic-duplicate', atomicDuplicate, {
      valid: [{ code: 'const html = `<div class="p-4 m-2 t-md">x</div>`;' }],
      invalid: [],
    });
  });
});
