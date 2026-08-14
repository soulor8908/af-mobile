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
  let r = '';
  for (let i = 0; i < strings.length; i++) {
    r += strings[i];
    if (i < values.length) r += values[i]?.raw ?? escapeHtml(values[i]);
  }
  return r;
}

export class AfElement extends HTMLElement {
  constructor() {
    super();
    // 不在构造阶段 attachShadow：DSD `<template shadowrootmode>` 在解析阶段挂载 shadow root，
    // 若构造函数已 attachShadow（shadow root 已存在），声明式模板会被浏览器忽略。
    // shadow root 由 _ensureShadow() 在 connectedCallback 前兜底创建。
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

  // 确保 shadow root 存在：DSD 在解析阶段已挂载（浏览器自动），非 DSD 场景由本方法兜底创建
  _ensureShadow() {
    if (this.constructor.useShadow && !this.shadowRoot) this.attachShadow({ mode: 'open' });
  }

  // 检测是否由 DSD 预填充：shadow root 存在且已有子元素（非 DSD 创建的 shadow root 为空）
  _dsdPrepopulated() {
    return this.constructor.useShadow && this.shadowRoot && this.shadowRoot.children.length > 0;
  }

  connectedCallback() {
    // 断开再连（SPA 条件渲染 / appendChild 重父化）需重新挂载：unmounted 已清理监听，
    // 若不重跑 mounted，组件会变「死」的（DOM 在但无交互）。复位 _mounted 让 mount 重新执行。
    if (this._mounted) return;
    this._mounted = true;
    this._ensureShadow();
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
    if (this._scrollLockCount === 0) {
      this._savedBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    this._scrollLockCount++;
  }

  static unlockScroll() {
    if (this._scrollLockCount <= 0) return;
    this._scrollLockCount--;
    if (this._scrollLockCount === 0 && typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = this._savedBodyOverflow;
    }
  }

  // 样式注入模式：'inline'（默认，Shadow DOM 封装，零请求）| 'external'（CSP 合规，<link> 引用）
  static cssMode = 'inline';

  // 外部样式表 URL（仅 cssMode='external' 时生效）
  static cssBaseUrl = 'dist/components.css';

  // 组件样式标签生成器：返回 <style>（inline）或 <link>（external）HTML 字符串
  // css：CSS 文本（inline 模式嵌入）；id：组件标识（external 模式用于 data-css-id）
  static cssTag(css, id) {
    if (this.cssMode === 'external') {
      return `<link rel="stylesheet" href="${this.cssBaseUrl}" data-css-id="${id}">`;
    }
    return `<style>${css}</style>`;
  }

  // 生成 DSD 声明式模板：SSR/SSG 阶段把返回串置于组件标签内，浏览器解析时自动挂载 shadow root
  // 用法：`<af-dialog title="Hi">${el.dsdTemplate()}</af-dialog>`；无 JS 时结构/样式即刻可见
  dsdTemplate() {
    if (!this.constructor.useShadow || typeof this.shadowHTML !== 'function') return '';
    return `<template shadowrootmode="open">${this.shadowHTML()}</template>`;
  }

  // 属性（attribute）与特性（property）双向同步
  // type: String / Number / Boolean / Array / Object
  // 必须在 customElements.define 之前调用（在类定义后、模块顶层调）
  // attribute 变化时自动同步到 property（写 private 字段，不走 setter），子类 onAttributeChange 只需处理副作用（重渲染等）
  static defineProp(proto, name, { attr, type = String, default: defVal = null } = {}) {
    const privateName = Symbol(name);
    const attrName = attr || name;
    const ctor = proto.constructor;
    // 子类定义属性时继承父类已声明的 observedAttributes/_propMeta（复制避免影子覆盖，
    // 否则父类属性在子类实例上不再触发 attributeChangedCallback）
    if (!ctor.hasOwnProperty('observedAttributes')) ctor.observedAttributes = ctor.observedAttributes ? [...ctor.observedAttributes] : [];
    if (!ctor.observedAttributes.includes(attrName)) {
      ctor.observedAttributes.push(attrName);
    }
    if (!ctor.hasOwnProperty('_propMeta')) ctor._propMeta = ctor._propMeta ? { ...ctor._propMeta } : {};
    ctor._propMeta[attrName] = { symbol: privateName, parse: null };

    const parse = (val) => {
      if (val == null) return defVal;
      if (type === Number) return val === '' ? defVal : Number(val);
      if (type === Boolean) return String(val).toLowerCase() !== 'false';
      if (type === Array || type === Object) { try { return JSON.parse(val || (type === Array ? '[]' : '{}')); } catch { return defVal; } }
      return val;
    };
    ctor._propMeta[attrName].parse = parse;

    Object.defineProperty(proto, name, {
      get() { return this[privateName] ?? defVal; },
      set(val) {
        this[privateName] = val;
        this.skipAttrSync = true;
        if (val == null || val === false) this.removeAttribute(attrName);
        else if (val === true) this.setAttribute(attrName, '');
        else this.setAttribute(attrName, type === Array || type === Object ? JSON.stringify(val) : String(val));
        this.skipAttrSync = false;
      }
    });
  }
}
