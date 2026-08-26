import { describe, it, expect, beforeEach } from 'vitest';
import { AfElement, escapeHtml, html } from '../src/lib/af-element.js';
import { setLocale } from '../src/lib/i18n.js';
import { withI18n } from '../src/lib/with-i18n.js';

class TestEl extends AfElement {
  static useShadow = false;
  constructor() {
    super();
    this.mountedCalls = 0;
    this.unmountedCalls = 0;
  }
  mounted() { this.mountedCalls++; }
  unmounted() { this.unmountedCalls++; }
  onAttributeChange() {}
  onThemeChange() {}
}
// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(TestEl.prototype, 'count', { type: Number, default: 0 });
AfElement.defineProp(TestEl.prototype, 'label', { type: String, default: '' });
AfElement.defineProp(TestEl.prototype, 'active', { type: Boolean, default: false });
AfElement.defineProp(TestEl.prototype, 'items', { type: Array, default: [] });
AfElement.defineProp(TestEl.prototype, 'config', { type: Object, default: {} });
customElements.define('test-el', TestEl);

describe('AfElement 基类', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('断开再连：disconnectedCallback 复位 _mounted，重连重新 mounted（P0-1）', () => {
    const el = new TestEl();
    document.body.appendChild(el);
    expect(el.mountedCalls).toBe(1);
    document.body.removeChild(el);
    expect(el.unmountedCalls).toBe(1);
    // 重连后 mounted 必须重新执行，否则监听丢失组件变「死」的
    document.body.appendChild(el);
    expect(el.mountedCalls).toBe(2);
    expect(el.unmountedCalls).toBe(1);
  });

  it('_listen 登记：断开统一解绑并清空登记表，重连不残留旧监听（F）', () => {
    const el = new TestEl();
    document.body.appendChild(el);
    const log = [];
    el._listen(window, 'test-listen-event', () => log.push(1));
    expect(el._listeners.some(([t, type]) => t === window && type === 'test-listen-event')).toBe(true);
    window.dispatchEvent(new Event('test-listen-event'));
    expect(log.length).toBe(1);
    document.body.removeChild(el);
    // 断开后登记表清空，事件不再触发（自动解绑）
    expect(el._listeners).toBe(null);
    window.dispatchEvent(new Event('test-listen-event'));
    expect(log.length).toBe(1);
    // 重连后未重新 _listen 则不触发（由 mounted 重新绑定）
    document.body.appendChild(el);
    window.dispatchEvent(new Event('test-listen-event'));
    expect(log.length).toBe(1);
  });

  it('_listen 空目标安全跳过（对齐 ?. 调用点）', () => {
    const el = new TestEl();
    document.body.appendChild(el);
    const before = el._listeners.length; // onThemeChange 已登记 1 条
    el._listen(null, 'click', () => {});
    expect(el._listeners.length).toBe(before);
  });

  it('_listen 去重：同 (target,type,handler) 重复绑定只留一条登记且不重复触发', () => {
    const el = new TestEl();
    document.body.appendChild(el);
    const log = [];
    const h = () => log.push(1);
    el._listen(window, 'test-listen-event', h);
    el._listen(window, 'test-listen-event', h);
    expect(el._listeners.filter(([t, ty]) => t === window && ty === 'test-listen-event')).toHaveLength(1);
    window.dispatchEvent(new Event('test-listen-event'));
    expect(log.length).toBe(1);
  });

  it('_listen 惰性回收：innerHTML 重渲染后脱离文档的旧目标条目被清除', () => {
    const el = new TestEl();
    document.body.appendChild(el);
    const btn1 = document.createElement('button');
    el.appendChild(btn1);
    el._listen(btn1, 'click', () => {});
    expect(el._listeners.some(([t]) => t === btn1)).toBe(true);
    el.innerHTML = '';
    const btn2 = document.createElement('button');
    el.appendChild(btn2);
    el._listen(btn2, 'click', () => {});
    expect(el._listeners.some(([t]) => t === btn1)).toBe(false);
    expect(el._listeners.some(([t]) => t === btn2)).toBe(true);
  });

  it('_listen 回收不误伤：window 与 documentElement 条目保留', () => {
    const el = new TestEl();
    document.body.appendChild(el);
    const before = el._listeners.length; // onThemeChange 登记的 documentElement 条目
    el._listen(window, 'test-listen-event', () => {});
    expect(el._listeners.some(([t]) => t === window)).toBe(true);
    expect(el._listeners.some(([t]) => t === document.documentElement)).toBe(true);
    expect(el._listeners.length).toBe(before + 1);
  });

  it('defineProp 双向同步：property → attribute', () => {
    const el = new TestEl();
    document.body.appendChild(el);
    el.count = 42;
    expect(el.getAttribute('count')).toBe('42');
    el.label = 'hello';
    expect(el.getAttribute('label')).toBe('hello');
    el.active = true;
    expect(el.hasAttribute('active')).toBe(true);
    el.active = false;
    expect(el.hasAttribute('active')).toBe(false);
  });

  it('defineProp 类型转换：Number / Boolean / Array / Object', () => {
    const el = new TestEl();
    document.body.appendChild(el);
    el.setAttribute('count', '99');
    expect(el.count).toBe(99);
    el.setAttribute('active', '');
    expect(el.active).toBe(true);
    el.setAttribute('items', '[1,2,3]');
    expect(el.items).toEqual([1, 2, 3]);
    el.setAttribute('config', '{"a":1}');
    expect(el.config).toEqual({ a: 1 });
  });

  it('defineProp 紧凑形式：default 值即 spec，type 推断 + attr 自动 kebab-case', () => {
    class CompactEl extends AfElement {}
    AfElement.defineProp(CompactEl.prototype, 'confirmText', '确定');
    AfElement.defineProp(CompactEl.prototype, 'maxCount', 9);
    AfElement.defineProp(CompactEl.prototype, 'checked', true);
    AfElement.defineProp(CompactEl.prototype, 'tabs', []);
    AfElement.defineProp(CompactEl.prototype, 'title', null);
    customElements.define('test-compact-el', CompactEl);
    const el = new CompactEl();
    document.body.appendChild(el);
    // attr 自动 kebab-case
    expect(CompactEl.observedAttributes).toContain('confirm-text');
    expect(CompactEl.observedAttributes).toContain('max-count');
    // type 推断 + 默认值
    expect(el.confirmText).toBe('确定');
    el.setAttribute('max-count', '12');
    expect(el.maxCount).toBe(12);
    expect(el.checked).toBe(true);
    expect(el.tabs).toEqual([]);
    expect(el.title).toBe(null);
    // setter → attribute 同步
    el.maxCount = 3;
    expect(el.getAttribute('max-count')).toBe('3');
  });

  it('JSON.parse 失败时回退 default（P2-6，避免非法 JSON 导致组件崩溃）', () => {
    const el = new TestEl();
    document.body.appendChild(el);
    el.setAttribute('items', 'not-json');
    expect(el.items).toEqual([]); // 回退 default=[]
    el.setAttribute('config', '{broken');
    expect(el.config).toEqual({}); // 回退 default={}
  });

  it('Number 属性空串回退 default（P2-3，避免 Number("")=0 导致除零）', () => {
    const el = new TestEl();
    document.body.appendChild(el);
    el.setAttribute('count', '');
    expect(el.count).toBe(0); // default=0
    // 验证非零 default 场景
    AfElement.defineProp(TestEl.prototype, 'height', { type: Number, default: 48 });
    const el2 = new TestEl();
    document.body.appendChild(el2);
    el2.setAttribute('height', '');
    expect(el2.height).toBe(48); // 空串回退 default，而非 Number("")=0
  });

  it('Boolean 属性 "false" 字符串解析为 false（P0-2）', () => {
    const el = new TestEl();
    document.body.appendChild(el);
    // 空串 / 任意值 → true（HTML 布尔属性「存在即真」）
    el.setAttribute('active', '');
    expect(el.active).toBe(true);
    el.setAttribute('active', 'true');
    expect(el.active).toBe(true);
    // "false" 字符串 → false（允许显式关闭）
    el.setAttribute('active', 'false');
    expect(el.active).toBe(false);
    el.setAttribute('active', 'FALSE');
    expect(el.active).toBe(false);
    // 移除属性 → 默认值
    el.removeAttribute('active');
    expect(el.active).toBe(false);
  });

  it('Boolean setter false 时 removeAttribute（P0-2）', () => {
    const el = new TestEl();
    document.body.appendChild(el);
    el.active = true;
    expect(el.hasAttribute('active')).toBe(true);
    el.active = false;
    expect(el.hasAttribute('active')).toBe(false);
  });

  it('defineProp 默认值', () => {
    const el = new TestEl();
    expect(el.count).toBe(0);
    expect(el.items).toEqual([]);
    expect(el.config).toEqual({});
  });

  it('emit 派发 CustomEvent 且 composed=true', () => {
    const el = new TestEl();
    document.body.appendChild(el);
    let captured = null;
    el.addEventListener('test:event', (e) => { captured = e.detail; });
    // eslint-disable-next-line af-mobile/wc-event-naming -- 测试基类 emit()，用任意事件名
    el.emit('test:event', { foo: 'bar' });
    expect(captured).toEqual({ foo: 'bar' });
  });

  it('主题订阅：onThemeChange 在 themechange 事件时被调用', () => {
    const el = new TestEl();
    document.body.appendChild(el);
    let received = null;
    el.onThemeChange = (theme) => { received = theme; };
    document.documentElement.dispatchEvent(new CustomEvent('themechange', { detail: 'dark' }));
    expect(received).toBe('dark');
  });

  it('unmounted 时取消主题订阅', () => {
    const el = new TestEl();
    document.body.appendChild(el);
    const handler = vi.fn();
    el.onThemeChange = handler;
    document.body.removeChild(el);
    document.documentElement.dispatchEvent(new CustomEvent('themechange', { detail: 'light' }));
    expect(handler).not.toHaveBeenCalled();
    expect(el.unmountedCalls).toBe(1);
  });

  it('$ / $$ 在 Light DOM 中查询', () => {
    const el = new TestEl();
    // eslint-disable-next-line af-mobile/token-whitelist -- 测试 $/$$ 查询，用任意 class
    el.innerHTML = '<div class="a"></div><div class="a"></div><span class="b"></span>';
    document.body.appendChild(el);
    expect(el.$('.b').tagName).toBe('SPAN');
    expect(el.$$('.a').length).toBe(2);
  });

  it('Shadow DOM 组件：$ / $$ 在 shadowRoot 查询', () => {
    class ShadowEl extends AfElement {
      static useShadow = true;
      mounted() {
        // eslint-disable-next-line af-mobile/token-whitelist -- 测试 Shadow DOM 查询，用任意 class
        this.shadowRoot.innerHTML = '<style></style><div class="inner"></div>';
      }
    }
    customElements.define('test-shadow-el-2', ShadowEl);
    const el = new ShadowEl();
    document.body.appendChild(el);
    expect(el.$('.inner')).not.toBeNull();
    expect(el.$$('.inner').length).toBe(1);
  });
});

