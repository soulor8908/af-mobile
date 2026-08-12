// eslint-plugin-aiflow L3 规则测试（6 条合并）
import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import wcLightNoStyle from '../../eslint-plugin-aiflow/rules/wc-light-no-style.js';
import wcShadowUseToken from '../../eslint-plugin-aiflow/rules/wc-shadow-use-token.js';
import wcPartNaming from '../../eslint-plugin-aiflow/rules/wc-part-naming.js';
import wcEventNaming from '../../eslint-plugin-aiflow/rules/wc-event-naming.js';
import wcAriaRequired from '../../eslint-plugin-aiflow/rules/wc-aria-required.js';
import wcCleanup from '../../eslint-plugin-aiflow/rules/wc-cleanup.js';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const LIGHT_COMP = `export class AfFoo extends HTMLElement { static useShadow = false; }`;
const SHADOW_COMP = `export class AfFoo extends HTMLElement { static useShadow = true; }`;

describe('L3-1 aiflow/wc-light-no-style', () => {
  it('Light 组件 .style.xxx 赋值报错', () => {
    ruleTester.run('wc-light-no-style', wcLightNoStyle, {
      valid: [],
      invalid: [{
        filename: 'src/components/af-foo.js',
        code: `${LIGHT_COMP} mounted() { this.style.color = 'red'; }`,
        errors: [{ messageId: 'styleProp' }],
      }],
    });
  });
  it('Light 组件 <style> 标签报错', () => {
    ruleTester.run('wc-light-no-style', wcLightNoStyle, {
      valid: [],
      invalid: [{
        filename: 'src/components/af-foo.js',
        code: `${LIGHT_COMP} mounted() { this.innerHTML = '<style>.x{color:red}</style>'; }`,
        errors: [{ messageId: 'styleTag' }],
      }],
    });
  });
  it('Light 组件无样式放行', () => {
    ruleTester.run('wc-light-no-style', wcLightNoStyle, {
      valid: [{
        filename: 'src/components/af-foo.js',
        code: `${LIGHT_COMP} mounted() { this.innerHTML = '<div class="card">x</div>'; }`,
      }],
      invalid: [],
    });
  });
  it('Light 组件 setProperty 视觉属性报错（补洞：原规则漏检 setProperty）', () => {
    ruleTester.run('wc-light-no-style', wcLightNoStyle, {
      valid: [],
      invalid: [{
        filename: 'src/components/af-foo.js',
        code: `${LIGHT_COMP} mounted() { this.style.setProperty('color', 'red'); }`,
        errors: [{ messageId: 'styleProp' }],
      }],
    });
  });
  it('Light 组件 setProperty CSS 自定义属性（--*）放行（主题变量传递）', () => {
    ruleTester.run('wc-light-no-style', wcLightNoStyle, {
      valid: [{
        filename: 'src/components/af-foo.js',
        code: `${LIGHT_COMP} mounted() { this.style.setProperty('--af-h', '400px'); }`,
      }],
      invalid: [],
    });
  });
  it('Light 组件 innerHTML 含 style="..." 视觉属性报错（补洞：原规则漏检 style 属性）', () => {
    ruleTester.run('wc-light-no-style', wcLightNoStyle, {
      valid: [],
      invalid: [{
        filename: 'src/components/af-foo.js',
        code: `${LIGHT_COMP} mounted() { this.innerHTML = '<div style="width:80%"></div>'; }`,
        errors: [{ messageId: 'styleAttr' }],
      }],
    });
  });
  it('Light 组件模板字符串含 style="..." 报错', () => {
    ruleTester.run('wc-light-no-style', wcLightNoStyle, {
      valid: [],
      invalid: [{
        filename: 'src/components/af-foo.js',
        code: `${LIGHT_COMP} mounted() { const html = \`<div class="skeleton" style="width:80%"></div>\`; this.innerHTML = html; }`,
        errors: [{ messageId: 'styleAttr' }],
      }],
    });
  });
  it('Light 组件 innerHTML 含 style="--css-var:val" 放行（CSS 自定义属性传递）', () => {
    ruleTester.run('wc-light-no-style', wcLightNoStyle, {
      valid: [{
        filename: 'src/components/af-foo.js',
        code: `${LIGHT_COMP} mounted() { this.innerHTML = '<div style="--af-h:400px"></div>'; }`,
      }],
      invalid: [],
    });
  });
  it('Light 组件 innerHTML 无 style 属性放行', () => {
    ruleTester.run('wc-light-no-style', wcLightNoStyle, {
      valid: [{
        filename: 'src/components/af-foo.js',
        code: `${LIGHT_COMP} mounted() { this.innerHTML = '<div class="card skeleton-w-80">x</div>'; }`,
      }],
      invalid: [],
    });
  });
});

