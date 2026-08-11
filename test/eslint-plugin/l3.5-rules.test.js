// eslint-plugin-aiflow L3.5 规则测试（11 条合并）
import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import wcEffectsWhitelist from '../../eslint-plugin-aiflow/rules/wc-effects-whitelist.js';
import wcDefinepageSingle from '../../eslint-plugin-aiflow/rules/wc-definepage-single.js';
import wcNoAddeventlistener from '../../eslint-plugin-aiflow/rules/wc-no-addeventlistener.js';
import wcBlockPropsCount from '../../eslint-plugin-aiflow/rules/wc-block-props-count.js';
import wcBlockNoInternalRef from '../../eslint-plugin-aiflow/rules/wc-block-no-internal-ref.js';
import wcStateSchema from '../../eslint-plugin-aiflow/rules/wc-state-schema.js';
import wcTransformPure from '../../eslint-plugin-aiflow/rules/wc-transform-pure.js';
import wcPureFunction from '../../eslint-plugin-aiflow/rules/wc-pure-function.js';
import wcBlockStates from '../../eslint-plugin-aiflow/rules/wc-block-states.js';
import wcBlockVariantEnum from '../../eslint-plugin-aiflow/rules/wc-block-variant-enum.js';
import wcBindSyntax from '../../eslint-plugin-aiflow/rules/wc-bind-syntax.js';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

// ===== 批次 A：4 条简单规则 =====

describe('L3.5-1 aiflow/wc-effects-whitelist', () => {
  it('白名单内的 key 放行', () => {
    ruleTester.run('wc-effects-whitelist', wcEffectsWhitelist, {
      valid: [{
        code: `definePage({ effects: { mount: () => fetch(), route: (p) => load(p.id), interval: [60000, () => refresh()] } });`,
      }],
      invalid: [],
    });
  });
  it('非白名单 key 报错', () => {
    ruleTester.run('wc-effects-whitelist', wcEffectsWhitelist, {
      valid: [],
      invalid: [{
        code: `definePage({ effects: { scroll: () => handleScroll() } });`,
        errors: [{ messageId: 'invalidKey' }],
      }],
    });
  });
  it('多个非白名单 key 各报错', () => {
    ruleTester.run('wc-effects-whitelist', wcEffectsWhitelist, {
      valid: [],
      invalid: [{
        code: `definePage({ effects: { scroll: () => 1, tap: () => 2, mount: () => 3 } });`,
        errors: [{ messageId: 'invalidKey' }, { messageId: 'invalidKey' }],
      }],
    });
  });
  it('非 definePage 调用的 effects 不检测', () => {
    ruleTester.run('wc-effects-whitelist', wcEffectsWhitelist, {
      valid: [{
        code: `foo({ effects: { scroll: () => 1 } });`,
      }],
      invalid: [],
    });
  });
});

describe('L3.5-2 aiflow/wc-definepage-single', () => {
  it('单个 definePage 放行', () => {
    ruleTester.run('wc-definepage-single', wcDefinepageSingle, {
      valid: [{ code: `definePage({ state: { x: 1 } });` }],
      invalid: [],
    });
  });
  it('0 个 definePage 放行', () => {
    ruleTester.run('wc-definepage-single', wcDefinepageSingle, {
      valid: [{ code: `const x = 1;` }],
      invalid: [],
    });
  });
  it('2 个 definePage 报 1 个错', () => {
    ruleTester.run('wc-definepage-single', wcDefinepageSingle, {
      valid: [],
      invalid: [{
        code: `definePage({ state: { x: 1 } }); definePage({ state: { y: 2 } });`,
        errors: [{ messageId: 'multiple' }],
      }],
    });
  });
  it('3 个 definePage 报 2 个错', () => {
    ruleTester.run('wc-definepage-single', wcDefinepageSingle, {
      valid: [],
      invalid: [{
        code: `definePage({}); definePage({}); definePage({});`,
        errors: [{ messageId: 'multiple' }, { messageId: 'multiple' }],
      }],
    });
  });
});