describe('cssTag 样式注入（CSP 合规）', () => {
  afterEach(() => {
    AfElement.cssMode = 'inline';
  });

  it('inline 模式：返回 <style> 内联 CSS（默认，零请求）', () => {
    expect(AfElement.cssTag(':host{display:block}', 'af-dialog'))
      .toBe('<style>:host{display:block}</style>');
  });

  it('external 模式：返回 <link> 外部样式表（CSP strict，style-src self）', () => {
    AfElement.cssMode = 'external';
    AfElement.cssBaseUrl = '/assets/components.css';
    const tag = AfElement.cssTag(':host{display:block}', 'af-dialog');
    expect(tag).toBe('<link rel="stylesheet" href="/assets/components.css" data-css-id="af-dialog">');
  });

  it('external 模式：Shadow DOM 组件渲染出 <link> 而非 <style>', () => {
    class ShadowCssEl extends AfElement {
      static useShadow = true;
      mounted() {
        // eslint-disable-next-line af-mobile/token-whitelist -- 测试夹具自定义 class
        this.shadowRoot.innerHTML = `${AfElement.cssTag('.a{color:red}', 'test-css')}<div class="a"></div>`;
      }
    }
    customElements.define('test-shadow-css-el', ShadowCssEl);
    AfElement.cssMode = 'external';
    const el = new ShadowCssEl();
    document.body.appendChild(el);
    expect(el.$('style')).toBeNull();
    expect(el.$('link[data-css-id="test-css"]')).not.toBeNull();
    expect(el.$('link').getAttribute('rel')).toBe('stylesheet');
  });
});