describe('L3-2 aiflow/wc-shadow-use-token', () => {
  it('Shadow CSS 硬编码颜色报错', () => {
    ruleTester.run('wc-shadow-use-token', wcShadowUseToken, {
      valid: [],
      invalid: [{
        filename: 'src/components/af-foo.js',
        code: `${SHADOW_COMP} const CSS = \`.x { color: #fff; }\`;`,
        errors: [{ messageId: 'hardcoded' }],
      }],
    });
  });
  it('Shadow CSS 使用 var(--*) 放行', () => {
    ruleTester.run('wc-shadow-use-token', wcShadowUseToken, {
      valid: [{
        filename: 'src/components/af-foo.js',
        code: `${SHADOW_COMP} const CSS = \`.x { color: var(--c-text); }\`;`,
      }],
      invalid: [],
    });
  });
  it('backdrop 例外放行', () => {
    ruleTester.run('wc-shadow-use-token', wcShadowUseToken, {
      valid: [{
        filename: 'src/components/af-foo.js',
        code: `${SHADOW_COMP} const CSS = \`dialog::backdrop { background: rgba(0,0,0,.5); }\`;`,
      }],
      invalid: [],
    });
  });
});

describe('L3-3 aiflow/wc-part-naming', () => {
  it('非 kebab-case part 名报 warn', () => {
    ruleTester.run('wc-part-naming', wcPartNaming, {
      valid: [],
      invalid: [{
        filename: 'src/components/af-foo.js',
        code: `${SHADOW_COMP} const html = \`<div part="DialogContent">x</div>\`;`,
        errors: [{ messageId: 'naming', data: { name: 'DialogContent' } }],
      }],
    });
  });
  it('kebab-case part 名放行', () => {
    ruleTester.run('wc-part-naming', wcPartNaming, {
      valid: [{
        filename: 'src/components/af-foo.js',
        code: `${SHADOW_COMP} const html = \`<div part="dialog-content">x</div>\`;`,
      }],
      invalid: [],
    });
  });
});

describe('L3-4 aiflow/wc-event-naming', () => {
  it('合法事件名放行', () => {
    ruleTester.run('wc-event-naming', wcEventNaming, {
      valid: [{ code: `this.emit('af-list:loadmore', {});` }],
      invalid: [],
    });
  });
  it('非法事件名报错 + 自动修', () => {
    ruleTester.run('wc-event-naming', wcEventNaming, {
      valid: [],
      invalid: [{
        code: `this.emit('afList_LoadMore', {});`,
        errors: [{ messageId: 'naming' }],
        output: `this.emit('af-list:loadmore', {});`,
      }],
    });
  });
  it('无冒号事件名报错 + 自动修', () => {
    ruleTester.run('wc-event-naming', wcEventNaming, {
      valid: [],
      invalid: [{
        code: `this.emit('aflistloadmore', {});`,
        errors: [{ messageId: 'naming' }],
        output: `this.emit('af-component:aflistloadmore', {});`,
      }],
    });
  });
});

