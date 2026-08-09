// AIFlow UI —— L3 基类 AfElement
// 5 生命周期钩子 + 主题订阅 + defineProp 双向同步 + emit
// 子类声明 static useShadow = true/false 决定是否 attachShadow

// HTML 转义：注入数据到 innerHTML 前必经，防 XSS
export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt()};`);

export class AfElement extends HTMLElement {
  constructor() {
    super();
    if (this.constructor.useShadow) this.attachShadow({ mode: 'open' });
  }

  // 统一查询根：Shadow 组件返回 shadowRoot，Light 组件返回 this
  get $root() {
    return this.shadowRoot || this;
  }

  $(selector) {
    return this.$root.querySelector(selector);
  }

  $$(selector) {
    return [...this.$root.querySelectorAll(selector)];
  }

  connectedCallback() {
    if (this._mounted) return;
    this._mounted = true;
    if (this.onThemeChange) {
      this._themeHandler = (e) => this.onThemeChange(e.detail);
      document.documentElement.addEventListener('themechange', this._themeHandler);
    }
    this.mounted?.();
  }

  disconnectedCallback() {
    if (this._themeHandler) {
      document.documentElement.removeEventListener('themechange', this._themeHandler);
      this._themeHandler = null;
    }
    this.unmounted?.();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal || this.skipAttrSync) return;
    // 自动同步：attribute → property（直接写 private 字段，避免触发 setter 循环）
    const meta = this.constructor._propMeta?.[name];
    if (meta) this[meta.symbol] = meta.parse(newVal);
    this.onAttributeChange?.(name, oldVal, newVal);
  }

  emit(name, detail = {}) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  // 属性（attribute）与特性（property）双向同步
  // type: String / Number / Boolean / Array / Object
  // 必须在 customElements.define 之前调用（在类定义后、模块顶层调）
  // attribute 变化时自动同步到 property（写 private 字段，不走 setter），子类 onAttributeChange 只需处理副作用（重渲染等）
  static defineProp(proto, name, { attr, type = String, default: defVal = null } = {}) {
    const privateName = Symbol(name);
    const attrName = attr || name;
    const ctor = proto.constructor;
    // 用 hasOwnProperty 检查，避免继承父类的静态属性
    if (!Object.prototype.hasOwnProperty.call(ctor, 'observedAttributes')) ctor.observedAttributes = [];
    if (!ctor.observedAttributes.includes(attrName)) {
      ctor.observedAttributes.push(attrName);
    }
    if (!Object.prototype.hasOwnProperty.call(ctor, '_propMeta')) ctor._propMeta = {};
    ctor._propMeta[attrName] = { symbol: privateName, parse: null };

    const parse = (val) => {
      if (val == null) return defVal;
      if (type === Number) return Number(val);
      if (type === Boolean) return val != null;
      if (type === Array) return JSON.parse(val || '[]');
      if (type === Object) return JSON.parse(val || '{}');
      return val;
    };
    ctor._propMeta[attrName].parse = parse;

    Object.defineProperty(proto, name, {
      get() { return this[privateName] ?? defVal; },
      set(val) {
        this[privateName] = val;
        this.skipAttrSync = true;
        if (val == null || val === false) {
          this.removeAttribute(attrName);
        } else if (val === true) {
          this.setAttribute(attrName, '');
        } else if (type === Array || type === Object) {
          this.setAttribute(attrName, JSON.stringify(val));
        } else {
          this.setAttribute(attrName, String(val));
        }
        this.skipAttrSync = false;
      }
    });
  }
}