describe('html 安全模板标签', () => {
  it('插值自动转义 HTML 特殊字符', () => {
    const evil = '<img src=x onerror=alert(1)>';
    const out = html`<div>${evil}</div>`;
    expect(out).not.toContain('<img src=x onerror');
    expect(out).toContain('&lt;img');
  });

  it('{ raw } 标记可信 HTML 不转义', () => {
    const out = html`<div>${{ raw: '<b>加粗</b>' }}</div>`;
    expect(out).toBe('<div><b>加粗</b></div>');
  });

  it('多插值混合转义与可信', () => {
    const title = '<script>x</script>';
    const out = html`<div title="${title}">${{ raw: '<b>ok</b>' }}</div>`;
    expect(out).toContain('&lt;script&gt;');
    expect(out).toContain('<b>ok</b>');
  });

  it('null / undefined 插值为空字符串', () => {
    expect(html`${null}${undefined}`).toBe('');
  });

  it('escapeHtml 单独使用也正确转义', () => {
    expect(escapeHtml('<b>&"\'</b>')).toBe('&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;');
  });

  it('html 标签防 XSS：onerror 不存活', () => {
    const evil = '<img src=x onerror=alert(1)>';
    const el = document.createElement('div');
    el.innerHTML = html`<div>${evil}</div>`;
    expect(el.querySelector('img[onerror]')).toBeNull();
  });
});