describe('L3.5-3 aiflow/wc-no-addeventlistener', () => {
  it('库源码 src/components 放行', () => {
    ruleTester.run('wc-no-addeventlistener', wcNoAddeventlistener, {
      valid: [{
        filename: 'src/components/af-foo.js',
        code: `mounted() { this.addEventListener('click', fn); }`,
      }],
      invalid: [],
    });
  });
  it('库源码 src/blocks 放行', () => {
    ruleTester.run('wc-no-addeventlistener', wcNoAddeventlistener, {
      valid: [{
        filename: 'src/blocks/af-auth-form.js',
        code: `mounted() { this.addEventListener('click', fn); }`,
      }],
      invalid: [],
    });
  });
  it('消费端裸 addEventListener 报错', () => {
    ruleTester.run('wc-no-addeventlistener', wcNoAddeventlistener, {
      valid: [],
      invalid: [{
        filename: 'app/pages/home.js',
        code: `document.addEventListener('scroll', handler);`,
        errors: [{ messageId: 'forbidden' }],
      }],
    });
  });
  it('消费端有 disable 注释放行', () => {
    ruleTester.run('wc-no-addeventlistener', wcNoAddeventlistener, {
      valid: [{
        filename: 'app/pages/home.js',
        code: `// eslint-disable-next-line wc-no-addeventlistener
        document.addEventListener('scroll', handler);`,
      }],
      invalid: [],
    });
  });
  it('测试目录放行', () => {
    ruleTester.run('wc-no-addeventlistener', wcNoAddeventlistener, {
      valid: [{
        filename: 'test/af-foo.test.js',
        code: `document.addEventListener('scroll', handler);`,
      }],
      invalid: [],
    });
  });
});

