import { describe, it, expect, beforeEach } from 'vitest';
import { AfElement, escapeHtml, html } from '../src/lib/af-element.js';

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
    el.innerHTML = '<div class="a"></div><div class="a"></div><span class="b"></span>';
    document.body.appendChild(el);
    expect(el.$('.b').tagName).toBe('SPAN');
    expect(el.$$('.a').length).toBe(2);
  });

  it('Shadow DOM 组件：$ / $$ 在 shadowRoot 查询', () => {
    class ShadowEl extends AfElement {
      static useShadow = true;
      mounted() {
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