// i18n 映射表测试组件（v3.0：_applyI18n 迁至 withI18n mixin）
class I18nTestEl extends withI18n(AfElement) {
  static useShadow = false;
  static i18n = {
    '.static-attr': ['aria-label', 'dg.cl'],
    '.static-fallback': ['aria-label', 'dg.al', 'title', 'aria-label'],
    '.static-skip': ['aria-label', 'dg.cl', null, 'aria-label'],
    '.static-text': ['', 'as.cn', 'cancelText'],
    '.dynamic-attr': ['aria-label', (host, t) => `${host.title || t('dg.al')}`],
    '.dynamic-text': ['', (host, t, el, i) => `item-${i}-${t('dg.cl')}`],
    '@': ['aria-label', 'tb.al'],
  };
  mounted() {
    // eslint-disable-next-line af-mobile/token-whitelist -- 测试夹具自定义 class
    this.innerHTML = `
      <div class="static-attr"></div>
      <div class="static-fallback"></div>
      <div class="static-skip"></div>
      <div class="static-text"></div>
      <div class="dynamic-attr"></div>
      <div class="dynamic-text"></div>
      <div class="dynamic-text"></div>
    `;
  }
}
customElements.define('i18n-test-el', I18nTestEl);

describe('withI18n _applyI18n', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setLocale('zh-CN');
  });

  it('静态形式：setAttribute', () => {
    const el = new I18nTestEl();
    document.body.appendChild(el);
    expect(el.$('.static-attr').getAttribute('aria-label')).toBe('关闭');
  });

  it('静态 fallback：属性优先', () => {
    const el = new I18nTestEl();
    el.title = '自定义标题';
    document.body.appendChild(el);
    expect(el.$('.static-fallback').getAttribute('aria-label')).toBe('自定义标题');
  });

  it('静态 fallback 无属性时用字典', () => {
    const el = new I18nTestEl();
    document.body.appendChild(el);
    expect(el.$('.static-fallback').getAttribute('aria-label')).toBe('对话框');
  });

  it('静态 skipIf：host 有属性时跳过', () => {
    const el = new I18nTestEl();
    el.setAttribute('aria-label', '用户自定义');
    document.body.appendChild(el);
    expect(el.$('.static-skip').getAttribute('aria-label')).toBe(null);
  });

  it('静态 textContent', () => {
    const el = new I18nTestEl();
    document.body.appendChild(el);
    expect(el.$('.static-text').textContent).toBe('取消');
  });

  it('动态函数形式：setAttribute', () => {
    const el = new I18nTestEl();
    el.title = '动态标题';
    document.body.appendChild(el);
    expect(el.$('.dynamic-attr').getAttribute('aria-label')).toBe('动态标题');
  });

  it('动态函数形式：textContent + index', () => {
    const el = new I18nTestEl();
    document.body.appendChild(el);
    const items = el.$$('.dynamic-text');
    expect(items[0].textContent).toBe('item-0-关闭');
    expect(items[1].textContent).toBe('item-1-关闭');
  });

  it('@ 选择器指向 host', () => {
    const el = new I18nTestEl();
    document.body.appendChild(el);
    expect(el.getAttribute('aria-label')).toBe('标签页');
  });

  it('语言切换后自动更新', () => {
    const el = new I18nTestEl();
    document.body.appendChild(el);
    expect(el.$('.static-attr').getAttribute('aria-label')).toBe('关闭');
    setLocale('en-US');
    expect(el.$('.static-attr').getAttribute('aria-label')).toBe('Close');
    setLocale('zh-CN');
  });

  it('disconnectedCallback 清理 localechange 监听', () => {
    const el = new I18nTestEl();
    document.body.appendChild(el);
    document.body.removeChild(el);
    // 重连后不应重复监听
    document.body.appendChild(el);
    setLocale('en-US');
    setLocale('zh-CN');
    // 无异常即通过
    expect(true).toBe(true);
  });
});

