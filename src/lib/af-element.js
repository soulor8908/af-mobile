// af-mobile UI —— L3 基类 AfElement
// 5 生命周期钩子 + 主题订阅 + defineProp 双向同步 + emit
// 子类声明 static useShadow = true/false 决定是否 attachShadow
// v3.0：移除 i18n（_applyI18n/onLocaleChange/import t 迁至 withI18n mixin），基类无 i18n 依赖

// HTML 转义工具已拆分至 ./html.js（与 router/state 等 lib 共享模块同模式），再导出保持 API 兼容
export { escapeHtml, html } from './html.js';

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
    // 每次挂载新建 AbortController：断开时 abort 一次性解绑本轮 _listen 全部监听
    // （_ac 在 disconnectedCallback 已 abort 并置空，此处无需再 abort；listener 由各 target 自行
    // 持有，脱离文档的节点不再被本组件强引用，天然无泄漏）
    this._ac = new AbortController();
    if (this.onThemeChange) {
      this._listen(document.documentElement, 'themechange', (e) => this.onThemeChange(e.detail));
    }
    if (this.constructor._perf.size) this._perfStart = performance.now();
    this.mounted?.();
    this._afterRender('render');
  }

  disconnectedCallback() {
    this.unmounted?.();
    // 一次性解绑本轮 _listen 全部监听：重连时由 connectedCallback 新建 controller、mounted 重绑
    this._ac?.abort();
    this._ac = null;
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
    if (this.constructor._perf.size) this._perfStart = performance.now();
    this.onAttributeChange?.(name, oldVal, newVal);
    this._afterRender('update', name);
  }

  emit(name, detail = {}) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  // 事件绑定：统一挂到本轮挂载的 AbortController signal 上，断开时由 disconnectedCallback
  // 一次 abort 全解绑，组件重连由 mounted 重新绑定；子类不再需要在 unmounted() 手写
  // removeEventListener。同一 (target,type,handler) 重复绑定由 DOM 原生去重，无叠加风险。
  // target 为空时安全跳过；返回定向解绑函数（供「运行中更换绑定目标」场景使用，如 af-backtop）
  _listen(target, type, handler, opts) {
    if (!target) return () => {};   // 空目标：返回空解绑函数，调用点无需判空
    // _ac 可能尚未建立：attributeChangedCallback 会先于 connectedCallback 触发（setAttribute 后置入文档），
    // 此时 signal 为 undefined → 该监听不纳入统一解绑（首次挂载后 mounted 会重新绑定）
    target.addEventListener(type, handler, { ...opts, signal: this._ac?.signal });
    return () => target.removeEventListener(type, handler, opts);
  }

  // === Shadow 挂载（adoptedStyleSheets 样式表共享） ===
  // 每个组件类一份已解析 CSSStyleSheet（hasOwn 判断，子类不继承父类的样式表），
  // 消除「每实例 innerHTML 内联 <style> 重复解析同一份 CSS」的开销
  // （实测 6KB CSS × 300 实例：创建 16.3ms → 2.9ms，5.6x）

  // Shadow 挂载统一入口（mounted 首行调用，替代 `shadowRoot.innerHTML ||= shadowHTML()`）：
  // - DSD 已由解析器预填充（含内联 <style>）：直接 hydrate，不动 DOM（移除会让 SSR 首帧闪烁）
  // - JS 挂载路径：渲染后把 <style data-css-id> 迁移到共享 adoptedStyleSheets 并移除原节点
  // - cssMode='external' 时 cssTag 产出 <link>，无 <style> 可迁移，自然回落原行为
  _mountShadow() {
    const sr = this.shadowRoot;
    if (sr.children.length) return;
    sr.innerHTML = this.shadowHTML();
    const st = sr.querySelector('style');   // external 模式产出 <link>，此处为 null → 自然回落
    // constructable stylesheet 不可用（jsdom / 老浏览器）时保留内联 <style>，行为回落旧版
    const CSS = globalThis.CSSStyleSheet;
    if (!st || !CSS?.prototype.replaceSync) return;
    const C = this.constructor;
    if (!Object.hasOwn(C, '_sheet')) {
      C._sheet = new CSS();
      C._sheet.replaceSync(st.textContent);
    }
    sr.adoptedStyleSheets = [C._sheet];
    st.remove();
  }

  // === 渲染监控（P2：onRender/onUpdate 钩子 + DevTools 集成） ===
  // 实例钩子 onRender/onUpdate 在子类实现时触发；全局订阅者通过 AfElement.onPerf(cb) 注册。
  // 默认零开销：未注册订阅者时，渲染路径仅增加可选链检查（未实现即空）。
  static _perf = new Set();

  /** 注册全局渲染事件订阅（DevTools/性能分析），返回取消函数 */
  static onPerf(cb) {
    this._perf.add(cb);
    return () => this._perf.delete(cb);
  }

  _afterRender(t, a) {
    this.onRender?.();
    if (t === 'update') this.onUpdate?.(a);
    const C = this.constructor;
    if (!C._perf.size) return;
    const now = performance.now();
    const ev = { type: t, tagName: this.localName, attr: a, duration: now - (this._perfStart ?? now) };
    this._perfStart = null;
    for (const cb of C._perf) cb(ev);
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

  // === 模态辅助（dialog/action-sheet/picker 共用）：实例级滚动锁 + 焦点保存/还原/陷阱 ===
  // 实例级滚动锁包装：重复调用安全，unmounted 兜底调用不会多扣引用计数
  _lockScroll() {
    if (!this._scrollLocked) { AfElement.lockScroll(); this._scrollLocked = true; }
  }

  _unlockScroll() {
    if (this._scrollLocked) { AfElement.unlockScroll(); this._scrollLocked = false; }
  }

  // 焦点管理：open() 保存触发元素，close()/light dismiss 后还原
  saveFocus() {
    this._previouslyFocused = document.activeElement;
  }

  restoreFocus() {
    this._previouslyFocused?.focus();
    this._previouslyFocused = null;
  }

  // 可聚焦元素收集：root 默认 $root；Shadow DOM 组件额外覆盖 slotted（Light DOM）内容，避免页脚按钮焦点盲区
  _getFocusable(root = this.$root) {
    const sel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const els = [...root.querySelectorAll(sel)];
    if (this.constructor.useShadow) els.push(...this.querySelectorAll(sel));
    // checkVisibility（Baseline 2024）：零强制布局且额外覆盖 visibility/content-visibility；
    // jsdom / 老浏览器回落 offsetParent 探测（行为兼容）
    // 回退链路保留 offsetParent 判据：jsdom 无布局（getClientRects 恒空），测试与 SSR 场景靠它放行
    return els.filter(el => !el.disabled && (el.checkVisibility?.({ checkVisibilityCSS: true })
      ?? (el.offsetParent !== null || el.getClientRects().length > 0)));
  }

  _focusFirst(root = this.$root) {
    const focusable = this._getFocusable(root);
    if (focusable.length) focusable[0].focus();
    else { root.tabIndex = -1; root.focus(); }
  }

  // Tab 焦点陷阱（部分浏览器原生 showModal/popover 焦点陷阱行为不一致的补强）
  _trapTab(e, root = this.$root) {
    if (e.key !== 'Tab') return;
    const focusable = this._getFocusable(root);
    if (focusable.length < 2) { e.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
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
  // 紧凑形式：defineProp(proto, 'confirmText', '确定') —— type 从 default 值推断（null 视为 String），
  // attr 自动取 name 的 kebab-case（confirmText → confirm-text）；attr 别名或 Number/null 等推断不了的场景传对象形式
  static defineProp(proto, name, opts = {}) {
    const spec = opts && typeof opts === 'object' && !Array.isArray(opts) ? opts : { default: opts };
    const defVal = 'default' in spec ? spec.default : null;
    const type = spec.type || (Array.isArray(defVal) ? Array
      : typeof defVal === 'number' ? Number
      : typeof defVal === 'boolean' ? Boolean
      : defVal && typeof defVal === 'object' ? Object : String);
    const attrName = spec.attr || name.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
    const privateName = Symbol(name);
    const ctor = proto.constructor;
    // 子类定义属性时继承父类已声明的 observedAttributes/_propMeta（复制避免影子覆盖，
    // 否则父类属性在子类实例上不再触发 attributeChangedCallback）
    if (!Object.hasOwn(ctor, 'observedAttributes')) ctor.observedAttributes = ctor.observedAttributes ? [...ctor.observedAttributes] : [];
    if (!ctor.observedAttributes.includes(attrName)) {
      ctor.observedAttributes.push(attrName);
    }
    if (!Object.hasOwn(ctor, '_propMeta')) ctor._propMeta = ctor._propMeta ? { ...ctor._propMeta } : {};
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
