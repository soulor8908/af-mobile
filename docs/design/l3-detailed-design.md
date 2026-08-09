# AIFlow UI —— L3 真组件详细设计（总体架构）

> 本文档覆盖 L3 真组件的总体架构设计（组件清单、技术选型、生命周期、CSS 隔离、与 L1/L2 协作、事件机制、无障碍、体积控制）。
>
> 每个组件的详细设计（DOM 结构、属性 API、事件 payload、具体算法）见第 9 节索引，后续按需逐个展开。
>
> 范围：L3 Web Components（af-* 自定义元素）。L1 Token / L2 配方原子另见 `l1-l2-detailed-design.md`。

---

## 目录

- [0. 概述与范围](#0-概述与范围)
- [1. 组件清单与优先级](#1-组件清单与优先级)
- [2. 技术选型与基类设计](#2-技术选型与基类设计)
- [3. 生命周期与注册机制](#3-生命周期与注册机制)
- [4. CSS 隔离方案（混合方案）](#4-css-隔离方案混合方案)
- [5. 与 L1 Token / L2 配方的协作](#5-与-l1-token--l2-配方的协作)
- [6. 事件机制与数据流](#6-事件机制与数据流)
- [7. 无障碍（ARIA）与键盘交互](#7-无障碍aria与键盘交互)
- [8. 体积控制与 Tree Shaking 实现](#8-体积控制与-tree-shaking-实现)
- [9. 附录：组件逐个详设索引（占位）](#9-附录组件逐个详设索引占位)
- [设计决策索引](#设计决策索引)

---

## 0. 概述与范围

### 0.1 L3 在分层中的定位

| 层 | 内容 | 形态 | 体积预算 | Tree Shaking |
|---|---|---|---|---|
| L1 | Token 变量 + reset + base | 静态 CSS | ~0.8KB gzip | 不适用 |
| L2 | 配方类（52）+ 原子类（52） | 静态 CSS | ~2.7KB gzip | 不适用（全量引入） |
| **L3** | **真组件（10 个 af-* WC）** | **ESM JS + Shadow/Light CSS** | **~3.0KB gzip** | **支持** |

L3 = 必须 JS 才能实现的交互组件。L2 配方可覆盖的静态场景一律不上 L3。

### 0.2 设计目标

1. **原生优先**：纯 Web Components（Custom Elements + Shadow DOM），零 Lit/Stencil 运行时
2. **体积可控**：10 组件合计 ~3.0KB gzip，单组件 ~0.3KB 平均
3. **主题零代码**：Shadow 内直接引用 L1 token（CSS 变量穿透），自动跟随主题切换
4. **无障碍合规**：WCAG 2.1 AA + WAI-ARIA 1.2，键盘可达 + 状态暴露

### 0.3 与 L1/L2 的关系

```
L3 组件
├─ Light DOM 组件（6 个）：innerHTML 直接用 L2 配方 class
│     └─ 配方 class 引用 L1 token（自动继承，零额外代码）
└─ Shadow DOM 组件（4 个）：Shadow <style> 内 var(--c-*) 引用 L1 token
      └─ CSS 变量穿透 Shadow 边界，自动跟随主题
```

---

## 1. 组件清单与优先级

### 1.1 推断依据

- RFC 14.2 L3 JS 总预算 ~3KB gzip → 平均单组件 ~0.3KB
- L1+L2 文档已明确提及 `af-list`、`af-swiper`
- 只纳入"L2 配方无法覆盖"的交互场景

### 1.2 组件清单（10 个，三优先级）

| 组件 | 职责 | 为何必须 L3 | 优先级 |
|---|---|---|---|
| `af-list` | 长列表（虚拟滚动 + 下拉刷新 + 上拉加载） | 需 JS 算虚拟项索引 + 滚动监听 + 触底检测 | P0 |
| `af-swiper` | 轮播/滑动卡片 | 需 touch 手势 + transform 动画 + 索引状态 | P0 |
| `af-tabs` | 标签页切换（内容区联动） | 需选中态管理 + 内容区 show/hide + ARIA 同步 | P0 |
| `af-dialog` | 模态框（基于原生 `<dialog>`） | 需 showModal API + 焦点陷阱 + backdrop 关闭 | P0 |
| `af-toast` | 轻提示（自动消失） | 需队列管理 + 定时关闭 + 单例 | P1 |
| `af-action-sheet` | 底部操作面板 | 需 popover + 遮罩 + 退出动画 | P1 |
| `af-picker` | 滚轮选择器（省市区/时间） | 需 touch 滚动 + scroll-snap 吸附 | P1 |
| `af-dropdown` | 下拉菜单（基于 popover） | 需 popover 定位 + 选中回填 | P2 |
| `af-img` | 图片（懒加载 + 占位 + 加载失败） | 需 IntersectionObserver + 加载状态机 | P2 |
| `af-backtop` | 回到顶部按钮（滚动出现） | 需滚动监听 + 平滑滚动 | P2 |

### 1.3 不纳入 L3 的组件

| 组件 | 替代方案 | 原因 |
|---|---|---|
| 按钮/卡片/列表项/表单输入 | L2 配方 | 纯静态视觉，无需 JS |
| 导航栏/tabbar | L2 配方 + 原生 sticky | sticky 由 CSS 实现 |
| 骨架屏/空状态 | L2 配方 | 纯 CSS 动画，无状态 |
| 表单验证 | 原生 `:user-invalid` + L2 `.input-err` | 原生足够，无需 af-form |
| 抽屉/drawer | L2 `.sheet` + popover | 无需 JS 封装 |

### 1.4 体积预算（分解到组件）

| 组件 | JS gzip | CSS gzip | 合计 | 备注 |
|---|---|---|---|---|
| `af-list` | 0.5KB | 0 | 0.5KB | 虚拟滚动算法 |
| `af-swiper` | 0.4KB | 0.1KB | 0.5KB | touch + transform |
| `af-tabs` | 0.3KB | 0 | 0.3KB | ARIA 切换 |
| `af-dialog` | 0.2KB | 0.1KB | 0.3KB | 原生 dialog 封装 |
| `af-toast` | 0.2KB | 0 | 0.2KB | 单例队列 |
| `af-action-sheet` | 0.1KB | 0.1KB | 0.2KB | popover 封装 |
| `af-picker` | 0.3KB | 0.1KB | 0.4KB | CSS scroll-snap 代替 JS 惯性，省 0.3KB |
| `af-dropdown` | 0.1KB | 0.1KB | 0.2KB | popover 封装 |
| `af-img` | 0.1KB | 0 | 0.1KB | IntersectionObserver |
| `af-backtop` | 0.1KB | 0 | 0.1KB | 滚动监听 |
| **基类 AfElement** | 0.2KB | 0 | 0.2KB | |
| **合计** | **2.5KB** | **0.5KB** | **3.0KB** | 符合 RFC 3KB 预算 |

---

## 2. 技术选型与基类设计

### 2.1 技术选型：原生 Web Components

| 维度 | 原生 WC | Lit | Stencil |
|---|---|---|---|
| 运行时体积 | 0 | ~5KB | ~10KB |
| 与"原生优先"信条 | 一致 | 冲突 | 冲突 |
| Tree Shaking | ESM 天然支持 | 支持 | 支持 |
| AI 理解成本 | 低（标准 API） | 中 | 高 |
| 构建 | 零构建 | 需构建 | 需构建 |

**决策 D1**：选原生 WC。零运行时、技术栈与 L1/L2 一致、AI 无需学框架语法。

### 2.2 AfElement 基类设计

```javascript
// src/lib/af-element.js —— 基类，~0.2KB gzip
export class AfElement extends HTMLElement {
  constructor() {
    super();
    if (this.constructor.useShadow) {
      this.attachShadow({ mode: 'open' });
    }
  }

  get $() {
    return this.shadowRoot || this;
  }

  $(selector) {
    return this.$.querySelector(selector);
  }
  $$(selector) {
    return [...this.$.querySelectorAll(selector)];
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
    }
    this.unmounted?.();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal && this.onAttributeChange) {
      this.onAttributeChange(name, oldVal, newVal);
    }
  }

  emit(name, detail = {}) {
    this.dispatchEvent(new CustomEvent(name, {
      detail,
      bubbles: true,
      composed: true,
    }));
  }

  static defineProp(proto, name, { attr, type = String, default: defVal = null } = {}) {
    const privateName = Symbol(name);
    const attrName = attr || name;

    Object.defineProperty(proto, name, {
      get() { return this[privateName] ?? defVal; },
      set(val) {
        this[privateName] = val;
        this.skipAttrSync = true;
        if (val == null || val === false) this.removeAttribute(attrName);
        else if (val === true) this.setAttribute(attrName, '');
        else this.setAttribute(attrName, String(val));
        this.skipAttrSync = false;
      }
    });

    if (!proto.constructor.observedAttributes) {
      proto.constructor.observedAttributes = [];
    }
    proto.constructor.observedAttributes.push(attrName);
  }
}
```

**基类能力汇总**（决策 D2）：

| 能力 | 实现方式 | 说明 |
|---|---|---|
| Shadow/Light 统一接口 | `this.$` + `this.constructor.useShadow` | 子类声明 `static useShadow = true/false` |
| 生命周期钩子 | `mounted`/`unmounted`/`onAttributeChange`/`onThemeChange` | 基类派发，子类按需实现 |
| mounted 一次性保证 | `this._mounted` 标志位 | 元素重插入 DOM 不重渲染 |
| 主题订阅内置 | `themechange` 事件监听/取消 | 子类只需实现 `onThemeChange(theme)` |
| 属性特性同步 | `defineProp` + `skipAttrSync` | 双向同步 + 防循环 |
| 事件派发 | `emit(name, detail)` | 统一 bubbles + composed，Shadow 事件可冒泡 |

### 2.3 注册机制

```javascript
// src/index.js —— 汇总导出
export { AfElement } from './lib/af-element.js';
export { AfList } from './components/af-list.js';
export { AfSwiper } from './components/af-swiper.js';
export { AfTabs } from './components/af-tabs.js';
export { AfDialog } from './components/af-dialog.js';
export { AfToast } from './components/af-toast.js';
export { AfActionSheet } from './components/af-action-sheet.js';
export { AfPicker } from './components/af-picker.js';
export { AfDropdown } from './components/af-dropdown.js';
export { AfImg } from './components/af-img.js';
export { AfBacktop } from './components/af-backtop.js';

export function registerAll() {
  customElements.define('af-list', AfList);
  customElements.define('af-swiper', AfSwiper);
  customElements.define('af-tabs', AfTabs);
  customElements.define('af-dialog', AfDialog);
  customElements.define('af-toast', AfToast);
  customElements.define('af-action-sheet', AfActionSheet);
  customElements.define('af-picker', AfPicker);
  customElements.define('af-dropdown', AfDropdown);
  customElements.define('af-img', AfImg);
  customElements.define('af-backtop', AfBacktop);
}
```

**用户使用（决策 D3）**：

```javascript
// 方式 A：按需注册（Tree Shake，推荐）
import { AfList, AfDialog } from 'aiflow-ui';
customElements.define('af-list', AfList);
customElements.define('af-dialog', AfDialog);

// 方式 B：全量注册（便利，不 Tree Shake）
import { registerAll } from 'aiflow-ui';
registerAll();
```

### 2.4 组件文件结构

```
src/
├── lib/
│   ├── af-element.js          # 基类
│   └── theme.js               # L1 主题 API
├── components/
│   ├── af-list.js             # Light DOM
│   ├── af-tabs.js             # Light DOM
│   ├── af-toast.js            # Light DOM
│   ├── af-action-sheet.js     # Light DOM
│   ├── af-dropdown.js         # Light DOM
│   ├── af-backtop.js          # Light DOM
│   ├── af-swiper.js           # Shadow DOM（CSS 嵌入字符串）
│   ├── af-dialog.js           # Shadow DOM
│   ├── af-picker.js           # Shadow DOM
│   └── af-img.js              # Shadow DOM
└── index.js                   # 汇总导出
```

**决策 D4**：JS 与 CSS 不分离文件。Light 组件零 CSS；Shadow 组件 CSS 以字符串嵌入 JS，随组件一起 Tree Shake。

---

## 3. 生命周期与注册机制

### 3.1 完整生命周期模型

```
实例化流程：
┌─────────────────────────────────────────────────────────┐
│  constructor()                                           │
│  └─ 基类：attachShadow（若 useShadow）                   │
│  └─ 子类：初始化内部状态（不访问 DOM/属性）              │
│         │                                                │
│         ▼                                                │
│  connectedCallback()                                     │
│  └─ 基类：_mounted 标志位检查（只调一次）                │
│  └─ 基类：订阅 themechange → onThemeChange               │
│  └─ 基类：调用 mounted()                                 │
│  └─ 子类：mounted() —— 读属性、渲染 DOM、绑定事件        │
│         │                                                │
│         ▼                                                │
│  attributeChangedCallback(name, old, new)                │
│  └─ 基类：old !== new 判断 → onAttributeChange           │
│  └─ 子类：onAttributeChange —— 精确更新（不重渲染）      │
│         │                                                │
│         ▼                                                │
│  disconnectedCallback()                                  │
│  └─ 基类：取消 themechange 订阅                          │
│  └─ 基类：调用 unmounted()                               │
│  └─ 子类：unmounted() —— 移除监听/Observer/定时器        │
└─────────────────────────────────────────────────────────┘
```

**约束（决策 D5）**：
- `constructor` 禁止访问属性/DOM（WC 规范限制）
- `mounted` 由 `_mounted` 标志位保证只执行一次（元素重插入不重渲染）
- `onAttributeChange` 不强制重渲染，子类按需决定是否调用 `render()`
- `unmounted` 必须清理全部资源：见 3.4 清单

### 3.2 属性（Attribute）与特性（Property）双向同步

基类 `defineProp` 方法提供完整同步：

```javascript
// 子类使用
export class AfList extends AfElement {
  static useShadow = false;

  constructor() {
    super();
    AfElement.defineProp(this, 'data', { type: Array, default: [] });
    AfElement.defineProp(this, 'pageSize', { attr: 'page-size', type: Number, default: 20 });
  }

  onAttributeChange(name, oldVal, newVal) {
    if (name === 'page-size') {
      this.pageSize = Number(newVal);
      this.render();
    }
    if (name === 'data') {
      this.data = JSON.parse(newVal || '[]');
      this.render();
    }
  }
}
```

**类型转换规则**：

| type 参数 | attribute → property 转换 |
|---|---|
| `String` | 原样返回 |
| `Number` | `Number(val)` |
| `Boolean` | 属性存在 = true，否则 = false |
| `Array` / `Object` | `JSON.parse(val || '[]')` / `JSON.parse(val || '{}')` |

**防循环机制**：`property → attribute` 同步时设 `skipAttrSync = true`，`attributeChangedCallback` 检测到跳过。

### 3.3 升级时机

| 场景 | 行为 |
|---|---|
| HTML 先于 JS：`<af-list>` 存在后注册 | 浏览器自动"升级"，触发 constructor + connectedCallback |
| JS 动态创建：先 define 再 createElement | 规范流程，推荐 |

**未升级闪烁**：不内置处理。配合 SSR 或 `<af-list style="display:none">` 手动规避。

### 3.4 unmounted 资源清理清单（子类必须实现）

| 资源类型 | 清理方式 | 典型组件 |
|---|---|---|
| window/document 事件 | `removeEventListener` | af-list、af-backtop（scroll）、af-swiper（resize） |
| IntersectionObserver | `.disconnect()` | af-img、af-list |
| ResizeObserver | `.disconnect()` | af-swiper |
| 定时器 | `clearTimeout` / `clearInterval` | af-toast、af-swiper（autoplay） |
| 动画帧 | `cancelAnimationFrame` | af-picker（scroll 状态） |

ESLint 规则 `aiflow/wc-cleanup`（warn）检测 addEventListener 但 unmounted 内无对应 removeEventListener。

---

## 4. CSS 隔离方案（混合方案）

### 4.1 方案选择

| 维度 | 全 Shadow | 全 Light | **混合（推荐）** |
|---|---|---|---|
| 隔离性 | 完全 | 无 | 按需 |
| L2 配方可用性 | 不可用（需重写） | 完全可用 | Light 组件可用 |
| L1 token 可用性 | 可（CSS 变量穿透） | 完全可用 | 全部可用 |
| 体积 | 大（重写配方） | 小 | 中 |
| AI 成本 | 高 | 低 | 中 |

**决策 D6**：混合方案。按"是否需要封装专属样式"分两类。

### 4.2 DOM 模式分配

| 组件 | DOM 模式 | 理由 |
|---|---|---|
| `af-list` | Light | 内部是 `.list`/`.list-item` 配方 |
| `af-tabs` | Light | 内部是 `.tab-item`/`.tabbar` 配方 |
| `af-toast` | Light | 内部是 `.toast` 配方 |
| `af-action-sheet` | Light | 内部是 `.sheet` 配方 + popover |
| `af-dropdown` | Light | 内部是 `.cell`/`.list-item` 配方 |
| `af-backtop` | Light | 内部是 `.btn` 配方 |
| `af-swiper` | Shadow | 轨道/动画样式专属，不污染全局 |
| `af-dialog` | Shadow | backdrop/焦点陷阱样式专属 |
| `af-picker` | Shadow | 滚轮/吸附样式专属 |
| `af-img` | Shadow | 占位/失败态样式专属 |

### 4.3 Light DOM 组件样式规范

**规范 1**：`innerHTML` 只用 L2 白名单 104 个 class，禁止输出自定义 class。

```javascript
// ✅ 正确
render() {
  this.innerHTML = `
    <div class="list">
      ${this.data.map(item => `
        <div class="list-item">
          <img class="thumb" src="${item.img}">
          <div class="flex-1">
            <div class="body">${item.title}</div>
            <div class="subtitle">${item.sub}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ❌ 错误：输出自定义 class（白名单外）
render() {
  return `<div class="list-item af-list-item-custom">...</div>`;
}
```

**规范 2**：ESLint `aiflow/wc-light-no-style`（error）——Light 组件 JS 内含 `<style>` 或 `this.style.xxx` 阻断。

### 4.4 Shadow DOM 组件样式规范

**L1 token 天然穿透 Shadow**：`:root` 的 CSS 自定义属性在 Shadow 内直接可用，无需额外注入。

```javascript
// af-dialog Shadow CSS 示例
const CSS = `
  :host { display: contents; }

  dialog {
    border: none;
    border-radius: var(--r-l);           /* token 直接用 */
    background: var(--c-card);
    color: var(--c-text);
    padding: var(--s-4);
    max-width: 90vw;
    box-shadow: var(--shadow-lg);
  }
  dialog::backdrop {
    background: rgba(0,0,0,.5);         /* 唯一硬编码：遮罩色（L1 无 mask token） */
  }
  .header {
    font-size: var(--t-xl);
    font-weight: var(--fw-bold);
    margin-bottom: var(--s-3);
  }
`;
```

**规范 3**：ESLint `aiflow/wc-shadow-use-token`（error）——Shadow CSS 内颜色/间距/圆角/字号硬编码（非 `var(--*)`）阻断。
- 唯一例外：`dialog::backdrop` / `[popover]::backdrop` 的遮罩半透明黑（`rgba(0,0,0,.5)`）
- 不新增 `--c-mask` token（YAGNI，只这一处用）

**规范 4**：Shadow 内不复用 L2 配方 class（CSS 类不穿透 Shadow 边界），直接用 token 写组件级 CSS。
- 必要时用 `::part()` 暴露定制点（如 af-dialog 的 `dialog`/`content` part）

### 4.5 ::part() 暴露清单

| 组件 | Part 名 | 对应 DOM | 说明 |
|---|---|---|---|
| `af-swiper` | `track` | 轨道容器 | 允许自定义 transform 曲线 |
| `af-swiper` | `slide` | 单个 slide | 允许自定义 padding |
| `af-swiper` | `dots` | 指示器容器 | 允许自定义位置 |
| `af-dialog` | `dialog` | `<dialog>` 元素 | 允许自定义圆角/阴影 |
| `af-dialog` | `content` | 内容容器 | 允许自定义 padding |
| `af-picker` | `column` | 单列容器 | 允许自定义宽度 |
| `af-picker` | `item` | 单个选项 | 允许自定义字号 |

ESLint `aiflow/wc-part-naming`（warn）——part 名必须 kebab-case 且在文档声明。

### 4.6 主题切换对 Shadow 组件的影响

| 情况 | 行为 |
|---|---|
| 大多数 Shadow 组件 | CSS 变量穿透，`var(--c-*)` 自动跟随——零 JS |
| 尺寸相关组件（af-swiper） | 实现 `onThemeChange(theme)` 钩子，重算 slide 宽度（字体渲染差异影响） |

---

## 5. 与 L1 Token / L2 配方的协作

### 5.1 协作总览

```
L3 组件
├─ Light 组件（6 个）
│  └─ innerHTML 用 L2 配方 class
│     └─ 配方 class 引用 L1 token 变量（全局 CSS，自动继承）
└─ Shadow 组件（4 个）
   └─ Shadow <style> 内 var(--token)
      └─ CSS 自定义属性天然穿透 Shadow 边界（:root → ShadowRoot）
```

### 5.2 L2 vs L3 选择指引（给 AI + 开发者）

| 场景 | 选择 L2 配方 | 选择 L3 组件 | 理由 |
|---|---|---|---|
| 静态列表（≤10 项固定） | ✅ `.list` + `.list-item` | ❌ | 过度设计 |
| 长列表（100+ 项/虚拟滚动） | ❌ | ✅ `af-list` | 性能 |
| 轮播/滑动 | ❌ | ✅ `af-swiper` | 需 touch+动画 |
| 模态框 | ❌ | ✅ `af-dialog` | 焦点陷阱+显隐控制 |
| 标签页（2-3 静态） | ⚠️ L2 + 10 行 JS | ✅ `af-tabs` | ARIA 复杂 |
| Toast 提示 | ❌ | ✅ `af-toast` | 队列+定时 |
| 单个按钮 | ✅ `.btn` | ❌ | 纯静态 |

ESLint `aiflow/prefer-component`（warn）——页面同时存在 L3 组件与等价 L2 配方（如 `<af-toast>` 与手动 `.toast`）时提示。

### 5.3 组件对 L2 配方的使用禁区

| L2 配方 | 禁区组件 | 说明 |
|---|---|---|
| `.list` / `.list-item` | af-list | af-list 由 data attribute 驱动 render，AI 不应直接写死 list-item |
| `.tab-item` | af-tabs | `aria-selected` 由组件管理，AI 不应手动设置 |
| `.toast` | af-toast | af-toast 单例管理，AI 不应直接创建 |
| `.sheet` | af-action-sheet | af-action-sheet 管理 popover，AI 不应直接写 |

---

## 6. 事件机制与数据流

### 6.1 事件设计三原则

1. **`CustomEvent` 派发**：纯原生，不引入 EventEmitter
2. **命名 `af-{组件}:{动作}`**：统一命名空间，动作用动词原形
3. **`bubbles: true, composed: true`**：Shadow 内事件穿透边界

### 6.2 事件清单（18 个）

| 组件 | 事件名 | payload | 触发时机 |
|---|---|---|---|
| `af-list` | `af-list:loadmore` | `{ page }` | 滚动到底部 |
| `af-list` | `af-list:refresh` | `{}` | 下拉刷新触发 |
| `af-list` | `af-list:itemclick` | `{ index, item }` | 点击列表项 |
| `af-swiper` | `af-swiper:change` | `{ index }` | slide 切换完成 |
| `af-tabs` | `af-tabs:change` | `{ index, value }` | tab 切换 |
| `af-dialog` | `af-dialog:open` | `{}` | 对话框打开 |
| `af-dialog` | `af-dialog:close` | `{ action }` | 对话框关闭 |
| `af-toast` | `af-toast:dismiss` | `{}` | toast 消失 |
| `af-action-sheet` | `af-action-sheet:select` | `{ index, value }` | 选择某项 |
| `af-action-sheet` | `af-action-sheet:close` | `{}` | 关闭 |
| `af-picker` | `af-picker:change` | `{ column, value }` | 滚动选择变化 |
| `af-picker` | `af-picker:confirm` | `{ values }` | 确认选择 |
| `af-dropdown` | `af-dropdown:select` | `{ index, value }` | 选择菜单项 |
| `af-img` | `af-img:load` | `{}` | 图片加载完成 |
| `af-img` | `af-img:error` | `{}` | 图片加载失败 |
| `af-backtop` | `af-backtop:click` | `{}` | 点击回顶按钮 |

### 6.3 事件派发与监听

```javascript
// 派发（基类 emit 提供）
export class AfList extends AfElement {
  onItemClick(index, item) {
    this.emit('af-list:itemclick', { index, item });
  }
}

// 外部监听
const list = document.querySelector('af-list');
list.addEventListener('af-list:itemclick', (e) => {
  console.log(e.detail.index, e.detail.item);
});
```

### 6.4 单向数据流模型

```
外部（属性/特性）设置
    │
    ▼
组件内部状态（data/activeIndex/_isLoading 等）
    │
    ▼  状态变化 → render()
DOM（Light innerHTML 或 Shadow DOM）
    │
    ▼  用户交互
emit('af-xxx:xxx', payload)
    │
    ▼  事件冒泡
外部监听 → 更新外部状态 → 重新设置属性 → 新循环
```

**约束（决策 D7）**：
- 属性 = 输入，事件 = 输出
- 组件不在事件回调内修改自身 attribute（如 itemclick 后不设 `selected` attribute）——内部状态用私有字段（`_selected`）
- ESLint `aiflow/wc-no-attr-mutate`（warn）检测事件回调内的 `setAttribute`

### 6.5 与 React/Vue 协作

```jsx
// React
<af-list
  ref={(el) => {
    if (el) {
      el.data = items;        // property 赋值（避免 JSON.stringify）
      el.addEventListener('af-list:loadmore', loadMore);
    }
  }}
/>
```

```vue
<!-- Vue（@ 语法糖支持 CustomEvent） -->
<af-tabs
  :tabs="tabs"
  @af-tabs:change="onTabChange"
/>
```

**复杂数据**：property 赋值（`el.data = [...]`）优于 attribute 字符串（避免 JSON 序列化开销）。

---

## 7. 无障碍（ARIA）与键盘交互

### 7.1 设计原则

1. **语义化优先**：用原生元素（`<dialog>`/`<button>`/`<nav>`），ARIA 只在不足时补
2. **键盘可达**：所有交互 Tab/Enter/Esc/方向键可操作
3. **状态可感知**：选中/展开/加载用 `aria-*` 暴露

### 7.2 ARIA 与键盘矩阵

| 组件 | role | 关键 aria-* | Tab | Enter/Space | Esc | 方向键 | Home/End |
|---|---|---|---|---|---|---|---|
| `af-list` | `list` | `aria-busy` | 聚焦列表 | 触发 itemclick | — | — | — |
| `af-swiper` | `region` + dots=`tablist` | `aria-label`/dots `aria-selected` | 聚焦 dots | 切换 slide | — | ←→ 切换 | — |
| `af-tabs` | `tablist`/`tab`/`tabpanel` | `aria-selected`/`aria-controls`/`aria-labelledby` | 进入当前 tab | — | — | ←→ 切换 | 首末 tab |
| `af-dialog` | `dialog`（原生） | `aria-modal`/`aria-labelledby` | 焦点陷阱循环 | 确认按钮 | 关闭 | — | — |
| `af-toast` | `status` | `aria-live="polite"` | — | — | — | — | — |
| `af-action-sheet` | `dialog` | `aria-modal` | 选项间循环 | 选择并关闭 | 关闭 | — | — |
| `af-picker` | `listbox`/`option` | `aria-activedescendant`/`aria-valuenow` | 聚焦当前列 | 确认 | 取消 | ↑↓ 选择 | — |
| `af-dropdown` | `menu`/`menuitem` | `aria-expanded`/`aria-haspopup` | 触发器→菜单项 | 选择 | 关闭 | ↑↓ 导航 | — |
| `af-img` | `img` | `alt`（透传） | — | — | — | — | — |
| `af-backtop` | `button`（原生） | `aria-label="回到顶部"` | 聚焦按钮 | 触发回顶 | — | — | — |

### 7.3 af-tabs：roving tabindex 范例（WAI-ARIA tab 模式）

```javascript
handleKeydown(e) {
  const tabs = this.$$('.tab-item');
  let idx = this.activeIndex;
  if (e.key === 'ArrowRight') idx = (idx + 1) % tabs.length;
  else if (e.key === 'ArrowLeft') idx = (idx - 1 + tabs.length) % tabs.length;
  else if (e.key === 'Home') idx = 0;
  else if (e.key === 'End') idx = tabs.length - 1;
  else return;
  e.preventDefault();
  this.setActive(idx);
  tabs[idx].focus();          // 焦点跟随
}

setActive(idx) {
  this.activeIndex = idx;
  this.$$('.tab-item').forEach((tab, i) => {
    tab.setAttribute('aria-selected', i === idx);
    tab.setAttribute('tabindex', i === idx ? 0 : -1);
  });
  this.$$('[role="tabpanel"]').forEach((panel, i) => {
    panel.hidden = i !== idx;
  });
  this.emit('af-tabs:change', { index: idx });
}
```

### 7.4 af-dialog：焦点陷阱实现

```javascript
open() {
  this._previouslyFocused = document.activeElement;
  this.dialog.showModal();
  this._trapFocus();
  this.emit('af-dialog:open');
}

close() {
  this.dialog.close();
  this._previouslyFocused?.focus();    // 焦点还原
  this.emit('af-dialog:close');
}

_trapFocus() {
  const focusable = this.shadowRoot.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];

  this.shadowRoot.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { this.close(); return; }
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first)
      { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last)
      { e.preventDefault(); first.focus(); }
  });
  first.focus();
}
```

### 7.5 af-toast：aria-live 策略

```javascript
show(message, duration = 2000) {
  this.innerHTML = `<div class="toast" role="status" aria-live="polite">${message}</div>`;
  setTimeout(() => this.dismiss(), duration);
}
```

- `role="status"` + `aria-live="polite"`：屏幕阅读器空闲时播报，不打断
- 不用 `aria-live="assertive"`：非紧急信息

### 7.6 无障碍 ESLint 规则

| 规则名 | 检测 | 动作 |
|---|---|---|
| `aiflow/wc-aria-required` | 组件缺少规范要求的 role/aria-* | error |
| `aiflow/wc-keyboard` | 交互元素有 click 无 keydown 处理 | warn |
| `aiflow/wc-focus-trap` | 模态组件（af-dialog/af-action-sheet）无焦点陷阱 | error |
| `aiflow/wc-alt-text` | af-img 缺少 alt 属性透传 | error |

---

## 8. 体积控制与 Tree Shaking 实现

### 8.1 Tree Shaking 机制

**核心：ESM 命名导出 + 用户显式注册 + `sideEffects: false`。**

```
用户：import { AfList, AfDialog } from 'aiflow-ui'
    │
    ▼
打包工具（Vite/Rollup）分析依赖
    ├─ AfList → af-list.js → af-element.js
    ├─ AfDialog → af-dialog.js → af-element.js
    └─ 其余 8 个组件：未 import，摇除
    │
    ▼
产物：af-element + af-list + af-dialog = 0.2 + 0.5 + 0.3 = 1.0KB gzip
```

**package.json 配置（决策 D8）**：

```json
{
  "name": "aiflow-ui",
  "sideEffects": false,
  "exports": {
    ".": "./src/index.js",
    "./lib/theme": "./src/lib/theme.js",
    "./lib/af-element": "./src/lib/af-element.js"
  }
}
```

**约束（决策 D9）**：所有组件文件**无顶层副作用**（不在模块顶层调 `customElements.define`，只 export class）。

### 8.2 Shadow CSS 嵌入 JS 字符串

```javascript
// af-swiper.js
const CSS = `
  :host { display: block; }
  .track { display: flex; transition: transform var(--dur-base) var(--ease-out); }
  .slide { flex-shrink: 0; width: 100%; }
  /* ... */
`;

export class AfSwiper extends AfElement {
  static useShadow = true;
  mounted() {
    const style = document.createElement('style');
    style.textContent = CSS;
    this.shadowRoot.appendChild(style);
    this.render();
  }
}
```

**理由（决策 D10）**：
- CSS 随 JS 一起 Tree Shake（未 import 组件的 CSS 字符串不出现）
- 不用 `import './af-swiper.css'`（CSS import 需构建工具支持，且 CSS import 是副作用）
- Shadow 内 CSS 本就是封装的，无死代码问题

### 8.3 af-picker 的 scroll-snap 体积优化

用 CSS `scroll-snap-type: y mandatory` 代替 JS 惯性/吸附算法：

```javascript
// af-picker Shadow CSS（JS 字符串）
const CSS = `
  .column {
    height: 180px;
    overflow-y: scroll;
    scroll-snap-type: y mandatory;        /* 原生吸附 */
  }
  .item {
    height: 36px;
    line-height: 36px;
    scroll-snap-align: center;            /* 对齐到中心 */
    text-align: center;
    font-size: var(--t-md);
    color: var(--c-muted);
  }
  .item.active {
    color: var(--c-text);
    font-weight: var(--fw-bold);
  }
`;
```

效果：
- 省 JS 惯性算法 ~0.3KB
- CSS 仅增 ~0.05KB
- 总预算回到 3.0KB 以内（1.4 节分解）

### 8.4 af-toast 单例模式（零开销）

```javascript
// af-toast.js —— 模块级变量
let instance = null;

export class AfToast extends AfElement {
  static useShadow = false;

  show(message, duration = 2000) {
    if (instance && instance !== this) instance.dismiss();
    instance = this;
    this.innerHTML = `<div class="toast" role="status" aria-live="polite">${message}</div>`;
    this._timer = setTimeout(() => this.dismiss(), duration);
  }

  dismiss() {
    this.innerHTML = '';
    clearTimeout(this._timer);
    if (instance === this) instance = null;
    this.emit('af-toast:dismiss');
  }
}
```

- 模块级 `instance` 变量，零额外依赖
- 新 toast 直接替换旧 toast（不排队，YAGNI）

### 8.5 CI 体积监控

| 检查项 | 阈值 | 动作 |
|---|---|---|
| 单组件（JS+CSS）gzip | ≤ 0.6KB | PR 阻断 |
| 基类 AfElement gzip | ≤ 0.3KB | PR 阻断 |
| 全部 10 组件 + 基类 gzip | ≤ 3.2KB | PR 阻断 |
| 按需引入 2 组件 gzip | ≤ 1.2KB | warn |

实现：CI 脚本用 `esbuild` 打包 + `gzip-size` 测量。

### 8.6 Tree Shaking 验证

CI 集成：

```javascript
test('按需引入 2 组件，其余 8 个被摇除', async () => {
  const output = await buildTwoComponentsOnly();
  expect(output).toContain('AfList');
  expect(output).toContain('AfDialog');
  expect(output).not.toContain('AfSwiper');
  expect(output).not.toContain('AfPicker');
  expect(output).not.toContain('AfTabs');
  expect(output).not.toContain('AfActionSheet');
  expect(output).not.toContain('AfDropdown');
  expect(output).not.toContain('AfImg');
  expect(output).not.toContain('AfBacktop');
  expect(output).not.toContain('AfToast');
});
```

---

## 9. 组件逐个详设

每个组件详设包含 10 节：概述 / DOM 模式 / 属性 API / DOM 结构 / 算法 / 事件 / ARIA 与键盘 / 使用示例 / 与 L2 协作 / 体积拆分。

**清单**：

- [x] 9.1 `af-list` 详设（P0）
- [x] 9.2 `af-swiper` 详设（P0）
- [ ] 9.3 `af-tabs` 详设（P0）
- [ ] 9.4 `af-dialog` 详设（P0）
- [ ] 9.5 `af-toast` 详设（P1）
- [ ] 9.6 `af-action-sheet` 详设（P1）
- [ ] 9.7 `af-picker` 详设（P1）
- [ ] 9.8 `af-dropdown` 详设（P2）
- [ ] 9.9 `af-img` 详设（P2）
- [ ] 9.10 `af-backtop` 详设（P2）

---

### 9.1 af-list 详设（P0 · 长列表虚拟滚动）

#### 9.1.1 概述

| 项 | 内容 |
|---|---|
| 职责 | 长列表（100+ 项）高性能渲染：(a) 虚拟滚动只渲染可视区±缓冲；(b) 下拉刷新触发 `af-list:refresh`；(c) 滚动到底部触发 `af-list:loadmore`；(d) 点击列表项触发 `af-list:itemclick` |
| 解决场景 | 商品列表、订单列表、聊天消息列表、搜索结果——任何项数超过一屏、L2 `.list` + `.list-item` 纯静态性能堪忧的场景 |
| L2 边界 | ≤10 项固定静态列表 → 用 L2 `.list` + `.list-item` 配方，无需 af-list；>10 项或数据不确定 → 用 af-list |
| 体积预算 | JS ~0.5KB gzip；CSS 0（Light DOM，纯用 L2 配方） |

#### 9.1.2 DOM 模式：Light DOM（useShadow = false）

| 理由 | 说明 |
|---|---|
| 直接复用 L2 配方 | 列表结构用 `.list` + `.list-item`/`.list-item-compact`/`.divider`，用户可叠加原子类自定义 |
| 内部无专属样式 | af-list 只负责"哪些 item 渲染 / 滚动容器行为"，不负责视觉 |
| 主题零代码 | L2 配方已 token 化，自动跟随主题 |
| 用户自定义 item 模板 | Light DOM 允许用户通过 `renderItem` 函数灵活定制每项结构 |

#### 9.1.3 属性 API

**attribute 列表**

| 属性名 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `data` | JSON String → Array | `"[]"` | 列表数据；推荐用 property（`el.data = [...]`）避免序列化开销 |
| `page-size` | Number | `20` | `af-list:loadmore` 事件递增的 page 步长 |
| `item-height` | Number（px） | `48` | 每项固定高度（虚拟滚动计算用） |
| `buffer` | Number（项数） | `5` | 可视区上下额外渲染的缓冲项数 |
| `mode` | `normal`/`compact` | `normal` | 使用 `.list-item` 还是 `.list-item-compact` 作为默认项 class |
| `refresh` | Boolean | `true` | 是否启用下拉刷新 |
| `loading` | Boolean | `false` | 受控加载中状态（显示骨架屏区域） |
| `empty-text` | String | `"暂无数据"` | 空状态文案 |

**property 映射**

| 属性名 | 类型 | 说明 |
|---|---|---|
| `data` | `Array<T>` | 数据数组；property 赋值不走 JSON.stringify |
| `loading` | `Boolean` | 开关加载中骨架屏 |
| `emptyText` | `String` | 空状态文字 |
| `renderItem` | `(item: T, index: number) => string` | **核心**：自定义每项渲染函数（返回 HTML 字符串） |
| `scrollTop` | `Number`（只读） | 当前滚动距离 |
| `totalCount` | `Number` | 数据总条数（用于 loadmore 停止判断，默认 = data.length） |

**决策 D15（af-list）**：以 `renderItem` 函数为主定制方式（而非 `<slot>`）。理由：(a) 虚拟滚动需动态插入/删除节点，slot 难管理；(b) HTML 字符串拼接零依赖，体积最小。

#### 9.1.4 DOM 结构

```
<af-list>
  └─ .list（L2 配方，容器圆角/背景/溢出裁剪）
      ├─ .af-list-refresh-indicator  ← 下拉刷新指示器（高度 0 → 下拉时撑开）
      ├─ .af-list-spacer-before       ← 上方占位（高度 = startIndex * itemHeight）
      ├─ .af-list-viewport            ← 实际渲染的 N 个 item（可视区 + 2*buffer）
      │   ├─ .list-item [0] → 由 renderItem 生成
      │   ├─ .list-item [1]
      │   └─ ...
      ├─ .af-list-spacer-after        ← 下方占位（高度 = (total - endIndex) * itemHeight）
      └─ .af-list-loadmore            ← 上拉加载更多指示器
```

`spacer-before` + `spacer-after` 两个空 div 撑开总滚动高度，让浏览器滚动条保持真实。中间 viewport 只渲染 `2*buffer + visibleCount` 项（通常 ~15-25 项），不管数据 100 还是 10,000。

#### 9.1.5 算法

**算法 A：虚拟滚动渲染（scroll 事件节流 16ms = 1 帧）**

```
onscroll（节流）：
  1. viewportTop = scrollTop
  2. visibleCount = ceil(viewportHeight / itemHeight)
  3. startIndex = max(0, floor(viewportTop / itemHeight) - buffer)
  4. endIndex   = min(total, startIndex + visibleCount + 2*buffer)
  5. if (startIndex !== prevStartIndex || endIndex !== prevEndIndex):
       spacer-before.style.height = startIndex * itemHeight + 'px'
       spacer-after.style.height  = (total - endIndex) * itemHeight + 'px'
       viewport.innerHTML = data.slice(startIndex, endIndex).map((item, i) => {
         const realIndex = startIndex + i;
         return (renderItem || defaultRender)(item, realIndex);
       }).join('');
       prevStartIndex = startIndex; prevEndIndex = endIndex;
```

`spacer` 的 `height` 设置是"布局属性"，在 `no-inline-style` 的豁免名单内（width/height 豁免，L4 §3.2 L1-2 规定）。

**节流实现（零 lodash）**

```javascript
this._throttleTimer = null;
const THROTTLE_MS = 16;  // 1 帧
this._onScroll = () => {
  if (this._throttleTimer) return;
  this._throttleTimer = setTimeout(() => {
    this._throttleTimer = null;
    this._updateViewport();
  }, THROTTLE_MS);
};
```

**算法 B：下拉刷新（touchstart/touchmove/touchend，refresh=true 时启用）**

```
touchstart: record startY = touches[0].clientY
touchmove:  deltaY = currentY - startY
            if (scrollTop === 0 && deltaY > 0):  // 已到顶 + 下拉
              preventDefault()
              indicatorHeight = min(deltaY * 0.5, 60)  // 阻尼 0.5，最大 60px
              indicator.style.height = indicatorHeight + 'px'
touchend:   if (indicatorHeight > 40):  // 超阈值 → 触发刷新
              emit('af-list:refresh', {})
              // 用户监听 → 重新请求 → 设 list.data = newData
              // 用户调 el.endRefresh() 收起指示器
            else:
              indicator.style.height = '0px'  // 回弹
```

对外 API：`el.endRefresh()` → 收起指示器（用户 refresh 请求完成后调用）。

**算法 C：上拉加载（scroll 事件中检测触底）**

```
在 _updateViewport 末尾追加：
  distanceToBottom = scrollHeight - scrollTop - viewportHeight
  if (distanceToBottom < itemHeight * 2
      && !this._isLoadingMore
      && this.data.length < this.totalCount):
    this._isLoadingMore = true
    this._page += 1
    emit('af-list:loadmore', { page: this._page })
```

对外 API：`el.endLoadMore(hasMore: Boolean)` → 用户 loadmore 请求完成后调用，重置 `_isLoadingMore`；`hasMore=false` 时显示"没有更多了"并禁用后续触发。

#### 9.1.6 事件

| 事件名 | payload | 触发时机 |
|---|---|---|
| `af-list:loadmore` | `{ page: number }` | 滚动到底部，距底不足 2 项。page 从 1 开始，每次自动 +1。调 `el.endLoadMore(hasMore)` 后才允许下一次触发 |
| `af-list:refresh` | `{}` | 下拉超过阈值（40px）松手后。调 `el.endRefresh()` 收起指示器 |
| `af-list:itemclick` | `{ index: number, item: T }` | 点击 viewport 内任何项。通过事件委托（在 `.list` 容器上监听 click），不绑每个项——虚拟滚动节点会被删除，逐项监听导致内存泄漏 |

**itemclick 事件委托实现**

```javascript
mounted() {
  this.render();
  this.$.addEventListener('click', (e) => {
    const itemEl = e.target.closest('.list-item, .list-item-compact');
    if (!itemEl || !this.$.contains(itemEl)) return;
    const idx = Number(itemEl.dataset.listIndex);
    if (!Number.isNaN(idx)) {
      this.emit('af-list:itemclick', { index: idx, item: this.data[idx] });
    }
  });
}
```

每项 render 时附 `data-list-index="${realIndex}"`，委托时反向取 realIndex 从 data 数组取 item。

#### 9.1.7 ARIA 与键盘

| 项 | 内容 |
|---|---|
| `role="list"` | `.list` 容器自带 |
| `aria-busy="true"` | `loading=true` 期间设置；加载完成自动设 `false` |
| `aria-label` | 根上 `aria-label="列表，共 ${total} 项"`（变化时更新） |
| 键盘：Enter / Space | viewport 中可聚焦项（用户自定义模板需加 `tabindex="0"`）按 Enter/Space → 触发对应 itemclick |
| 键盘：↑↓ | 不内置列表项聚焦导航（YAGNI：列表通常超长，浏览器原生滚动条更直觉） |
| 下拉刷新 aria-live | 刷新指示器 `aria-live="polite"` + `aria-label="正在刷新"` |

#### 9.1.8 使用示例

**示例 1：商品列表（自定义 renderItem）**

```html
<!doctype html>
<html>
<head>
  <link rel="stylesheet" href="/aiflow-ui.css">
</head>
<body>
  <div class="page">
    <h1 class="title">商品列表</h1>
    <af-list id="goods" item-height="72" mode="normal"
             empty-text="还没有商品，去上架吧"></af-list>
  </div>

  <script type="module">
    import { AfList } from 'aiflow-ui';
    customElements.define('af-list', AfList);

    goods.renderItem = (item, index) => `
      <div class="list-item" data-list-index="${index}">
        <img class="thumb" src="${item.img}">
        <div class="flex-1">
          <div class="body">${item.title}</div>
          <div class="flex aic jcsb">
            <span class="price">¥${item.price}</span>
            <span class="tag tag-warn">${item.tag || '热卖'}</span>
          </div>
        </div>
      </div>
    `;

    let page = 1;
    goods.totalCount = 256;
    loadPage(page);

    async function loadPage(p) {
      const items = await fetch(`/api/goods?page=${p}&pageSize=20`).then(r => r.json());
      goods.data = p === 1 ? items : [...goods.data, ...items];
      goods.endLoadMore(goods.data.length < goods.totalCount);
    }

    goods.addEventListener('af-list:loadmore', (e) => {
      page = e.detail.page;
      loadPage(page);
    });

    goods.addEventListener('af-list:refresh', async () => {
      page = 1;
      goods.loading = true;
      const items = await fetch('/api/goods?page=1').then(r => r.json());
      goods.data = items;
      goods.loading = false;
      goods.endRefresh();
    });

    goods.addEventListener('af-list:itemclick', (e) => {
      location.href = `/goods/${e.detail.item.id}`;
    });
  </script>
</body>
</html>
```

**示例 2：紧凑型设置列表（默认模板 + mode=compact）**

```html
<af-list id="settings" mode="compact"></af-list>
<script>
  settings.data = [
    { title: '通知设置', subtitle: '已开启' },
    { title: '缓存', subtitle: '128MB' },
    { title: '关于', subtitle: 'v1.0.0' },
  ];
  // 未设置 renderItem → 用默认模板：title + subtitle
</script>
```

默认模板：

```javascript
defaultRender = (item, idx) => `
  <div class="list-item${this.mode === 'compact' ? '-compact' : ''}" data-list-index="${idx}">
    <div class="flex-1">
      <div class="body">${item.title || ''}</div>
      ${item.subtitle ? `<div class="subtitle">${item.subtitle}</div>` : ''}
    </div>
  </div>
`;
```

#### 9.1.9 与 L2 的协作

| L2 配方 | 用途 |
|---|---|
| `.list` | 根容器（背景/圆角/溢出裁剪/自动分隔线） |
| `.list-item` / `.list-item-compact` | 默认项 class，或用户自定义模板用 |
| `.divider` | 用户在 renderItem 中可选手动分隔（一般 `.list` 自动分隔已够） |
| `.thumb` / `.avatar` | 用户自定义模板中商品图/头像 |
| `.skeleton` / `.skeleton-line` | `loading=true` 时骨架屏占位 |
| `.empty` | 空状态显示容器（与 L2 `.empty` 语义一致） |
| `.tag` / `.tag-ok` / `.tag-warn` / `.tag-danger` | 用户自定义模板状态标签 |
| `.title` / `.subtitle` / `.body` / `.caption` / `.meta` / `.price` / `.price-del` | 用户自定义模板文本排版 |
| Flex 原子 `f`/`fc`/`aic`/`jcsb`/`jce`/`flex-1`/`w-full` | 用户自定义模板布局 |
| `p-*` / `m-*` / `g-*` | 用户自定义模板间距 |
| `t-*` / `t-b` / `t-m` | 用户自定义模板字号/字重 |

#### 9.1.10 体积拆分

| 部分 | gzip | 占比 | 主要开销 |
|---|---|---|---|
| 属性/特性映射（defineProp） | ~0.03KB | 6% | 基类内置 |
| 滚动监听 + 节流（16ms） | ~0.05KB | 10% | 原生 setTimeout |
| 虚拟滚动渲染算法（spacer + viewport render） | ~0.12KB | 24% | 核心计算 5 行 + innerHTML |
| 默认模板（normal/compact + 空态） | ~0.08KB | 16% | 3 段 HTML 字符串 |
| 下拉刷新（touchstart/touchmove/touchend + 阻尼） | ~0.10KB | 20% | 3 个监听 + 弹性高度 |
| 上拉加载（距底检测 + page 维护） | ~0.05KB | 10% | 距底判断 + endLoadMore |
| 事件委托 itemclick + 3 个 emit | ~0.05KB | 10% | closest + dataset.listIndex |
| ARIA（aria-busy/aria-label 更新） | ~0.02KB | 4% | loading 切换时设 |
| **JS 合计** | **~0.50KB** | **100%** | 符合 1.4 节 0.5KB 预算 |
| **CSS** | **0** | — | Light DOM，纯 L2 配方 |

**体积风险点与优化**：
- `renderItem` 用户自定义函数过长 → 不占 af-list 本身体积（用户代码单独算）
- 下拉刷新若需弹簧回弹动画 → 用 CSS transition 加高度变化，不增 JS 开销
- 项高动态（不等高）→ 算法会膨胀 0.1-0.2KB，MVP 固定高度先落地，不等高作为 v1.1 增强（whitelist v2）

---

### 9.2 af-swiper 详设（P0 · 轮播/滑动卡片）

#### 9.2.1 概述

| 项 | 内容 |
|---|---|
| 职责 | 横向滑动切换内容卡片：(a) touch 拖拽 + 释放回弹/吸附；(b) 自动播放（可选）；(c) 循环模式（可选）；(d) 指示器 dots 与索引同步；(e) 切换完成触发 change 事件 |
| 解决场景 | 首页 banner 轮播、商品图片预览、卡片式导航、引导页——任何需要横向切换内容的场景 |
| L2 边界 | 单张图片 → 用 L2 `.card` 或 `<img>` 即可；多张需要滑动切换 → 用 af-swiper |
| 体积预算 | JS ~0.4KB gzip；CSS ~0.1KB gzip（Shadow DOM 内 track/slide/dots 样式） |

#### 9.2.2 DOM 模式：Shadow DOM（useShadow = true）

| 理由 | 说明 |
|---|---|
| 专属样式 | track 的 `transform` 动画、slide 的 `flex-shrink:0` + 固定宽度、dots 的圆形/激活态，都是 swiper 专属，不污染全局 |
| 视觉封装 | 用户只关心"放几个 slide 进去"，不关心 track/dots 结构 |
| 主题零代码 | Shadow 内 CSS 全用 `var(--*)`，token 穿透自动跟随 |
| 内容透传 | 用 `<slot>` 让用户放任意内容到每个 slide |

#### 9.2.3 属性 API

**attribute 列表**

| 属性名 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `active-index` | Number | `0` | 当前激活的 slide 索引（受控，双向：用户设 → 切换；用户滑动 → 更新） |
| `autoplay` | Number（ms） | `0` | 自动播放间隔，`0` = 关闭 |
| `loop` | Boolean | `false` | 是否循环（末尾→首、首→末） |
| `duration` | Number（ms） | `250` | 切换动画时长（对应 `--dur-base`，可覆盖） |
| `show-dots` | Boolean | `true` | 是否显示底部指示器 |
| `disabled` | Boolean | `false` | 禁用 touch 拖拽（仅自动播放/编程切换） |

**property 映射**

| 属性名 | 类型 | 说明 |
|---|---|---|
| `activeIndex` | `Number` | 当前索引（与 attribute `active-index` 双向同步） |
| `slideCount` | `Number`（只读） | slide 总数（slot 内子元素数量） |
| `goTo(index)` | `Function` | 编程跳转到指定索引 |
| `next()` | `Function` | 下一张 |
| `prev()` | `Function` | 上一张 |

#### 9.2.4 DOM 结构（Shadow DOM）

```
<af-swiper>
  #shadowRoot
  ├─ <style>                           ← Shadow CSS（全用 token）
  │     :host { display: block; overflow: hidden; }
  │     .track { display: flex; transition: transform var(--dur-base) var(--ease-out); }
  │     .track.dragging { transition: none; }   ← 拖拽时禁用动画
  │     ::slotted(*) { flex-shrink: 0; width: 100%; }   ← 每个 slot 子元素 = 一个 slide
  │     .dots { display: flex; gap: var(--s-1); justify-content: center; padding: var(--s-2); }
  │     .dot { width: 8px; height: 8px; border-radius: var(--r-f);
  │            background: var(--c-border); transition: background var(--dur-fast) var(--ease-out); }
  │     .dot.active { background: var(--c-brand); }
  └─ <div class="viewport" part="viewport">
      ├─ <div class="track" part="track">
      │   └─ <slot></slot>             ← 用户的 slide 内容透传
      └─ <div class="dots" part="dots">
          ├─ <button class="dot active" role="tab" aria-selected="true" aria-label="第 1 张，共 N 张"></button>
          ├─ <button class="dot" role="tab" aria-selected="false"></button>
          └─ ...
```

**决策 D16（af-swiper）**：每个 slide 由用户直接放入 `<af-swiper>` 的 Light DOM 子元素（通过 `<slot>` 透传到 track），用户无需理解"slide 结构"——任意子元素自动成为一张 slide，`::slotted(*)` 统一设 `flex-shrink:0; width:100%`。

#### 9.2.5 算法

**算法 A：touch 拖拽（touchstart/touchmove/touchend）**

```
touchstart:
  startX = touches[0].clientX
  startY = touches[0].clientY        ← 用于判断水平/垂直方向
  track.classList.add('dragging')    ← 禁用 transition
  this._dragOffset = 0
  this._isHorizontal = null          ← 方向未定

touchmove:
  deltaX = currentX - startX
  deltaY = currentY - startY
  if (this._isHorizontal === null):
    // 首次 move 判定方向（避免抢占垂直滚动）
    this._isHorizontal = abs(deltaX) > abs(deltaY)
  if (!this._isHorizontal) return    ← 垂直滚动放行，不阻 page 滚
  
  preventDefault()                   ← 水平拖拽阻默认
  this._dragOffset = deltaX
  // 循环模式下边界弹性（首/末张往回拉有阻力）
  if (!loop):
    if (activeIndex === 0 && deltaX > 0) this._dragOffset = deltaX * 0.3
    if (activeIndex === slideCount-1 && deltaX < 0) this._dragOffset = deltaX * 0.3
  track.style.transform = `translateX(${-(activeIndex * width) + this._dragOffset}px)`

touchend:
  track.classList.remove('dragging')  ← 恢复 transition
  threshold = width * 0.2             ← 拖拽超 20% 切换
  if (this._dragOffset < -threshold):
    this.next()
  elif (this._dragOffset > threshold):
    this.prev()
  else:
    this.goTo(this.activeIndex)       ← 回弹到当前
```

**算法 B：goTo(index) 切换（核心）**

```
goTo(index):
  if (loop):
    index = (index + slideCount) % slideCount   ← 循环取模
  else:
    index = max(0, min(index, slideCount - 1))  ← 边界裁剪
  
  if (index === this.activeIndex) return
  
  this.activeIndex = index
  track.style.transform = `translateX(${-(index * width)}px)`   ← CSS transition 自动动画
  this._updateDots()
  this.setAttribute('active-index', index)   ← 同步 attribute
  this.emit('af-swiper:change', { index })
```

**算法 C：自动播放（autoplay > 0 时启用）**

```
mounted:
  if (autoplay > 0):
    this._autoplayTimer = setInterval(() => {
      this.next()   ← loop=false 时 next() 内部到末尾会停
    }, autoplay)

unmounted:
  clearInterval(this._autoplayTimer)

// 用户触摸时暂停，松手 2s 后恢复
touchstart: clearInterval(this._autoplayTimer)
touchend: setTimeout(() => { 重启 autoplay }, 2000)
```

**算法 D：尺寸响应（ResizeObserver + onThemeChange）**

```
mounted:
  this._resizeObserver = new ResizeObserver(() => this._onResize())
  this._resizeObserver.observe(this)

_onResize:
  width = this.offsetWidth
  track.style.transform = `translateX(${-(activeIndex * width)}px)`  ← 重算位移
  // 不需要重新渲染，只更新 transform

onThemeChange(theme):
  // 主题切换可能影响字体渲染（dark 模式字重稍粗），重算尺寸
  this._onResize()
```

#### 9.2.6 事件

| 事件名 | payload | 触发时机 |
|---|---|---|
| `af-swiper:change` | `{ index: number }` | 切换动画完成后触发（用 `transitionend` 事件，非立即） |

**注意**：`change` 事件在 `transitionend` 后触发而非 `goTo()` 调用时——避免拖拽过程中频繁触发。若用户需即时响应（如同步更新标题），可监听 `active-index` attribute 变化。

#### 9.2.7 ARIA 与键盘

| 项 | 内容 |
|---|---|
| `role="region"` | `<af-swiper>` 根 |
| `aria-label` | `aria-label="轮播图，共 ${slideCount} 张，当前第 ${activeIndex+1} 张"`（变化时更新） |
| dots `role="tab"` + `aria-selected` | 每个 dot 是 tab，当前激活的 `aria-selected="true"` |
| dots `aria-label` | `第 ${i+1} 张，共 ${slideCount} 张` |
| 键盘：←→ | 焦点在 swiper 上时，← 上一张，→ 下一张 |
| 键盘：Tab | 进入当前激活的 dot（dot 可聚焦） |
| 键盘：Enter/Space | 聚焦某 dot 时按 Enter/Space → 跳到该 slide |
| 键盘：Home/End | Home 跳首张，End 跳末张 |

**键盘处理**：监听 `keydown`，方向键调用 `prev()`/`next()`，Home/End 调用 `goTo(0)`/`goTo(slideCount-1)`。

#### 9.2.8 使用示例

**示例 1：首页 banner（自动播放 + 循环）**

```html
<!doctype html>
<html>
<head><link rel="stylesheet" href="/aiflow-ui.css"></head>
<body>
  <div class="page">
    <af-swiper id="banner" autoplay="3000" loop show-dots>
      <div class="card center" style="background:linear-gradient(135deg,#2563eb,#8b5cf6);color:#fff">
        <h2 class="title" style="color:#fff">新品上市</h2>
        <p class="subtitle" style="color:#fff">限时8折</p>
      </div>
      <div class="card center" style="background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff">
        <h2 class="title" style="color:#fff">会员日</h2>
        <p class="subtitle" style="color:#fff">双倍积分</p>
      </div>
      <div class="card center" style="background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff">
        <h2 class="title" style="color:#fff">秒杀场</h2>
        <p class="subtitle" style="color:#fff">10点开抢</p>
      </div>
    </af-swiper>
  </div>

  <script type="module">
    import { AfSwiper } from 'aiflow-ui';
    customElements.define('af-swiper', AfSwiper);

    banner.addEventListener('af-swiper:change', (e) => {
      console.log('切换到第', e.detail.index + 1, '张');
    });
  </script>
</body>
</html>
```

**注**：示例中 `style="background:linear-gradient..."` 用于 banner 专属渐变（非 token 化），实际项目应走 `recipes.project.css` 的 `.banner-gradient-*` 扩展；`color:#fff` 因 banner 内文字固定白色，可豁免或走项目扩展。

**示例 2：商品图片预览（无 dots，编程切换）**

```html
<af-swiper id="preview" show-dots="false">
  <img src="p1.jpg" alt="商品图1" class="w-full">
  <img src="p2.jpg" alt="商品图2" class="w-full">
  <img src="p3.jpg" alt="商品图3" class="w-full">
</af-swiper>

<div class="actions">
  <button class="btn btn-ghost" onclick="preview.prev()">上一张</button>
  <span class="body" id="counter">1 / 3</span>
  <button class="btn btn-ghost" onclick="preview.next()">下一张</button>
</div>

<script>
  preview.addEventListener('af-swiper:change', (e) => {
    counter.textContent = `${e.detail.index + 1} / ${preview.slideCount}`;
  });
</script>
```

#### 9.2.9 与 L2 的协作

由于 af-swiper 是 Shadow DOM，内部不直接用 L2 配方 class（class 不穿透 Shadow）。但用户的 slide 内容（通过 `<slot>` 透传）可用全部 L2 配方：

| 协作方式 | 说明 |
|---|---|
| slide 内容透传 | 用户在 `<af-swiper>` 内放 `.card`/`.page`/`.hero`/`<img class="w-full">` 等任意 L2 配方 |
| Shadow 内 CSS 用 token | track/dots 的 `transform`/`background`/`gap`/`border-radius` 全用 `var(--c-*)`/`var(--s-*)`/`var(--r-*)`/`var(--dur-*)`/`var(--ease-*)` |
| `::part()` 暴露 | `viewport`/`track`/`dots` 三个 part，用户可外部样式化（如 `af-swiper::part(dots) { bottom: 20px; }` 改 dots 位置） |
| 不复用 L2 配方 | Shadow 内 dot 不用 `.badge` 配方（虽然视觉类似），直接用 token 写——保持 Shadow 封装 |

#### 9.2.10 体积拆分

| 部分 | gzip | 占比 | 主要开销 |
|---|---|---|---|
| 属性/特性映射 | ~0.02KB | 5% | 基类内置 |
| Shadow CSS（track/dots/slot） | ~0.10KB | 20% | ~15 行 CSS 字符串 |
| touch 拖拽（3 监听 + 方向判定 + 阻尼） | ~0.12KB | 30% | touchstart/move/end + 水平/垂直判定 |
| goTo/next/prev 切换 + transform | ~0.05KB | 12% | 边界裁剪/循环取模 |
| 自动播放（setInterval + 暂停/恢复） | ~0.04KB | 10% | timer + touchend 延迟恢复 |
| ResizeObserver + onThemeChange 重算 | ~0.03KB | 8% | 尺寸变化时更新 transform |
| dots 渲染 + 激活态更新 | ~0.02KB | 5% | 动态生成 dot 按钮 |
| ARIA（aria-label 更新 + 键盘） | ~0.02KB | 5% | keydown ←→/Home/End |
| transitionend → emit change | ~0.01KB | 5% | 1 个监听 |
| **JS 合计** | **~0.41KB** | 100% | 略超 0.4KB 预算 0.01KB，可接受 |
| **CSS 合计** | **~0.10KB** | — | 符合 0.1KB 预算 |
| **总计** | **~0.51KB** | — | 符合 1.4 节 0.5KB 预算 |

**体积风险点与优化**：
- touch 方向判定（水平/垂直）是必要开销——不加会导致 swiper 抢占垂直滚动，体验差
- 循环模式取模算法 ~0.02KB，若砍掉 loop 属性可省，但 loop 是高频需求，保留
- 若需"淡入淡出"等其他动画模式 → 走 v1.1 扩展，MVP 只做滑动

---

## 设计决策索引

| # | 决策 | 所在节 |
|---|---|---|
| D1 | L3 用原生 Web Components（Custom Elements），不用 Lit/Stencil | 2.1 |
| D2 | AfElement 基类：5 生命周期钩子 + 主题订阅 + defineProp + emit | 2.2 |
| D3 | 注册机制：导出类 + 用户显式 `customElements.define`（不自动注册） | 2.3 |
| D4 | JS 与 CSS 不分离文件：Light 零 CSS，Shadow CSS 嵌入 JS 字符串 | 2.4 |
| D5 | mounted 一次性 + unmounted 资源清理清单 + 属性特性双向同步防循环 | 3.1 / 3.2 / 3.4 |
| D6 | CSS 混合方案：6 Light + 4 Shadow | 4.1 / 4.2 |
| D7 | 单向数据流：属性输入、事件输出，组件不直接改自身 attribute | 6.4 |
| D8 | `package.json` 设 `sideEffects: false` + ESM 命名导出 Tree Shake | 8.1 |
| D9 | 组件文件无顶层副作用（不自动 `customElements.define`） | 8.1 |
| D10 | Shadow CSS 嵌入 JS 字符串（不 import CSS 文件） | 8.2 |
| D11 | af-picker 用 CSS `scroll-snap` 代替 JS 惯性算法（省 0.3KB） | 1.4 / 8.3 |
| D12 | af-toast 模块级单例（不排队，新替旧） | 8.4 |
| D13 | ARIA：af-tabs roving tabindex + af-dialog 焦点陷阱 + aria-live=polite | 7.3 / 7.4 / 7.5 |
| D14 | 组件清单 10 个三优先级（P0:4/P1:3/P2:3），不纳表单验证/抽屉 | 1.2 / 1.3 |
| D15 | af-list 以 `renderItem` 函数为主定制方式（非 slot），HTML 字符串拼接零依赖 | 9.1.3 |
| D16 | af-swiper slide 由 `<slot>` 透传，`::slotted(*)` 统一设 flex-shrink:0 + width:100% | 9.2.4 |