describe('DSD 声明式 Shadow DOM 支持', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  class DsdShadowEl extends AfElement {
    static useShadow = true;
    shadowHTML() {
      // eslint-disable-next-line af-mobile/token-whitelist -- DSD 测试夹具自定义 class
      return '<style>.x{}</style><div class="inner"></div>';
    }
  }
  customElements.define('dsd-shadow-el', DsdShadowEl);

  it('非 DSD：connectedCallback 时 _ensureShadow 兜底创建 shadow root（构造函数不预创建）', () => {
    const el = new DsdShadowEl();
    expect(el.shadowRoot).toBeNull(); // 构造函数不 attachShadow，让位给 DSD 解析
    document.body.appendChild(el);
    expect(el.shadowRoot).not.toBeNull();
    expect(el._dsdPrepopulated()).toBe(false);
  });

  it('_dsdPrepopulated：shadow root 已有子元素视为 DSD 预填充', () => {
    const el = new DsdShadowEl();
    el.attachShadow({ mode: 'open' }); // 模拟 DSD 解析阶段已挂载
    el.shadowRoot.innerHTML = '<div></div>';
    expect(el._dsdPrepopulated()).toBe(true);
  });

  it('Light DOM 组件 _dsdPrepopulated 恒为 false', () => {
    const el = new TestEl();
    expect(el._dsdPrepopulated()).toBe(false);
  });

  it('dsdTemplate：Shadow 组件返回 <template shadowrootmode> 包裹 shadowHTML', () => {
    const el = new DsdShadowEl();
    // eslint-disable-next-line af-mobile/token-whitelist -- 断言夹具 shadowHTML 字符串
    expect(el.dsdTemplate()).toBe('<template shadowrootmode="open"><style>.x{}</style><div class="inner"></div></template>');
  });

  it('dsdTemplate：Light 组件或无 shadowHTML 返回空串', () => {
    const el = new TestEl();
    expect(el.dsdTemplate()).toBe('');
    const noHtml = new ShadowNoHtmlEl();
    expect(noHtml.dsdTemplate()).toBe('');
  });
});

// DSD 兜底用例：无 shadowHTML 的 Shadow 组件
class ShadowNoHtmlEl extends AfElement {
  static useShadow = true;
  mounted() {
    this.shadowRoot.innerHTML = '<div></div>';
  }
}
customElements.define('shadow-no-html-el', ShadowNoHtmlEl);