describe('L3-5 aiflow/wc-aria-required', () => {
  it('af-tabs 缺 role=tablist 报错', () => {
    ruleTester.run('wc-aria-required', wcAriaRequired, {
      valid: [],
      invalid: [{
        filename: 'src/components/af-tabs.js',
        code: `export class AfTabs { mounted() { this.innerHTML = '<div></div>'; } }`,
        errors: [{ messageId: 'missingRole' }],
      }],
    });
  });
  it('af-tabs 有 role=tablist 放行', () => {
    ruleTester.run('wc-aria-required', wcAriaRequired, {
      valid: [{
        filename: 'src/components/af-tabs.js',
        code: `export class AfTabs { mounted() { this.innerHTML = '<div role="tablist"></div>'; } }`,
      }],
      invalid: [],
    });
  });
  it('af-toast 缺 aria-live 报错', () => {
    ruleTester.run('wc-aria-required', wcAriaRequired, {
      valid: [],
      invalid: [{
        filename: 'src/components/af-toast.js',
        code: `export class AfToast { show() { this.innerHTML = '<div role="status">x</div>'; } }`,
        errors: [{ messageId: 'missingAriaLive' }],
      }],
    });
  });
  it('af-toast 有 aria-live 放行', () => {
    ruleTester.run('wc-aria-required', wcAriaRequired, {
      valid: [{
        filename: 'src/components/af-toast.js',
        code: `export class AfToast { show() { this.innerHTML = '<div role="status" aria-live="polite">x</div>'; } }`,
      }],
      invalid: [],
    });
  });
  it('af-switch 缺 aria-checked 报错', () => {
    ruleTester.run('wc-aria-required', wcAriaRequired, {
      valid: [],
      invalid: [{
        filename: 'src/components/af-switch.js',
        code: `export class AfSwitch { mounted() { this.innerHTML = '<button role="switch">x</button>'; } }`,
        errors: [{ messageId: 'missingAriaChecked' }],
      }],
    });
  });
  it('af-switch 有 aria-checked 放行', () => {
    ruleTester.run('wc-aria-required', wcAriaRequired, {
      valid: [{
        filename: 'src/components/af-switch.js',
        code: `export class AfSwitch { mounted() { this.innerHTML = '<button role="switch" aria-checked="false">x</button>'; } }`,
      }],
      invalid: [],
    });
  });
});

describe('L3-6 aiflow/wc-cleanup', () => {
  it('addEventListener 无 removeEventListener 报 warn', () => {
    ruleTester.run('wc-cleanup', wcCleanup, {
      valid: [],
      invalid: [{
        filename: 'src/components/af-foo.js',
        code: `export class AfFoo { mounted() { window.addEventListener('scroll', fn); } }`,
        errors: [{ messageId: 'leak' }],
      }],
    });
  });
  it('addEventListener + removeEventListener 放行', () => {
    ruleTester.run('wc-cleanup', wcCleanup, {
      valid: [{
        filename: 'src/components/af-foo.js',
        code: `export class AfFoo { mounted() { window.addEventListener('scroll', fn); } unmounted() { window.removeEventListener('scroll', fn); } }`,
      }],
      invalid: [],
    });
  });
  it('setTimeout 无 clearTimeout 报 warn', () => {
    ruleTester.run('wc-cleanup', wcCleanup, {
      valid: [],
      invalid: [{
        filename: 'src/components/af-foo.js',
        code: `export class AfFoo { mounted() { setTimeout(fn, 1000); } }`,
        errors: [{ messageId: 'leak' }],
      }],
    });
  });
  it('setTimeout + clearTimeout 放行', () => {
    ruleTester.run('wc-cleanup', wcCleanup, {
      valid: [{
        filename: 'src/components/af-foo.js',
        code: `export class AfFoo { mounted() { this._t = setTimeout(fn, 1000); } unmounted() { clearTimeout(this._t); } }`,
      }],
      invalid: [],
    });
  });
});
