import { describe, it, expect, beforeEach } from 'vitest';
import { AfElement } from '../src/lib/af-element.js';

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

  it('mounted 仅在首次 connectedCallback 时调用', () => {
    const el = new TestEl();
    document.body.appendChild(el);
    expect(el.mountedCalls).toBe(1);
    document.body.removeChild(el);
    document.body.appendChild(el);
    expect(el.mountedCalls).toBe(1);
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
