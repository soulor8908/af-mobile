// eslint-plugin-af-mobile L3.5 规则测试（5 条：Block 层 + register 引导）
// （definePage 消费端 7 条规则已随 definePage 全局单例移除）
import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import wcBlockPropsCount from '../../eslint-plugin-af-mobile/rules/wc-block-props-count.js';
import wcBlockNoInternalRef from '../../eslint-plugin-af-mobile/rules/wc-block-no-internal-ref.js';
import wcBlockStates from '../../eslint-plugin-af-mobile/rules/wc-block-states.js';
import wcBlockVariantEnum from '../../eslint-plugin-af-mobile/rules/wc-block-variant-enum.js';
import noRegisterAll from '../../eslint-plugin-af-mobile/rules/no-register-all.js';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

describe('L3.5-1 af-mobile/wc-block-props-count', () => {
  const BLOCK_HEAD = `import { AfElement } from '../lib/af-element.js'; export class AfAuthForm extends AfElement {}`;
  it('props 数在 2-5 放行', () => {
    ruleTester.run('wc-block-props-count', wcBlockPropsCount, {
      valid: [{
        filename: 'src/blocks/af-foo.js',
        code: `${BLOCK_HEAD}
        AfElement.defineProp(AfAuthForm.prototype, 'a', { type: String });
        AfElement.defineProp(AfAuthForm.prototype, 'b', { type: String });`,
      }],
      invalid: [],
    });
  });
  it('props 数 = 5（上限）放行', () => {
    ruleTester.run('wc-block-props-count', wcBlockPropsCount, {
      valid: [{
        filename: 'src/blocks/af-foo.js',
        code: `${BLOCK_HEAD}
        AfElement.defineProp(AfAuthForm.prototype, 'a', {});
        AfElement.defineProp(AfAuthForm.prototype, 'b', {});
        AfElement.defineProp(AfAuthForm.prototype, 'c', {});
        AfElement.defineProp(AfAuthForm.prototype, 'd', {});
        AfElement.defineProp(AfAuthForm.prototype, 'e', {});`,
      }],
      invalid: [],
    });
  });
  it('props 数 < 2 报错', () => {
    ruleTester.run('wc-block-props-count', wcBlockPropsCount, {
      valid: [],
      invalid: [{
        filename: 'src/blocks/af-foo.js',
        code: `${BLOCK_HEAD}
        AfElement.defineProp(AfAuthForm.prototype, 'a', {});`,
        errors: [{ messageId: 'tooFew' }],
      }],
    });
  });
  it('props 数 > 5 报错', () => {
    ruleTester.run('wc-block-props-count', wcBlockPropsCount, {
      valid: [],
      invalid: [{
        filename: 'src/blocks/af-foo.js',
        code: `${BLOCK_HEAD}
        AfElement.defineProp(AfAuthForm.prototype, 'a', {});
        AfElement.defineProp(AfAuthForm.prototype, 'b', {});
        AfElement.defineProp(AfAuthForm.prototype, 'c', {});
        AfElement.defineProp(AfAuthForm.prototype, 'd', {});
        AfElement.defineProp(AfAuthForm.prototype, 'e', {});
        AfElement.defineProp(AfAuthForm.prototype, 'f', {});`,
        errors: [{ messageId: 'tooMany' }],
      }],
    });
  });
  it('非 src/blocks 文件放行', () => {
    ruleTester.run('wc-block-props-count', wcBlockPropsCount, {
      valid: [{
        filename: 'src/components/af-list.js',
        code: `AfElement.defineProp(X.prototype, 'a', {});`,
      }],
      invalid: [],
    });
  });
});

describe('L3.5-2 af-mobile/wc-block-no-internal-ref', () => {
  it('根标签选择器放行', () => {
    ruleTester.run('wc-block-no-internal-ref', wcBlockNoInternalRef, {
      valid: [{
        filename: 'app/pages/home.js',
        code: `document.querySelector('af-auth-form').setAttribute('loading', 'true');`,
      }],
      invalid: [],
    });
  });
  it('穿透子代选择器报错', () => {
    ruleTester.run('wc-block-no-internal-ref', wcBlockNoInternalRef, {
      valid: [],
      invalid: [{
        filename: 'app/pages/home.js',
        code: `document.querySelector('af-auth-form > div > input').value = 'x';`,
        errors: [{ messageId: 'childSelector' }],
      }],
    });
  });
  it('穿透后代选择器报错', () => {
    ruleTester.run('wc-block-no-internal-ref', wcBlockNoInternalRef, {
      valid: [],
      invalid: [{
        filename: 'app/pages/home.js',
        code: `el.querySelectorAll('af-product-grid .price').forEach(fn);`,
        errors: [{ messageId: 'childSelector' }],
      }],
    });
  });
  it('shadowRoot 访问 Block 实例报错', () => {
    ruleTester.run('wc-block-no-internal-ref', wcBlockNoInternalRef, {
      valid: [],
      invalid: [{
        filename: 'app/pages/home.js',
        code: `afAuthForm.shadowRoot.querySelector('input');`,
        errors: [{ messageId: 'shadowRoot' }],
      }],
    });
  });
  it('库源码放行', () => {
    ruleTester.run('wc-block-no-internal-ref', wcBlockNoInternalRef, {
      valid: [{
        filename: 'src/blocks/af-auth-form.js',
        code: `this.querySelector('af-auth-form > div');`,
      }],
      invalid: [],
    });
  });
});

