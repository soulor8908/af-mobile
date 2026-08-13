// AIFlow UI —— L3 基类 AfElement
// 5 生命周期钩子 + 主题订阅 + defineProp 双向同步 + emit
// 子类声明 static useShadow = true/false 决定是否 attachShadow
// v3.0：移除 i18n（_applyI18n/onLocaleChange/import t 迁至 withI18n mixin），基类无 i18n 依赖

// HTML 转义：注入数据到 innerHTML 前必经，防 XSS
// 使用命名实体（&lt; &gt; &amp; &quot;）+ 数值实体（&#39;）匹配浏览器 DOM 行为
const _ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => _ENT[c]);

// 安全 HTML 模板标签：${value} 插值自动转义，${{ raw: '<b>html</b>' }} 标记可信 HTML
// 用法：html`<div class="body">${item.title}</div>` ← title 自动转义
//       html`<div>${{ raw: '<b>加粗</b>' }}</div>` ← 显式声明可信 HTML 不转义
// 强制 af-list.renderItem / af-dropdown._renderList 等动态 HTML 拼接使用，杜绝 XSS
export function html(strings, ...values) {
  let result = '';
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) {
      const v = values[i];
      if (v != null && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, 'raw')) {
        // 显式可信 HTML
        result += v.raw;
      } else {
        result += escapeHtml(v);
      }
    }
  }
  return result;
}

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
    // 断开再连（SPA 条件渲染 / appendChild 重父化）需重新挂载：unmounted 已清理监听，
    // 若不重跑 mounted，组件会变「死」的（DOM 在但无交互）。复位 _mounted 让 mount 重新执行。
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
    // 复位挂载标志：下次 connectedCallback 重新执行 mounted，重建监听与 DOM
    this._mounted = false;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    // skipAttrSync：property setter 主动调 setAttribute 触发，跳过 attribute→property 反向同步（避免循环）
    // 但 onAttributeChange（重渲染等副作用）仍需执行——否则 property 变化不触发重渲染
    if (!this.skipAttrSync) {
      const meta = this.constructor._propMeta?.[name];
      if (meta) this[meta.symbol] = meta.parse(newVal);
    }
    this.onAttributeChange?.(name, oldVal, newVal);
  }

  emit(name, detail = {}) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  // === 背景滚动锁（模态组件 open/close 配对调用，引用计数支持多实例嵌套） ===
  static _scrollLockCount = 0;
  static _savedBodyOverflow = '';

  static lockScroll() {
    if (typeof document === 'undefined' || !document.body) return;
    if (AfElement._scrollLockCount === 0) {
      AfElement._savedBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    AfElement._scrollLockCount++;
  }

  static unlockScroll() {
    if (AfElement._scrollLockCount <= 0) return;
    AfElement._scrollLockCount--;
    if (AfElement._scrollLockCount === 0 && typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = AfElement._savedBodyOverflow;
    }
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
      if (type === Number) return val === '' ? defVal : Number(val);
      // Boolean：HTML 布尔属性「存在即真」，但允许 close-on-esc="false" / loop="false" 显式关闭
      // （"false" 字符串视为 false，其它值含空串视为 true）
      if (type === Boolean) return val != null && String(val).toLowerCase() !== 'false';
      if (type === Array) { try { return JSON.parse(val || '[]'); } catch { return defVal; } }
      if (type === Object) { try { return JSON.parse(val || '{}'); } catch { return defVal; } }
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