describe('L3.5-4 aiflow/wc-block-props-count', () => {
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

// ===== 批次 B：4 条 AST 规则 =====

describe('L3.5-5 aiflow/wc-block-no-internal-ref', () => {
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

describe('L3.5-6 aiflow/wc-state-schema', () => {
  it('同行有类型注释放行', () => {
    ruleTester.run('wc-state-schema', wcStateSchema, {
      valid: [{
        code: `definePage({ state: { tab: 'all', loading: false, cart: [], form: { x: 1 } } });`.replace(
          /tab: 'all'/, "tab: 'all', // String"
        ).replace(/loading: false/, "loading: false, // Boolean").replace(/cart: \[\]/, "cart: [], // Array").replace(/form: \{ x: 1 \}/, "form: { x: 1 }, // Object"),
      }],
      invalid: [],
    });
  });
  it('缺类型注释报错', () => {
    ruleTester.run('wc-state-schema', wcStateSchema, {
      valid: [],
      invalid: [{
        code: `definePage({ state: { tab: 'all', loading: false } });`,
        errors: [{ messageId: 'missing' }, { messageId: 'missing' }],
      }],
    });
  });
  it('部分缺注释只报缺的', () => {
    ruleTester.run('wc-state-schema', wcStateSchema, {
      valid: [],
      invalid: [{
        code: `definePage({ state: { tab: 'all', // String\n loading: false } });`,
        errors: [{ messageId: 'missing' }],
      }],
    });
  });
  it('非 definePage 的 state 不检测', () => {
    ruleTester.run('wc-state-schema', wcStateSchema, {
      valid: [{ code: `foo({ state: { tab: 'all' } });` }],
      invalid: [],
    });
  });
});

describe('L3.5-7 aiflow/wc-transform-pure', () => {
  it('纯函数 transform 放行', () => {
    ruleTester.run('wc-transform-pure', wcTransformPure, {
      valid: [{
        code: `definePage({ transform: (raw) => ({ products: raw.list.filter(p => p.on).map(p => ({ id: p.id, price: (p.cents/100).toFixed(2) })), total: raw.count }) });`,
      }],
      invalid: [],
    });
  });
  it('transform 含 fetch 报错', () => {
    ruleTester.run('wc-transform-pure', wcTransformPure, {
      valid: [],
      invalid: [{
        code: `definePage({ transform: (raw) => { fetch('/log', { method: 'POST' }); return raw; } });`,
        errors: [{ messageId: 'fetch' }],
      }],
    });
  });
  it('transform 访问 document 报错', () => {
    ruleTester.run('wc-transform-pure', wcTransformPure, {
      valid: [],
      invalid: [{
        code: `definePage({ transform: (raw) => { document.title = raw.title; return raw; } });`,
        errors: [{ messageId: 'dom' }],
      }],
    });
  });
  it('transform 外部变量赋值报错', () => {
    ruleTester.run('wc-transform-pure', wcTransformPure, {
      valid: [],
      invalid: [{
        code: `definePage({ transform: (raw) => { total = raw.count; return raw; } });`,
        errors: [{ messageId: 'assign' }],
      }],
    });
  });
  it('非 transform 函数体内的 fetch 不报错', () => {
    ruleTester.run('wc-transform-pure', wcTransformPure, {
      valid: [{ code: `fetch('/api'); definePage({ transform: (raw) => raw });` }],
      invalid: [],
    });
  });
});

describe('L3.5-8 aiflow/wc-pure-function', () => {
  it('纯 computed 放行', () => {
    ruleTester.run('wc-pure-function', wcPureFunction, {
      valid: [{
        code: `definePage({ computed: { total: () => state.list.reduce((s, i) => s + i.p, 0) } });`,
      }],
      invalid: [],
    });
  });
  it('computed 含 fetch 报错', () => {
    ruleTester.run('wc-pure-function', wcPureFunction, {
      valid: [],
      invalid: [{
        code: `definePage({ computed: { total: () => { fetch('/x'); return 1; } } });`,
        errors: [{ messageId: 'fetch' }],
      }],
    });
  });
  it('actions 赋值 state 放行', () => {
    ruleTester.run('wc-pure-function', wcPureFunction, {
      valid: [{
        code: `definePage({ actions: { setTab: (t) => state.tab = t, push: (i) => state.list.push(i) } });`,
      }],
      invalid: [],
    });
  });
  it('actions 赋值非 state 变量报错', () => {
    ruleTester.run('wc-pure-function', wcPureFunction, {
      valid: [],
      invalid: [{
        code: `definePage({ actions: { setX: (v) => { x = v; state.tab = v; } } });`,
        errors: [{ messageId: 'assignNonState' }],
      }],
    });
  });
  it('actions 访问 document 报错', () => {
    ruleTester.run('wc-pure-function', wcPureFunction, {
      valid: [],
      invalid: [{
        code: `definePage({ actions: { go: () => { document.title = 'x'; } } });`,
        errors: [{ messageId: 'dom' }],
      }],
    });
  });
});

// ===== 批次 C：3 条语义规则 =====

describe('L3.5-9 aiflow/wc-block-states', () => {
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

describe('L3.5-10 aiflow/wc-block-variant-enum', () => {
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

describe('L3.5-11 aiflow/wc-bind-syntax', () => {
  it('绑定 state.xxx 放行', () => {
    ruleTester.run('wc-bind-syntax', wcBindSyntax, {
      valid: [{
        filename: 'app/pages/home.js',
        code: `el.innerHTML = '<af-product-grid :items="state.products">';`,
      }],
      invalid: [],
    });
  });
  it('绑定 ref.xxx 放行', () => {
    ruleTester.run('wc-bind-syntax', wcBindSyntax, {
      valid: [{
        filename: 'app/pages/home.js',
        code: `el.innerHTML = '<af-product-grid :items="ds.products">';`,
      }],
      invalid: [],
    });
  });
  it('绑定声明式指令放行', () => {
    ruleTester.run('wc-bind-syntax', wcBindSyntax, {
      valid: [{
        filename: 'app/pages/home.js',
        code: `el.innerHTML = '<af-auth-form @success="redirect:/home">';`,
      }],
      invalid: [],
    });
  });
  it('绑定非法表达式报错', () => {
    ruleTester.run('wc-bind-syntax', wcBindSyntax, {
      valid: [],
      invalid: [{
        filename: 'app/pages/home.js',
        code: `el.innerHTML = '<af-product-grid :items="window.fetch()">';`,
        errors: [{ messageId: 'invalid' }],
      }],
    });
  });
  it('绑定复杂表达式报错', () => {
    ruleTester.run('wc-bind-syntax', wcBindSyntax, {
      valid: [],
      invalid: [{
        filename: 'app/pages/home.js',
        code: `el.innerHTML = '<af-product-grid :items="a + b">';`,
        errors: [{ messageId: 'invalid' }],
      }],
    });
  });
  it('库源码放行', () => {
    ruleTester.run('wc-bind-syntax', wcBindSyntax, {
      valid: [{
        filename: 'src/blocks/af-foo.js',
        code: `el.innerHTML = '<div :items="window.x">';`,
      }],
      invalid: [],
    });
  });
});