describe('L3.5-3 af-mobile/wc-block-states', () => {
  const BLOCK_HEAD = `import { AfElement } from '../lib/af-element.js'; export class AfFoo extends AfElement {`;
  const BLOCK_TAIL = `}`;
  it('五态完整放行', () => {
    ruleTester.run('wc-block-states', wcBlockStates, {
      valid: [{
        filename: 'src/blocks/af-foo.js',
        code: `${BLOCK_HEAD}
          _render() {
            if (this.loading) return this._renderLoading();
            if (this._error) return this._renderError();
            if (!this._data?.length) return this._renderEmpty();
            return this._renderSuccess();
          }
        ${BLOCK_TAIL}`,
      }],
      invalid: [],
    });
  });
  it('缺 loading 态报错', () => {
    ruleTester.run('wc-block-states', wcBlockStates, {
      valid: [],
      invalid: [{
        filename: 'src/blocks/af-foo.js',
        code: `${BLOCK_HEAD}
          _render() {
            if (this._error) return 'err';
            if (this._data?.length === 0) return 'empty';
            return 'ok';
          }
        ${BLOCK_TAIL}`,
        errors: [{ messageId: 'missing' }],
      }],
    });
  });
  it('缺三态报三个错', () => {
    ruleTester.run('wc-block-states', wcBlockStates, {
      valid: [],
      invalid: [{
        filename: 'src/blocks/af-foo.js',
        code: `${BLOCK_HEAD} _render() { return '<div>ok</div>'; } ${BLOCK_TAIL}`,
        errors: [{ messageId: 'missing' }, { messageId: 'missing' }, { messageId: 'missing' }],
      }],
    });
  });
  it('非 src/blocks 放行', () => {
    ruleTester.run('wc-block-states', wcBlockStates, {
      valid: [{
        filename: 'src/components/af-list.js',
        code: `export class X { _render() { return 'ok'; } }`,
      }],
      invalid: [],
    });
  });
});

describe('L3.5-4 af-mobile/wc-block-variant-enum', () => {
  const HEAD = `import { AfElement } from '../lib/af-element.js'; export class AfFoo extends AfElement {}`;
  it('defineProp 第三参数含 enum 字段放行', () => {
    ruleTester.run('wc-block-variant-enum', wcBlockVariantEnum, {
      valid: [{
        filename: 'src/blocks/af-foo.js',
        code: `${HEAD} AfElement.defineProp(AfFoo.prototype, 'variant', { type: String, enum: ['a', 'b'] });`,
      }],
      invalid: [],
    });
  });
  it('onAttributeChange 校验 variant 放行', () => {
    ruleTester.run('wc-block-variant-enum', wcBlockVariantEnum, {
      valid: [{
        filename: 'src/blocks/af-foo.js',
        code: `${HEAD}
          AfElement.defineProp(AfFoo.prototype, 'variant', { type: String });
          AfFoo.prototype.onAttributeChange = function(name) { if (name === 'variant') { /* validate */ } };
        `,
      }],
      invalid: [],
    });
  });
  it('defineProp 无 enum 且无校验报错', () => {
    ruleTester.run('wc-block-variant-enum', wcBlockVariantEnum, {
      valid: [],
      invalid: [{
        filename: 'src/blocks/af-foo.js',
        code: `${HEAD} AfElement.defineProp(AfFoo.prototype, 'variant', { type: String });`,
        errors: [{ messageId: 'noEnum' }],
      }],
    });
  });
  it('上方注释含枚举值放行', () => {
    ruleTester.run('wc-block-variant-enum', wcBlockVariantEnum, {
      valid: [{
        filename: 'src/blocks/af-foo.js',
        code: `${HEAD}
          // variant: phone-code / password / sms
          AfElement.defineProp(AfFoo.prototype, 'variant', { type: String });
        `,
      }],
      invalid: [],
    });
  });
});

describe('L3.5-5 af-mobile/no-register-all', () => {
  it('无 registerAll 放行', () => {
    ruleTester.run('no-register-all', noRegisterAll, {
      valid: [{ code: `register('af-list', 'af-dialog');` }],
      invalid: [],
    });
  });
  it('registerAll() 报错', () => {
    ruleTester.run('no-register-all', noRegisterAll, {
      valid: [],
      invalid: [{
        code: `registerAll();`,
        errors: [{ messageId: 'registerAll' }],
      }],
    });
  });
  it('消费端方法链中的 registerAll 报错', () => {
    ruleTester.run('no-register-all', noRegisterAll, {
      valid: [],
      invalid: [{
        code: `afMobile.registerAll();`,
        errors: [{ messageId: 'registerAll' }],
      }],
    });
  });
  it('库源码放行（index.js 导出入口）', () => {
    ruleTester.run('no-register-all', noRegisterAll, {
      valid: [{
        filename: 'src/index.js',
        code: `export { registerAll } from './register.js';`,
      }],
      invalid: [],
    });
  });
  it('构建脚本放行', () => {
    ruleTester.run('no-register-all', noRegisterAll, {
      valid: [{
        filename: 'scripts/build.mjs',
        code: `registerAll();`,
      }],
      invalid: [],
    });
  });
});
