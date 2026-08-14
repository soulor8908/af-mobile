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
- [9. 组件逐个详设](#9-组件逐个详设)
- [设计决策索引](#设计决策索引)

---

## 0. 概述与范围

### 0.1 L3 在分层中的定位

| 层 | 内容 | 形态 | 体积预算 | Tree Shaking |
|---|---|---|---|---|
| L1 | Token 变量 + reset + base | 静态 CSS | ~0.8KB gzip | 不适用 |
| L2 | 配方类（52）+ 原子类（52） | 静态 CSS | ~2.7KB gzip | 不适用（全量引入） |
| **L3** | **真组件（10 个 af-* WC）** | **ESM JS + Shadow/Light CSS** | **~10KB gzip** | **支持** |

L3 = 必须 JS 才能实现的交互组件。L2 配方可覆盖的静态场景一律不上 L3。

### 0.2 设计目标

1. **原生优先**：纯 Web Components（Custom Elements + Shadow DOM），零 Lit/Stencil 运行时
2. **体积可控**：10 组件合计 ~10KB gzip（含完整 ARIA/键盘/虚拟滚动，详见 §1.4 预算修订说明），单组件 ~1KB 平均
3. **主题零代码**：Shadow 内直接引用 L1 token（CSS 变量穿透），自动跟随主题切换
4. **无障碍合规**：WCAG 2.1 AA + WAI-ARIA 1.2，键盘可达 + 状态暴露

### 0.3 与 L1/L2 的关系

```
L3 组件
├─ Light DOM 组件（7 个）：innerHTML 直接用 L2 配方 class
│     └─ 配方 class 引用 L1 token（自动继承，零额外代码）
└─ Shadow DOM 组件（3 个）：Shadow <style> 内 var(--c-*) 引用 L1 token
      └─ CSS 变量穿透 Shadow 边界，自动跟随主题
```

---

## 1. 组件清单与优先级

### 1.1 推断依据

- RFC 14.2 L3 JS 总预算 ~3KB gzip（初版假设，实现阶段按 §1.4 修订为 ~10KB，因 a11y/虚拟滚动等功能不可压缩）
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

> 预算修订说明：初版按 RFC 3KB 总预算自上而下摊派，单组件 0.1–0.5KB。实现阶段发现该预算与 §1.2 强制的 WCAG 2.1 AA / WAI-ARIA、虚拟滚动、焦点陷阱、scroll-snap 等不可兼得——0.3KB gzip 不足以容纳一个带 ARIA + 键盘导航的 Custom Element 类壳。遂按 esbuild minify + gzip 实测值修订（各值 = 实测 + ~10% 余量），保留全部无障碍功能。详见 §8.5。

| 组件 | gzip（JS） | 预算 | 备注 |
|---|---|---|---|
| `af-list` | 2.35KB | 2.6KB | 虚拟滚动 + 下拉刷新 + 上拉加载 + 事件委托 |
| `af-swiper` | 2.51KB | 2.6KB | touch + transform + dots + 键盘 + ResizeObserver（Shadow DOM） |
| `af-tabs` | 1.42KB | 2.6KB | ARIA tablist + roving tabindex + 内容联动 |
| `af-dialog` | 1.76KB | 2.6KB | 原生 dialog + 焦点陷阱 + Esc/backdrop（Shadow DOM） |
| `af-toast` | 0.52KB | 2.6KB | 单例 + aria-live |
| `af-action-sheet` | 1.42KB | 2.6KB | popover 封装；Light DOM |
| `af-picker` | 2.57KB | 2.6KB | 多列 + CSS scroll-snap + 键盘 + 联动（Shadow DOM） |
| `af-dropdown` | 1.39KB | 2.6KB | popover 封装；Light DOM |
| `af-img` | 0.97KB | 2.6KB | IntersectionObserver 懒加载；Light DOM |
| `af-backtop` | 0.80KB | 2.6KB | 滚动监听 + 平滑滚动 |
| `af-switch` | 0.64KB | 2.6KB | 开关；Light DOM |
| `af-search-bar` | 0.99KB | 2.6KB | 搜索输入 + 防抖 + 清除；Light DOM |
| `af-skeleton-page` | 0.43KB | 2.6KB | 纯 CSS 骨架屏；Light DOM |
| `af-upload` | 1.25KB | 2.6KB | 文件选择 / 预览 / 校验；Light DOM |
| `af-navbar` | 0.66KB | 2.6KB | 顶部导航 + 返回；Light DOM |
| `af-tabbar` | 1.04KB | 2.6KB | 底部标签栏 + 路由联动；Light DOM |
| `af-stepper` | 0.96KB | 2.6KB | 步进器 + 边界；Light DOM |
| `af-field` | 1.14KB | 2.6KB | 表单字段 + 校验态；Light DOM |
| `af-pull-refresh` | 0.94KB | 2.6KB | 下拉刷新指示；Light DOM |
| `af-swipe-cell` | 0.89KB | 2.6KB | 滑动操作单元；Light DOM |
| **基类 AfElement** | 1.12KB | 1.2KB | 生命周期 + defineProp + 主题订阅 |
| **全量 bundle**（20 组件+基类，共享基类+gzip 交叉压缩） | 17.45KB | ≤ 19.5KB | CI `npm run size` 实测（详见 L4 §0.3 预算汇总） |

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
import { AfList, AfDialog } from '@af-mobile/ui';
customElements.define('af-list', AfList);
customElements.define('af-dialog', AfDialog);

// 方式 B：全量注册（便利，不 Tree Shake）
import { registerAll } from '@af-mobile/ui';
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
│   └── af-img.js              # Light DOM（D19：详设阶段由 Shadow 改 Light）
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

**未升级闪烁 / SSR 接管**：组件 `mounted()` 用 `innerHTML` 重建内部结构（非增量 hydrate）。SSR 预渲染的 Light DOM 子节点仅作首屏占位，upgrade 后被替换。对闪烁敏感可加 `style="visibility:hidden"` 占位，upgrade 后显隐。

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
| `af-img` | Light | 占位/失败态用 L2 `.thumb`/`.skeleton`/`.empty` 配方（D19：详设阶段由 Shadow 改 Light） |

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
├─ Light 组件（7 个）
│  └─ innerHTML 用 L2 配方 class
│     └─ 配方 class 引用 L1 token 变量（全局 CSS，自动继承）
└─ Shadow 组件（3 个）
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
用户：import { AfList, AfDialog } from '@af-mobile/ui'
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
- af-picker 实测 2.38KB（§1.4），scroll-snap 已是体积最优解

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
| 单组件（JS+CSS）gzip | ≤ 2.5KB | PR 阻断 |
| 基类 AfElement gzip | ≤ 0.8KB | PR 阻断 |
| 全部 10 组件 + 基类 gzip | ≤ 10.5KB | PR 阻断 |
| 按需引入 2 组件 gzip | ≤ 4.5KB | warn |

> 阈值已按实现阶段 esbuild minify + gzip 实测值校准（见 §1.4 修订说明）。脚本：`scripts/size-check.mjs`，用 esbuild 打包+minify、Node 原生 `zlib.gzipSync` 测量（无需 `gzip-size` 依赖）。

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
- [x] 9.3 `af-tabs` 详设（P0）
- [x] 9.4 `af-dialog` 详设（P0）
- [x] 9.5 `af-toast` 详设（P1）
- [x] 9.6 `af-action-sheet` 详设（P1）
- [x] 9.7 `af-picker` 详设（P1）
- [x] 9.8 `af-dropdown` 详设（P2）
- [x] 9.9 `af-img` 详设（P2）
- [x] 9.10 `af-backtop` 详设（P2）

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
    import { AfList } from '@af-mobile/ui';
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
    import { AfSwiper } from '@af-mobile/ui';
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

### 9.3 af-tabs 详设（P0 · 标签页切换）

#### 9.3.1 概述

| 项 | 内容 |
|---|---|
| 职责 | 标签页切换：(a) 选中态管理（同时只有一个激活）；(b) 内容区联动 show/hide；(c) WAI-ARIA tab 模式（roving tabindex + aria-selected/aria-controls/aria-labelledby）；(d) ←/→/Home/End 键盘导航 |
| 解决场景 | 商品详情「详情/评价/推荐」三段切换、订单「全部/待付/待发/已收」状态切换、个人中心 tab 导航——任何"一组互斥标签 + 对应内容区"的场景 |
| L2 边界 | 单条静态 tabbar（不需要切换内容）→ 用 L2 `.tabbar` + `.tab-item` 配方 + 手写 10 行 JS 即可；需要 ARIA 同步 / 键盘 / 内容联动 → 用 af-tabs |
| 体积预算 | JS ~0.3KB gzip；CSS 0（Light DOM，纯用 L2 配方） |

#### 9.3.2 DOM 模式：Light DOM（useShadow = false）

| 理由 | 说明 |
|---|---|
| 直接复用 L2 配方 | tabbar 用 `.tabbar`，tab 项用 `.tab-item`，内容区用 `.card`/`.page`，无专属视觉 |
| 内部无专属样式 | af-tabs 只负责"哪个 tab 激活、哪个 panel 显示、ARIA 同步"，视觉全靠 L2 |
| 主题零代码 | L2 配方已 token 化 |
| 内容透传 | Light DOM 下用户 panel 内容直接在原 DOM 中，可任意包含其他组件/配方 |

#### 9.3.3 属性 API

**attribute 列表**

| 属性名 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `tabs` | JSON String → Array | `"[]"` | tab 项配置 `[{label, value}]`；推荐用 property 赋值避免 JSON 序列化 |
| `active-index` | Number | `0` | 当前激活 tab 索引（受控，双向：用户设 → 切换；用户点 → 更新） |
| `variant` | `default`/`pills`/`underline` | `default` | 视觉变体；`default` 用 `.tabbar` 配方，`pills`/`underline` 由项目 `recipes.project.css` 扩展类配合 |
| `fixed` | Boolean | `false` | 是否吸顶（叠加 `.tabbar-fixed` 配方） |
| `aria-label` | String | `"标签页"` | tablist 容器的 aria-label，可访问性必需 |

**property 映射**

| 属性名 | 类型 | 说明 |
|---|---|---|
| `tabs` | `Array<{label:String, value:any, disabled?:Boolean}>` | tab 数组；property 赋值不走 JSON.stringify |
| `activeIndex` | `Number` | 当前激活索引（与 attribute `active-index` 双向同步） |
| `renderPanel` | `(tab, index) => string` | **核心**：自定义每个面板渲染（返回 HTML 字符串）。未设时用 `<slot>` 透传——用户可在 `<af-tabs>` 内放 `<div slot="panel-0">`、`<div slot="panel-1">` 静态面板 |

**决策 D17（af-tabs）**：双模式 panel 渲染——(a) `renderPanel` 函数动态渲染（数据驱动场景，如订单列表分 tab 加载）；(b) `<slot name="panel-N">` 静态透传（结构固定场景，如商品详情三段静态内容）。两者都未设时退化为"只切换 tab 高亮，不切内容"（外部监听 `af-tabs:change` 自行处理）。

#### 9.3.4 DOM 结构（Light DOM）

**模式 A：renderPanel 函数驱动**

```
<af-tabs>
  └─ .tabbar[.tabbar-fixed]                   ← L2 配方容器（role="tablist"）
      ├─ button.tab-item[aria-selected=true][tabindex=0]   tab 0
      ├─ button.tab-item[aria-selected=false][tabindex=-1] tab 1
      └─ button.tab-item[aria-selected=false][tabindex=-1] tab 2
  └─ .af-tabs-panel-container                 ← 内容区容器
      └─ div[role="tabpanel"][aria-labelledby=...][hidden=false]  panel 0（renderPanel(tab,0)）
      └─ div[role="tabpanel"][hidden=true]                      panel 1（renderPanel(tab,1)）
      └─ div[role="tabpanel"][hidden=true]                      panel 2
```

**模式 B：slot 静态透传**

```html
<af-tabs tabs='[{label:"详情"},{label:"评价"}]'>
  <div slot="panel-0" class="card">
    <p class="body">详情内容…</p>
  </div>
  <div slot="panel-1" class="card">
    <p class="body">评价内容…</p>
  </div>
</af-tabs>
```

panel-N 的 `slot` 属性与 `activeIndex` 联动：激活的 panel 不设 `hidden`，其他设 `hidden`。

#### 9.3.5 算法

**算法 A：setActive(idx) —— 核心切换**

```
setActive(idx):
  if (idx === this.activeIndex) return
  if (idx < 0 || idx >= this.tabs.length) return
  if (this.tabs[idx].disabled) return        ← 禁用项跳过（可由外部 ArrowRight 时不前进）

  this.activeIndex = idx
  this.setAttribute('active-index', idx)     ← 同步 attribute

  this.$$('.tab-item').forEach((tab, i) => {
    const selected = i === idx
    tab.setAttribute('aria-selected', String(selected))
    tab.setAttribute('tabindex', selected ? '0' : '-1')   ← roving tabindex
    tab.classList.toggle('active', selected)               ← 兼容 L2 .tab-item.active 样式
  })

  this.$$('.af-tabs-panel').forEach((panel, i) => {
    panel.hidden = i !== idx
  })

  this.emit('af-tabs:change', { index: idx, value: this.tabs[idx].value })
```

**算法 B：键盘导航（roving tabindex，详见 7.3 节范例）**

```
handleKeydown(e):
  const tabs = this.$$('.tab-item:not([disabled])')
  let idx = this.activeIndex
  switch (e.key):
    case 'ArrowRight': idx = (idx + 1) % tabs.length
    case 'ArrowLeft':  idx = (idx - 1 + tabs.length) % tabs.length
    case 'Home':       idx = 0
    case 'End':        idx = tabs.length - 1
    default: return
  e.preventDefault()
  this.setActive(idx)
  tabs[idx].focus()                          ← 焦点跟随（roving tabindex 核心）
```

**算法 C：slot 静态 panel 同步**

```
mounted:
  this._slottedPanels = this.$$('div[slot^="panel-"]')
  // 每次 setActive 时：
  this._slottedPanels.forEach((panel, i) => {
    panel.hidden = i !== this.activeIndex
  })
```

若同时存在 `renderPanel` 与 slot，**renderPanel 优先**（slot 内容作为兜底显示）。两者都无 → 仅切 tab 不切 panel。

#### 9.3.6 事件

| 事件名 | payload | 触发时机 |
|---|---|---|
| `af-tabs:change` | `{ index: number, value: any }` | 用户点击 tab 或键盘 ←/→/Home/End 触发切换后。value 取自 `tabs[idx].value`，未设 value 时 fallback 为 idx |

#### 9.3.7 ARIA 与键盘

| 项 | 内容 |
|---|---|
| `role="tablist"` | `.tabbar` 容器 |
| `role="tab"` | 每个 `.tab-item`（用户已写 button，原生无 role=tab，组件补） |
| `aria-selected` | 当前激活 tab 设 `true`，其他 `false` |
| `tabindex` | 激活 tab `tabindex=0`，其他 `tabindex=-1`（roving tabindex） |
| `aria-controls` | 每个 tab 指向对应 panel 的 `id`（如 `tab-0` ↔ `panel-0`） |
| `aria-labelledby` | 每个 panel 反向指向对应 tab 的 `id` |
| `role="tabpanel"` | 每个 panel |
| `aria-label` | tablist 容器（用户在 af-tabs 上设，组件透传到 tabbar） |
| 键盘 ←/→ | 切换 tab + 焦点跟随 |
| 键盘 Home/End | 跳到首/末 tab |
| 键盘 Tab | 离开 tablist 进入当前 panel（标准 tab 模式行为） |
| 键盘 Enter/Space | tab 已聚焦时点击切换（与 click 等价，原生 button 自带，无需额外处理） |

#### 9.3.8 使用示例

**示例 1：订单状态切换（renderPanel 数据驱动）**

```html
<!doctype html>
<html>
<head><link rel="stylesheet" href="/aiflow-ui.css"></head>
<body>
  <div class="page">
    <af-tabs id="orders" fixed aria-label="订单状态"></af-tabs>
  </div>

  <script type="module">
    import { AfTabs } from '@af-mobile/ui';
    customElements.define('af-tabs', AfTabs);

    const ordersByStatus = {
      all:    [{id:1,title:'订单1'},{id:2,title:'订单2'}],
      unpaid: [{id:1,title:'订单1'}],
      shipped:[{id:2,title:'订单2'}],
    };

    orders.tabs = [
      {label:'全部',   value:'all'},
      {label:'待付款', value:'unpaid'},
      {label:'已发货', value:'shipped'},
    ];

    orders.renderPanel = (tab, idx) => `
      <div class="list">
        ${(ordersByStatus[tab.value] || []).map(o => `
          <div class="list-item">
            <div class="flex-1">
              <div class="body">${o.title}</div>
              <div class="caption">订单号 ${o.id}</div>
            </div>
            <span class="tag tag-warn">${tab.label}</span>
          </div>
        `).join('') || '<div class="empty"><p class="body">暂无订单</p></div>'}
      </div>
    `;

    orders.addEventListener('af-tabs:change', (e) => {
      console.log('切换到', e.detail.value);
    });
  </script>
</body>
</html>
```

**示例 2：商品详情（slot 静态 panel）**

```html
<af-tabs tabs='[{label:"详情"},{label:"评价"},{label:"推荐"}]'>
  <div slot="panel-0" class="card">
    <p class="body">这是商品详情正文…</p>
  </div>
  <div slot="panel-1" class="card">
    <div class="list-item">
      <img class="avatar" src="u1.jpg">
      <div class="flex-1">
        <div class="body">用户A：很满意</div>
        <div class="caption">2 天前</div>
      </div>
    </div>
  </div>
  <div slot="panel-2" class="card">
    <p class="body">相关推荐商品…</p>
  </div>
</af-tabs>
```

#### 9.3.9 与 L2 的协作

| L2 配方 | 用途 |
|---|---|
| `.tabbar` | tab 容器（背景/shadow）；用户在 af-tabs 上设 `fixed` 属性时叠加 `.tabbar-fixed` |
| `.tab-item` | 单个 tab 项；组件自动管理 `.active` class 与 `aria-selected` |
| `.card` / `.page` | 用户在 `renderPanel` 内或 `<div slot="panel-N">` 内作为 panel 容器 |
| `.list` / `.list-item` / `.empty` | panel 内列表内容（见示例 1） |
| `.tag` / `.tag-warn` 等 | tab 内或 panel 内的状态标签 |

**与 L2 禁区**（L3 §5.3）：用户**不应**在 af-tabs 内手动设 `.tab-item` 的 `aria-selected` 或 `tabindex`——组件自动管理，手动设会被覆盖。如需自定义 tab 视觉（如带图标），在 `tabs` property 里给 `label` 字段传 HTML 字符串（如 `label: '<img src="i.svg" width="20"> 详情'`）。

#### 9.3.10 体积拆分

| 部分 | gzip | 占比 | 主要开销 |
|---|---|---|---|
| 属性/特性映射 | ~0.02KB | 7% | 基类内置 |
| tabs 数据 → DOM 渲染（tabbar + tab-item 数组生成） | ~0.06KB | 20% | innerHTML 模板字符串 |
| setActive 切换（aria/tabindex/class/hidden 同步） | ~0.07KB | 23% | 5 行 forEach + setAttribute |
| 键盘 keydown（←/→/Home/End + 焦点跟随） | ~0.05KB | 17% | switch + preventDefault |
| renderPanel / slot 双模式 panel 切换 | ~0.05KB | 17% | querySelectorAll + hidden toggle |
| click 事件委托（在 tabbar 上单监听） | ~0.02KB | 6% | closest('.tab-item') |
| ARIA：id 关联（aria-controls/aria-labelledby） | ~0.02KB | 7% | 字符串拼接 id |
| emit change | ~0.01KB | 3% | 基类内置 |
| **JS 合计** | **~0.30KB** | **100%** | 符合 1.4 节 0.3KB 预算 |
| **CSS** | **0** | — | Light DOM，纯 L2 配方 |

**体积风险点与优化**：
- 双模式 panel（renderPanel + slot）会略增 ~0.03KB——保留是因 slot 模式零 JS 渲染、对静态场景更友好，是 ARIA 合规的"开箱即用"路径
- 若未来支持"swipe 切 tab"手势 → 走 v1.1 扩展，MVP 不纳入（YAGNI，tab 与 swiper 视觉重叠）
- variant=pills/underline 不在本组件实现 CSS，由 `recipes.project.css` 配合（避免组件内置 CSS 字符串违反 Light DOM 零 CSS 原则）

---

### 9.4 af-dialog 详设（P0 · 模态框）

#### 9.4.1 概述

| 项 | 内容 |
|---|---|
| 职责 | 模态对话框：(a) 基于 `<dialog>` 原生 API（showModal/close）；(b) 焦点陷阱（Tab 不逃出）；(c) Esc 关闭 + backdrop 点击关闭（可配置）；(d) 关闭后焦点还原到触发元素；(e) 内容透传（header/body/footer slot） |
| 解决场景 | 重要操作确认（删除/支付/退出登录）、表单弹层（编辑地址/反馈）、信息展示（活动规则/版本说明）——任何需要打断用户流程的模态交互 |
| L2 边界 | 非模态弹层（无遮罩、不抢焦点）→ 用 L2 `.sheet` + 原生 `popover`；需模态 + 焦点陷阱 + Esc → 用 af-dialog |
| 体积预算 | JS ~0.2KB gzip；CSS ~0.1KB gzip（Shadow DOM 内 dialog/backdrop/footer 专属样式） |

#### 9.4.2 DOM 模式：Shadow DOM（useShadow = true）

| 理由 | 说明 |
|---|---|
| 专属样式 | `<dialog>` 的圆角/阴影/max-width、backdrop 半透明遮罩、header/footer 分隔线都是 dialog 专属，不污染全局 |
| 原生 `<dialog>` 封装 | Shadow 内 `<dialog>` 与外部样式隔离，避免外部 CSS 误改 dialog 视觉 |
| 内容透传 | header/body/footer 三个 `<slot>` 让用户放任意内容 |
| 主题零代码 | Shadow 内 CSS 全用 `var(--*)`，token 穿透自动跟随（backdrop 例外，详见 4.4） |

#### 9.4.3 属性 API

**attribute 列表**

| 属性名 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `open` | Boolean | `false` | 是否打开（受控；用户设 → open()，关闭 → close()） |
| `title` | String | `""` | 标题（透传到 `<header>` 内 `.title` 配方） |
| `close-on-esc` | Boolean | `true` | 是否允许 Esc 关闭 |
| `close-on-backdrop` | Boolean | `true` | 是否允许点击 backdrop 关闭 |
| `variant` | `default`/`center`/`bottom` | `default` | 视觉变体：`default` 居中（`max-width:90vw`），`bottom` 底部 sheet 样式（圆角顶部 + 贴底），`center` 紧凑居中 |

**property 映射**

| 属性名 | 类型 | 说明 |
|---|---|---|
| `open` | `Boolean` | 与 attribute 双向同步 |
| `returnValue` | `any` | close(action) 时存入，供 af-dialog:close 事件 payload 用 |
| `open()` | `Function` | 打开对话框（内部调 `dialog.showModal()`） |
| `close(action)` | `Function` | 关闭对话框；action 透传到 `af-dialog:close` 事件 payload |

**决策 D18（af-dialog）**：基于原生 `<dialog>` + `showModal()` API，不手写遮罩/focus trap CSS。原生 API 已内置：(a) backdrop（::backdrop 伪元素）；(b) Esc 关闭（默认行为，可通过 `close-on-esc=false` 禁用）；(c) 顶层堆叠（top-layer，无需 z-index 管理）；(d) 焦点陷阱（浏览器原生实现，Tab 不逃出）。手写焦点陷阱仅在禁用 Esc 或需自定义 focus 顺序时补强。

#### 9.4.4 DOM 结构（Shadow DOM）

```
<af-dialog>
  #shadowRoot
  ├─ <style>                           ← Shadow CSS（全用 token，backdrop 例外）
  │     :host { display: contents; }
  │     dialog { border:none; border-radius:var(--r-l); background:var(--c-card);
  │               color:var(--c-text); padding:0; max-width:90vw;
  │               box-shadow:var(--shadow-lg); }
  │     dialog::backdrop { background:rgba(0,0,0,.5); }   ← 唯一硬编码
  │     header { padding:var(--s-4); border-bottom:1px solid var(--c-border); }
  │     .title { font-size:var(--t-xl); font-weight:var(--fw-bold); }
  │     .close-btn { position:absolute; top:var(--s-2); right:var(--s-2);
  │                  background:none; border:none; color:var(--c-muted);
  │                  font-size:var(--t-lg); cursor:pointer; }
  │     .body { padding:var(--s-4); }
  │     footer { display:flex; gap:var(--s-2); padding:var(--s-3) var(--s-4);
  │              border-top:1px solid var(--c-border); }
  │     footer > .btn { flex:1; }
  │     :host([variant=bottom]) dialog { border-radius:var(--r-l) var(--r-l) 0 0;
  │                                       max-width:100vw; margin:auto 0 0 0;
  │                                       width:100%; }
  └─ <dialog part="dialog">
      ├─ <header part="header">
      │   ├─ <h2 class="title"><slot name="title">${title}</slot></h2>
      │   └─ <button class="close-btn" aria-label="关闭">×</button>
      ├─ <div class="body" part="content"><slot name="body"></slot></div>
      └─ <footer part="footer"><slot name="footer"></slot></footer>
```

#### 9.4.5 算法

**算法 A：open() 打开（含焦点管理）**

```
open():
  if (this._dialog.open) return
  this._previouslyFocused = document.activeElement    ← 记录触发元素
  this._dialog.showModal()                            ← 原生：进入 top-layer + 焦点陷阱
  // showModal 后默认焦点在 dialog，手动移到首个可聚焦元素
  this._focusFirst()
  this.setAttribute('open', '')
  this.emit('af-dialog:open', {})

_focusFirst():
  const focusable = this._getFocusable()
  if (focusable.length) focusable[0].focus()
  else this._dialog.focus()                            ← dialog 自身可聚焦（tabindex=-1 由组件设）
```

**算法 B：close(action) 关闭**

```
close(action):
  if (!this._dialog.open) return
  this.returnValue = action
  this._dialog.close(action)                          ← 原生 close，触发 close 事件
  this._previouslyFocused?.focus()                    ← 焦点还原
  this.removeAttribute('open')
  this.emit('af-dialog:close', { action })
```

**算法 C：Esc 与 backdrop 关闭（原生事件 + 自定义控制）**

```
mounted:
  this._dialog.addEventListener('cancel', (e) => {    ← dialog 的 Esc 事件
    if (!this.closeOnEsc) e.preventDefault()          ← close-on-esc=false 阻止
    else this.close('esc')                            ← 否则统一走 close()
  })

  this._dialog.addEventListener('click', (e) => {
    // backdrop 点击：dialog 元素的尺寸 === 视口（showModal 时），点击 dialog 自身即 backdrop
    if (this.closeOnBackdrop && e.target === this._dialog) {
      this.close('backdrop')
    }
  })
```

**算法 D：焦点陷阱补强（仅当原生不满足时）**

```
_getFocusable():
  return [...this.shadowRoot.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )].filter(el => !el.disabled && el.offsetParent !== null)

_trapKeydown(e):
  if (e.key !== 'Tab') return
  const focusable = this._getFocusable()
  if (!focusable.length) return
  const first = focusable[0], last = focusable[focusable.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault(); last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault(); first.focus()
  }
```

原生 `showModal()` 已实现焦点陷阱，但部分浏览器（旧版 Firefox/Safari）行为不一致——补强 `_trapKeydown` 作为兜底，仅在 `open()` 时绑定 `keydown`，`close()` 时移除。

#### 9.4.6 事件

| 事件名 | payload | 触发时机 |
|---|---|---|
| `af-dialog:open` | `{}` | open() 调用后，dialog 已显示 |
| `af-dialog:close` | `{ action: string }` | 任意关闭途径（Esc / backdrop / close() / 关闭按钮）。action 取值：`'esc'` / `'backdrop'` / 用户传入 close(action) 的字符串（如 `'confirm'`/`'cancel'`） |

#### 9.4.7 ARIA 与键盘

| 项 | 内容 |
|---|---|
| `<dialog>` 原生语义 | `<dialog>` 元素自带 `role="dialog"`（showModal 时为 `aria-modal="true"`，浏览器自动） |
| `aria-labelledby` | dialog 指向 header 内 `.title` 的 id（如 `dialog-labelledby="af-dialog-{id}-title"`） |
| `aria-label` | 若未设 title attribute，组件用 `aria-label="对话框"` 兜底 |
| 关闭按钮 | `aria-label="关闭"`（无可读文字，仅 `×` 符号） |
| 键盘 Esc | 关闭（close-on-esc=true 时） |
| 键盘 Tab | 焦点陷阱：在 dialog 内首个与末个可聚焦元素之间循环（原生 + 补强） |
| 焦点还原 | close() 后焦点回到 open() 前的 `document.activeElement` |

#### 9.4.8 使用示例

**示例 1：删除确认对话框**

```html
<!doctype html>
<html>
<head><link rel="stylesheet" href="/aiflow-ui.css"></head>
<body>
  <button class="btn btn-danger" id="trigger">删除商品</button>

  <af-dialog id="confirm" title="确认删除" close-on-backdrop="false">
    <div slot="body">
      <p class="body">删除后不可恢复，确认删除该商品？</p>
    </div>
    <div slot="footer">
      <button class="btn btn-ghost" onclick="confirm.close('cancel')">取消</button>
      <button class="btn btn-danger" onclick="confirm.close('confirm')">删除</button>
    </div>
  </af-dialog>

  <script type="module">
    import { AfDialog } from '@af-mobile/ui';
    customElements.define('af-dialog', AfDialog);

    trigger.addEventListener('click', () => confirm.open());

    confirm.addEventListener('af-dialog:close', (e) => {
      if (e.detail.action === 'confirm') {
        fetch('/api/goods/1', { method: 'DELETE' });
      }
    });
  </script>
</body>
</html>
```

**示例 2：底部 sheet 式编辑面板（variant=bottom）**

```html
<af-dialog id="editor" variant="bottom" title="编辑地址" close-on-esc>
  <div slot="body">
    <div class="form-row">
      <label class="label" for="addr">详细地址</label>
      <textarea class="textarea" id="addr" placeholder="请输入地址"></textarea>
    </div>
  </div>
  <div slot="footer">
    <button class="btn btn-ghost" onclick="editor.close('cancel')">取消</button>
    <button class="btn" onclick="editor.close('save')">保存</button>
  </div>
</af-dialog>

<script>
  editor.addEventListener('af-dialog:close', async (e) => {
    if (e.detail.action === 'save') {
      await fetch('/api/address', { method:'POST', body: new FormData() });
    }
  });
</script>
```

#### 9.4.9 与 L2 的协作

由于 af-dialog 是 Shadow DOM，内部不直接用 L2 配方 class（class 不穿透 Shadow）。但用户在 slot 内放的内容（透传到 Shadow）可用全部 L2 配方：

| 协作方式 | 说明 |
|---|---|
| body/footer slot 内容透传 | 用户在 `<div slot="body">` 内放 `.form-row`/`.input`/`.list-item` 等任意 L2 配方 |
| Shadow 内 CSS 用 token | dialog/header/footer 的 `padding`/`background`/`border-radius`/`box-shadow` 全用 `var(--*)`；backdrop `rgba(0,0,0,.5)` 是 L1 无 mask token 的唯一例外 |
| footer 内按钮自动 flex-1 | Shadow CSS 设 `footer > .btn { flex:1 }`，用户放 L2 `.btn` 自动均分宽度 |
| `::part()` 暴露 | `dialog`/`header`/`content`/`footer` 四个 part，外部可样式化（如 `af-dialog::part(dialog) { max-width: 600px; }`） |
| 不复用 L2 配方 | Shadow 内 title 不用 `.title` 配方（视觉类似），直接用 token 写——保持 Shadow 封装 |

#### 9.4.10 体积拆分

| 部分 | gzip | 占比 | 主要开销 |
|---|---|---|---|
| 属性/特性映射 | ~0.02KB | 7% | 基类内置 |
| Shadow CSS（dialog/header/footer/variant） | ~0.10KB | 33% | ~20 行 CSS 字符串（含 variant=bottom 选择器） |
| open/close（showModal/close + 焦点记录/还原） | ~0.04KB | 13% | 5 行核心逻辑 |
| 焦点陷阱补强（_getFocusable + _trapKeydown） | ~0.05KB | 17% | querySelectorAll + Tab 边界判断 |
| Esc/backdrop 事件绑定（cancel + click 委托） | ~0.04KB | 13% | 2 个 addEventListener |
| slot 渲染（header/body/footer 三个 slot） | ~0.03KB | 10% | 模板字符串 |
| ARIA（aria-labelledby/aria-label 兜底） | ~0.02KB | 7% | setAttribute |
| **JS 合计** | **~0.20KB** | 67% | 符合 1.4 节 0.2KB 预算 |
| **CSS 合计** | **~0.10KB** | 33% | 符合 0.1KB 预算 |
| **总计** | **~0.30KB** | **100%** | 符合 1.4 节 0.3KB 预算 |

**体积风险点与优化**：
- 原生 `<dialog>` API 是体积最优解——若手写遮罩/焦点陷阱/z-index，体积会膨胀至 ~0.6KB
- variant=bottom 仅 ~0.02KB CSS（3 个属性），与 variant=center/default 共用 dialog 选择器
- 焦点陷阱补强是兼容性必要开销——Safari < 15.4 不支持 showModal 焦点陷阱，补强保证全平台一致

---

### 9.5 af-toast 详设（P1 · 轻提示）

#### 9.5.1 概述

| 项 | 内容 |
|---|---|
| 职责 | 全局轻提示：(a) 模块级单例（新 toast 替换旧 toast，不排队）；(b) 自动消失（默认 2s）；(c) `aria-live="polite"` 无障碍播报；(d) 显示/消失触发事件 |
| 解决场景 | "已保存"、"操作成功"、"网络错误"、"已加入购物车"——任何非阻塞的瞬时反馈 |
| L2 边界 | 单次静态提示（不需自动消失/不需单例管理）→ 用 L2 `.toast` 配方 + 手写 setTimeout；需单例/自动消失/aria-live → 用 af-toast |
| 体积预算 | JS ~0.2KB gzip；CSS 0（Light DOM，纯用 L2 `.toast` 配方） |

#### 9.5.2 DOM 模式：Light DOM（useShadow = false）

| 理由 | 说明 |
|---|---|
| 直接复用 L2 配方 | `.toast` 配方已定义视觉（fixed/居中/黑色背景/圆角/z-modal） |
| 内部无专属样式 | af-toast 只负责"单例管理 + 定时关闭 + aria-live"，视觉靠 L2 |
| 主题零代码 | L2 配方已 token 化 |
| 单例全局可见 | Light DOM 下 `position:fixed` 自动相对视口，不需要 Shadow 隔离 |

#### 9.5.3 属性 API

**attribute 列表**

| 属性名 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `duration` | Number（ms） | `2000` | 默认显示时长；调用 `show(message, duration)` 时可覆盖 |

**property / 方法映射**

| 名称 | 类型 | 说明 |
|---|---|---|
| `show(message, duration?)` | `Function` | 显示 toast；若已有 toast 显示中，立即替换；duration 不传则用 attribute 值 |
| `dismiss()` | `Function` | 立即关闭当前 toast |
| `message` | `String`（只读） | 当前显示的消息（dismiss 后清空） |

#### 9.5.4 DOM 结构（Light DOM）

```
<af-toast>
  └─ div.toast[role=status][aria-live=polite]    ← L2 配方 + 无障碍属性
      ${message}
```

未 show 时 `<af-toast>` 是空元素（无子节点），不占空间。show 时 innerHTML 注入 `.toast` 元素。

#### 9.5.5 算法

**算法 A：show（单例替换 + 定时关闭）**

```javascript
// 模块级单例变量
let instance = null;

show(message, duration = this.duration || 2000) {
  // 单例替换：若有其他 af-toast 实例正在显示，立即关闭它
  if (instance && instance !== this) instance.dismiss();
  instance = this;

  this._message = message;
  this.innerHTML = `<div class="toast" role="status" aria-live="polite">${message}</div>`;

  clearTimeout(this._timer);
  this._timer = setTimeout(() => this.dismiss(), duration);
}

dismiss() {
  if (!this._message) return;          ← 已是空状态，避免重复触发 dismiss 事件
  clearTimeout(this._timer);
  this.innerHTML = '';
  const msg = this._message;
  this._message = '';
  if (instance === this) instance = null;
  this.emit('af-toast:dismiss', { message: msg });
}
```

**算法 B：unmounted 清理**

```javascript
unmounted() {
  clearTimeout(this._timer);
  if (instance === this) instance = null;
}
```

元素从 DOM 移除时清定时器，避免 toast 已不在 DOM 还触发 dismiss。

#### 9.5.6 事件

| 事件名 | payload | 触发时机 |
|---|---|---|
| `af-toast:dismiss` | `{ message: string }` | toast 消失时（定时到期 / dismiss() 调用 / 被新 toast 替换） |

#### 9.5.7 ARIA 与键盘

| 项 | 内容 |
|---|---|
| `role="status"` | `.toast` 容器 |
| `aria-live="polite"` | 屏幕阅读器空闲时播报，不打断用户当前操作 |
| 不用 `aria-live="assertive"` | toast 是非紧急信息（紧急用 af-dialog） |
| 不需要键盘交互 | toast 不抢焦点（`pointer-events:none` 由 L2 `.toast` 配方设） |
| 不需要 Tab 进入 | 用户当前操作不被打断 |

#### 9.5.8 使用示例

**示例 1：全局单例 toast**

```html
<!doctype html>
<html>
<head><link rel="stylesheet" href="/aiflow-ui.css"></head>
<body>
  <af-toast id="toast" duration="1500"></af-toast>

  <button class="btn" onclick="toast.show('已保存')">保存</button>
  <button class="btn btn-ghost" onclick="toast.show('已加入购物车', 3000)">加入购物车</button>
  <button class="btn btn-danger" onclick="toast.show('网络错误')">触发错误</button>

  <script type="module">
    import { AfToast } from '@af-mobile/ui';
    customElements.define('af-toast', AfToast);

    toast.addEventListener('af-toast:dismiss', (e) => {
      console.log('提示消失:', e.detail.message);
    });
  </script>
</body>
</html>
```

**示例 2：异步操作反馈**

```javascript
async function saveForm() {
  toast.show('保存中…', 60000);           // 长时间显示，避免提前消失
  try {
    await fetch('/api/save', { method: 'POST', body: new FormData(form) });
    toast.show('保存成功', 1500);
  } catch (e) {
    toast.show('保存失败：' + e.message, 3000);
  }
}
```

#### 9.5.9 与 L2 的协作

| L2 配方 | 用途 |
|---|---|
| `.toast` | af-toast 内部 innerHTML 唯一使用的 L2 配方（视觉 + z-modal + pointer-events:none） |

**与 L2 禁区**（L3 §5.3）：用户**不应**手动创建 `<div class="toast">` 元素——必须通过 `<af-toast>` 单例管理。手写 `.toast` + setTimeout 会破坏单例（多个 toast 重叠）且无 aria-live。L4 ESLint 规则 `prefer-component` 检测此场景并 warn。

#### 9.5.10 体积拆分

| 部分 | gzip | 占比 | 主要开销 |
|---|---|---|---|
| 属性/特性映射 | ~0.01KB | 5% | 基类内置 |
| 模块级单例变量 + 替换逻辑 | ~0.03KB | 15% | `let instance = null` + 3 行替换 |
| show（innerHTML + setTimeout） | ~0.05KB | 25% | 模板字符串 + setTimeout |
| dismiss（clearTimeout + 清空 + emit） | ~0.04KB | 20% | 5 行清理 |
| unmounted 资源清理 | ~0.02KB | 10% | clearTimeout + 单例复位 |
| ARIA（role=status + aria-live=polite） | ~0.02KB | 10% | innerHTML 模板内属性 |
| emit dismiss | ~0.01KB | 5% | 基类内置 |
| attribute duration 默认值 + 读取 | ~0.02KB | 10% | defineProp |
| **JS 合计** | **~0.20KB** | **100%** | 符合 1.4 节 0.2KB 预算 |
| **CSS** | **0** | — | Light DOM，纯 L2 配方 |

**体积风险点与优化**：
- 单例变量是模块级（不是实例字段），避免多实例时状态混乱，零额外开销
- 不排队（不维护消息队列）——队列会让体积膨胀至 ~0.5KB，YAGNI；新 toast 直接替换旧 toast 更符合移动端瞬时反馈语义
- 若需"成功/失败/警告"图标变体 → 走 v1.1 扩展（type 属性 + Shadow 重写），MVP 仅文字

---

### 9.6 af-action-sheet 详设（P1 · 底部操作面板）

#### 9.6.1 概述

| 项 | 内容 |
|---|---|
| 职责 | 底部操作面板：(a) 基于原生 `popover` API（showPopover/hidePopover）；(b) 选项列表（含 danger 变体）；(c) 取消按钮（可选）；(d) backdrop 点击关闭；(e) 选择后自动关闭并 emit |
| 解决场景 | "分享到微信/微博/QQ"、"操作菜单：编辑/删除/置顶"、"图片操作：保存/复制/取消"——任何从底部弹出的非模态选项菜单 |
| L2 边界 | 单一静态底部面板（无选项交互）→ 用 L2 `.sheet` + `popover`；需选项列表 + 选择回填 → 用 af-action-sheet |
| 体积预算 | JS ~0.1KB gzip；CSS 0（Light DOM，§4.2，见 9.6.10） |

#### 9.6.2 DOM 模式：Light DOM（useShadow = false）

| 理由 | 说明 |
|---|---|
| 直接复用 L2 配方 | `.sheet` 配方 + `.list-item`/`.list-item-compact` 配方，无专属视觉 |
| 原生 popover API | Light DOM 下 `popover` 属性可直接生效（Shadow 内 popover 亦可，但 Light 更简单） |
| 内部无专属样式 | af-action-sheet 只负责"选项渲染 + popover 控制 + 选择事件" |
| 主题零代码 | L2 配方已 token 化 |

#### 9.6.3 属性 API

**attribute 列表**

| 属性名 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `options` | JSON String → Array | `"[]"` | 选项配置 `[{label, value, danger?:Boolean, disabled?:Boolean}]` |
| `title` | String | `""` | 面板标题（显示在选项上方，可空） |
| `show-cancel` | Boolean | `true` | 是否显示"取消"按钮（默认在末尾） |
| `cancel-text` | String | `"取消"` | 取消按钮文案 |

**property / 方法映射**

| 名称 | 类型 | 说明 |
|---|---|---|
| `options` | `Array<{label, value, danger?, disabled?}>` | 选项数组；property 赋值不走 JSON.stringify |
| `showPopover()` | `Function` | 打开面板（原生 popover API） |
| `hidePopover()` | `Function` | 关闭面板 |

#### 9.6.4 DOM 结构（Light DOM）

```
<af-action-sheet>
  └─ div.sheet[popover]                          ← L2 配方 + 原生 popover 属性
      ├─ div.af-action-sheet-title               ← 标题（可选）
      │   ${title}
      ├─ div.list                                ← L2 配方容器（圆角/背景/分隔线）
      │   ├─ button.list-item                    ← 选项 0
      │   │   └─ span.flex-1 ${option.label}
      │   ├─ button.list-item.danger             ← 选项 1（danger=true）
      │   │   └─ span.flex-1.text-danger ${option.label}
      │   └─ button.list-item[disabled]          ← 选项 2（disabled=true）
      │       └─ span.flex-1.text-muted ${option.label}
      └─ button.btn.btn-ghost.btn-block          ← 取消按钮（show-cancel=true 时）
          ${cancelText}
```

#### 9.6.5 算法

**算法 A：showPopover / hidePopover**

```javascript
showPopover() {
  this._sheet.showPopover();                      // 原生 API，自动管理 backdrop + top-layer
  this.emit('af-action-sheet:open', {});
}

hidePopover() {
  this._sheet.hidePopover();
}
```

**算法 B：选项点击（事件委托 + 自动关闭）**

```javascript
mounted() {
  this.render();
  this._sheet.addEventListener('click', (e) => {
    const item = e.target.closest('.list-item');
    if (!item || item.disabled) return;
    const idx = Number(item.dataset.idx);
    const option = this.options[idx];
    this.hidePopover();
    this.emit('af-action-sheet:select', { index: idx, value: option.value });
    this.emit('af-action-sheet:close', {});
  });

  // 取消按钮
  this._cancelBtn?.addEventListener('click', () => {
    this.hidePopover();
    this.emit('af-action-sheet:close', {});
  });

  // backdrop 点击（popover API 触发 toggle 事件，light dismiss）
  this._sheet.addEventListener('toggle', (e) => {
    if (e.newState === 'closed' && !this._isSelecting) {
      this.emit('af-action-sheet:close', {});
    }
  });
}
```

**算法 C：options 变化时重渲染**

```javascript
onAttributeChange(name, oldVal, newVal) {
  if (name === 'options' || name === 'title' || name === 'show-cancel' || name === 'cancel-text') {
    this.render();
  }
}

render() {
  // 重新生成 innerHTML（含 .sheet 容器、.list 选项、取消按钮）
  // 不影响 popover 状态（已 open 时重渲染保持 open）
}
```

#### 9.6.6 事件

| 事件名 | payload | 触发时机 |
|---|---|---|
| `af-action-sheet:select` | `{ index: number, value: any }` | 用户点击某选项后（自动关闭前） |
| `af-action-sheet:close` | `{}` | 任意关闭途径（选项选择 / 取消按钮 / backdrop 点击 / hidePopover()） |
| `af-action-sheet:open` | `{}` | showPopover() 调用后 |

#### 9.6.7 ARIA 与键盘

| 项 | 内容 |
|---|---|
| `popover` 属性 | 原生 API 自动管理 `aria-expanded`/top-layer/焦点 |
| `.list-item` 用 `<button>` | 原生 button 自带键盘可达（Tab/Enter/Space） |
| `disabled` 选项 | 设 `disabled` 属性（原生 button 禁用，键盘跳过） |
| danger 选项 | 仅视觉（`.text-danger` + 字重），无 ARIA 标记（语义靠文案表达） |
| 标题 | `.af-action-sheet-title` 设 `role="heading"` + `aria-level="2"` |
| 键盘 Esc | popover API 原生支持（light dismiss） |

#### 9.6.8 使用示例

**示例 1：分享操作面板**

```html
<!doctype html>
<html>
<head><link rel="stylesheet" href="/aiflow-ui.css"></head>
<body>
  <button class="btn" id="shareBtn">分享</button>

  <af-action-sheet id="share" title="分享到">
  </af-action-sheet>

  <script type="module">
    import { AfActionSheet } from '@af-mobile/ui';
    customElements.define('af-action-sheet', AfActionSheet);

    share.options = [
      { label: '微信好友', value: 'wechat' },
      { label: '朋友圈',   value: 'moments' },
      { label: 'QQ',       value: 'qq' },
      { label: '复制链接', value: 'copy' },
    ];

    shareBtn.addEventListener('click', () => share.showPopover());

    share.addEventListener('af-action-sheet:select', (e) => {
      console.log('分享到:', e.detail.value);
    });
  </script>
</body>
</html>
```

**示例 2：含 danger 选项的操作菜单**

```html
<af-action-sheet id="actions" title="操作" cancel-text="取消">
</af-action-sheet>
<script>
  actions.options = [
    { label: '编辑',   value: 'edit' },
    { label: '置顶',   value: 'pin' },
    { label: '删除',   value: 'delete', danger: true },
  ];
  actions.addEventListener('af-action-sheet:select', (e) => {
    if (e.detail.value === 'delete') {
      // 二次确认走 af-dialog
    }
  });
</script>
```

#### 9.6.9 与 L2 的协作

| L2 配方 | 用途 |
|---|---|
| `.sheet` | 面板容器（fixed/底部/圆角顶部/阴影/z-dropdown）；叠加原生 `popover` 属性 |
| `.list` | 选项容器（圆角/背景/自动分隔线） |
| `.list-item` | 单个选项（用 `<button>` 而非 `<div>` 以获得原生键盘可达） |
| `.btn`/`.btn-ghost`/`.btn-block` | 取消按钮 |
| `.text-danger`/`.text-muted` | danger 选项红色 / disabled 选项灰色（原子类覆盖 list-item 文字色） |
| `.flex-1` | 选项内 label 撑满宽度 |

**与 L2 禁区**：用户**不应**手动设 `.list-item` 的 `disabled` 属性或 `.danger` 类——组件根据 `options` 数据自动管理。手动设会被下次 render 覆盖。

#### 9.6.10 体积拆分

| 部分 | gzip | 占比 | 主要开销 |
|---|---|---|---|
| 属性/特性映射 | ~0.01KB | 7% | 基类内置 |
| options → DOM 渲染（.sheet + .list + 选项 + 取消按钮） | ~0.04KB | 27% | innerHTML 模板字符串 |
| showPopover/hidePopover 封装 | ~0.02KB | 13% | 2 行原生 API 调用 |
| click 事件委托（选项 + 取消按钮） | ~0.03KB | 20% | closest + dataset.idx |
| toggle 事件监听（backdrop 关闭） | ~0.02KB | 13% | newState === 'closed' |
| emit（select/close/open 3 个事件） | ~0.02KB | 13% | 基类内置 |
| ARIA（标题 role=heading） | ~0.01KB | 7% | setAttribute |
| **JS 合计** | **~0.15KB** | **100%** | 略超 0.1KB 预算 0.05KB，可接受 |
| **CSS** | **0** | — | Light DOM，纯 L2 配方（§4.2 Light 分配，CSS 预算归零） |

**体积风险点与优化**：
- Light DOM 省去专属 CSS ~0.1KB（用 L2 `.sheet`/`.list-item` 配方覆盖视觉），JS 略增 0.05KB（事件委托 + render）——净省 0.05KB
- 不实现"选项图标"（如微信图标）——用户在 label 字段传 HTML 字符串（`label: '<img src="wechat.svg" width="20"> 微信好友'`）
- 若需"长按列表项触发 action-sheet" → 走 v1.1 扩展（contextmenu 事件），MVP 仅 click 触发

---

### 9.7 af-picker 详设（P1 · 滚轮选择器）

#### 9.7.1 概述

| 项 | 内容 |
|---|---|
| 职责 | 滚轮选择器：(a) 多列（省市区/年月日/时分）；(b) CSS `scroll-snap` 原生吸附（无 JS 惯性算法）；(c) 滚动停止后触发 change 事件；(d) 确认按钮触发 confirm 事件 |
| 解决场景 | 省市区选择、日期选择（年/月/日）、时间选择（时/分）、数量选择（1-100 件）——任何"滚轮式单列或多列选择"场景 |
| L2 边界 | 下拉单选 → 用 `af-dropdown` 或原生 `<select>`；滚轮式选择 → 用 af-picker |
| 体积预算 | JS ~0.3KB gzip；CSS ~0.1KB gzip（Shadow DOM 内 column/item/active 样式） |

#### 9.7.2 DOM 模式：Shadow DOM（useShadow = true）

| 理由 | 说明 |
|---|---|
| 专属样式 | column 的 `scroll-snap-type`/`height`、item 的固定高度/吸附对齐、active 项的高亮样式，都是 picker 专属 |
| 视觉封装 | 用户只关心"放几列数据进去"，不关心 column/item 结构 |
| 主题零代码 | Shadow 内 CSS 全用 `var(--*)`，token 穿透自动跟随 |
| 内容封闭 | picker 选项由数据驱动，不需 slot 透传用户内容 |

#### 9.7.3 属性 API

**attribute 列表**

| 属性名 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `columns` | JSON String → Array | `"[]"` | 多列数据 `[[{label,value},...], [{label,value},...], ...]` |
| `values` | JSON String → Array | `"[]"` | 当前各列选中值 `[v1, v2, v3]`（受控，双向） |
| `title` | String | `"请选择"` | 顶部标题 |
| `confirm-text` | String | `"确定"` | 确认按钮文案 |
| `cancel-text` | String | `"取消"` | 取消按钮文案 |
| `item-height` | Number（px） | `36` | 单项高度（影响 column 高度与吸附） |
| `visible-count` | Number（奇数） | `5` | 可见项数（column height = item-height * visible-count） |

**property / 方法映射**

| 名称 | 类型 | 说明 |
|---|---|---|
| `columns` | `Array<Array<{label, value}>>` | 多列数据；property 赋值不走 JSON.stringify |
| `values` | `Array<any>` | 当前各列选中值（与 attribute 双向同步） |
| `open()` | `Function` | 显示 picker（基于 `popover` API，底部 sheet 式） |
| `close()` | `Function` | 关闭 picker |

#### 9.7.4 DOM 结构（Shadow DOM）

```
<af-picker>
  #shadowRoot
  ├─ <style>                           ← Shadow CSS（scroll-snap 核心样式）
  │     :host { display: contents; }
  │     .picker { position: fixed; left:0; right:0; bottom:0;
  │               background: var(--c-card); border-radius: var(--r-l) var(--r-l) 0 0;
  │               box-shadow: var(--shadow-lg); z-index: var(--z-dropdown);
  │               padding-bottom: env(safe-area-inset-bottom); }
  │     .header { display:flex; justify-content: space-between;
  │               padding: var(--s-3) var(--s-4);
  │               border-bottom: 1px solid var(--c-border); }
  │     .btn-cancel { color: var(--c-muted); background:none; border:none;
  │                  font-size: var(--t-md); }
  │     .btn-confirm { color: var(--c-brand); background:none; border:none;
  │                   font-size: var(--t-md); font-weight: var(--fw-medium); }
  │     .columns { display: flex; height: calc(var(--t-md) * 5 * 1.25);
  │                position: relative; }
  │     .column { flex: 1; overflow-y: scroll; scroll-snap-type: y mandatory;
  │               scrollbar-width: none; }
  │     .column::-webkit-scrollbar { display: none; }
  │     .item { height: var(--t-md, 36px); line-height: 36px;
  │             scroll-snap-align: center; text-align: center;
  │             font-size: var(--t-md); color: var(--c-muted); }
  │     .item.active { color: var(--c-text); font-weight: var(--fw-bold); }
  │     .mask { position: absolute; left:0; right:0; pointer-events: none;
  │             background: linear-gradient(to bottom,
  │               var(--c-card) 0%, transparent 30%, transparent 70%,
  │               var(--c-card) 100%); }
  │     .indicator { position:absolute; left: var(--s-3); right: var(--s-3);
  │                  top: 50%; height: 36px; transform: translateY(-50%);
  │                  border-top: 1px solid var(--c-border);
  │                  border-bottom: 1px solid var(--c-border); }
  │     :host([hidden]) .picker { display: none; }
  └─ <div class="picker" part="picker" popover>
      ├─ <div class="header" part="header">
      │   ├─ <button class="btn-cancel" part="cancel">${cancelText}</button>
      │   ├─ <div class="title">${title}</div>
      │   └─ <button class="btn-confirm" part="confirm">${confirmText}</button>
      ├─ <div class="columns" part="columns">
      │   ├─ <div class="column" part="column" data-col="0">
      │   │   └─ <div class="item" data-idx="0">${label}</div> ×N
      │   ├─ <div class="column" part="column" data-col="1">
      │   │   └─ ...
      │   └─ .mask + .indicator                    ← 视觉装饰（选中行高亮边框）
```

#### 9.7.5 算法

**算法 A：CSS scroll-snap 吸附（零 JS 惯性）**

```css
/* Shadow CSS 核心样式 */
.column {
  overflow-y: scroll;
  scroll-snap-type: y mandatory;        /* 原生吸附：滚动停止后自动对齐到最近 item */
}
.item {
  scroll-snap-align: center;            /* 每个 item 的中心对齐到 column 中心 */
}
```

浏览器原生处理惯性滚动 + 吸附 + 减速曲线，零 JS 代码。这是体积优化的核心（D11）。

**算法 B：滚动停止后取选中项（scroll 事件 + 防抖）**

```javascript
mounted() {
  this._scrollers = this.$$('.column');
  this._scrollers.forEach((col, c) => {
    let scrollTimer;
    col.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => this._onColumnScrollEnd(c), 100);  // 滚动停止 100ms 后触发
    });
  });
}

_onColumnScrollEnd(colIdx) {
  const col = this._scrollers[colIdx];
  const itemHeight = 36;                              // 与 CSS 一致
  const idx = Math.round(col.scrollTop / itemHeight);
  const item = this.columns[colIdx][idx];
  if (!item) return;

  this.values[colIdx] = item.value;
  this.setAttribute('values', JSON.stringify(this.values));
  this._updateActive(colIdx, idx);
  this.emit('af-picker:change', { column: colIdx, value: item.value, index: idx });
}

_updateActive(colIdx, idx) {
  // 仅更新该列的 .item.active class（避免全列重渲染打断滚动）
  const items = this._scrollers[colIdx].querySelectorAll('.item');
  items.forEach((it, i) => it.classList.toggle('active', i === idx));
}
```

**算法 C：初始化时滚动到选中项**

```javascript
mounted() {
  this.render();
  // 等 DOM 渲染完，将每列滚动到 values 对应位置
  requestAnimationFrame(() => {
    this._scrollers.forEach((col, c) => {
      const idx = this._findIndex(c, this.values[c]);
      col.scrollTop = idx * 36;                       // 直接设 scrollTop，触发 scroll-snap 微调
      this._updateActive(c, idx);
    });
  });
}
```

**算法 D：确认 / 取消**

```javascript
mounted() {
  this.$('.btn-confirm').addEventListener('click', () => {
    this.emit('af-picker:confirm', { values: this.values });
    this.close();
  });
  this.$('.btn-cancel').addEventListener('click', () => {
    this.emit('af-picker:cancel', {});
    this.close();
  });
}

close() {
  this._picker.hidePopover();
}
```

#### 9.7.6 事件

| 事件名 | payload | 触发时机 |
|---|---|---|
| `af-picker:change` | `{ column: number, value: any, index: number }` | 某列滚动停止后（100ms 防抖后）。column 是列索引（0-based） |
| `af-picker:confirm` | `{ values: any[] }` | 用户点击确认按钮；values 是各列当前选中值数组 |
| `af-picker:cancel` | `{}` | 用户点击取消按钮 |

#### 9.7.7 ARIA 与键盘

| 项 | 内容 |
|---|---|
| `role="listbox"` | 每个 `.column` |
| `role="option"` | 每个 `.item` |
| `aria-activedescendant` | column 指向当前选中 item 的 id（屏幕阅读器播报选中项） |
| `aria-valuenow` | column 设当前选中 value |
| `aria-label` | column 设 `第 ${c+1} 列` |
| 键盘 ↑↓ | 聚焦某列时，↑/↓ 上下移动选中项（需 `tabindex="0"` 在 column 上） |
| 键盘 Tab | 在列之间切换 |
| 键盘 Enter | 等同确认按钮 |

**键盘处理**（MVP 可选，scroll-snap 已覆盖触摸场景）：

```javascript
col.addEventListener('keydown', (e) => {
  let idx = this._findIndex(c, this.values[c]);
  if (e.key === 'ArrowDown') idx = Math.min(idx + 1, this.columns[c].length - 1);
  else if (e.key === 'ArrowUp') idx = Math.max(idx - 1, 0);
  else return;
  e.preventDefault();
  col.scrollTop = idx * 36;                           // 触发 scroll-snap + scroll 事件
});
```

#### 9.7.8 使用示例

**示例 1：省市区三列选择**

```html
<!doctype html>
<html>
<head><link rel="stylesheet" href="/aiflow-ui.css"></head>
<body>
  <button class="btn" id="pick">选择地区</button>
  <span class="body" id="result">未选择</span>

  <af-picker id="region" title="选择地区"></af-picker>

  <script type="module">
    import { AfPicker } from '@af-mobile/ui';
    customElements.define('af-picker', AfPicker);

    region.columns = [
      [{label:'北京市',value:'110000'}, {label:'上海市',value:'310000'}, {label:'广东省',value:'440000'}],
      [{label:'北京市',value:'110100'}, {label:'上海市',value:'310100'}, {label:'广州市',value:'440100'}],
      [{label:'东城区',value:'110101'}, {label:'西城区',value:'110102'}, {label:'黄浦区',value:'310101'}],
    ];

    pick.addEventListener('click', () => region.open());

    region.addEventListener('af-picker:change', (e) => {
      // 联动：省变化时重新加载市/区列
      console.log(`第 ${e.detail.column + 1} 列选中:`, e.detail.value);
    });

    region.addEventListener('af-picker:confirm', (e) => {
      result.textContent = e.detail.values.join(' / ');
    });
  </script>
</body>
</html>
```

**示例 2：日期选择（年月日）**

```html
<af-picker id="date" title="选择日期"></af-picker>
<script>
  const year = Array.from({length: 30}, (_, i) => ({label: 2000+i+'年', value: 2000+i}));
  const month = Array.from({length: 12}, (_, i) => ({label: (i+1)+'月', value: i+1}));
  const day = Array.from({length: 31}, (_, i) => ({label: (i+1)+'日', value: i+1}));
  date.columns = [year, month, day];
  date.values = [2024, 1, 1];
</script>
```

#### 9.7.9 与 L2 的协作

由于 af-picker 是 Shadow DOM，内部不直接用 L2 配方 class。但用户在触发元素（如按钮）上可用 L2 配方：

| 协作方式 | 说明 |
|---|---|
| Shadow 内 CSS 用 token | column/item/header 的 `padding`/`background`/`border-radius`/`box-shadow`/`color`/`font-size` 全用 `var(--*)` |
| `::part()` 暴露 | `picker`/`header`/`column`/`item`/`confirm`/`cancel` 六个 part，外部可样式化 |
| 触发元素用 L2 | 用户在页面上用 `<button class="btn">` 触发 `picker.open()` |
| 结果显示用 L2 | 用户用 `.body`/`.subtitle` 显示选中结果（见示例 1 的 `#result`） |
| 不复用 L2 配方 | Shadow 内 confirm/cancel 按钮不用 `.btn` 配方（视觉类似但需独立样式），直接用 token 写 |

#### 9.7.10 体积拆分

| 部分 | gzip | 占比 | 主要开销 |
|---|---|---|---|
| 属性/特性映射 | ~0.02KB | 5% | 基类内置 |
| Shadow CSS（picker/column/item/mask/indicator/header） | ~0.15KB | 38% | ~30 行 CSS 字符串（scroll-snap + mask 渐变） |
| columns → DOM 渲染（多列 + 多 item） | ~0.06KB | 15% | 嵌套 map + innerHTML |
| scroll 事件 + 防抖（100ms）+ _onColumnScrollEnd | ~0.05KB | 13% | setTimeout + idx 计算 |
| _updateActive（单列 active class 切换） | ~0.02KB | 5% | querySelectorAll + toggle |
| 初始化滚动到选中项（requestAnimationFrame） | ~0.02KB | 5% | rAF + scrollTop 设置 |
| confirm/cancel 事件绑定 | ~0.02KB | 5% | 2 个 addEventListener |
| open/close（popover API 封装） | ~0.02KB | 5% | showPopover/hidePopover |
| ARIA（role=listbox/option + aria-activedescendant） | ~0.03KB | 8% | setAttribute |
| **JS 合计** | **~0.24KB** | 62% | 略低于 0.3KB 预算 |
| **CSS 合计** | **~0.15KB** | 38% | 略超 0.1KB 预算 0.05KB |
| **总计** | **~0.39KB** | **100%** | 略低于 0.4KB 预算（1.4 节） |

**体积风险点与优化**：
- CSS scroll-snap 是核心体积优化（D11）——若用 JS 惯性算法会增 ~0.3KB，总预算超标
- mask 渐变（顶部/底部淡出）与 indicator（选中行边框）是必要视觉，~0.03KB CSS
- 多列联动（省变化时重新加载市）由用户在外部 `af-picker:change` 事件中处理，不内置——避免组件内置联动逻辑导致体积膨胀
- 键盘 ↑↓ 处理是 MVP 可选项，若空间紧张可省（移动端触摸为主）

---

### 9.8 af-dropdown 详设（P2 · 下拉菜单）

#### 9.8.1 概述

| 项 | 内容 |
|---|---|
| 职责 | 下拉菜单：(a) 基于原生 `popover` API；(b) 触发器自动显示当前选中值；(c) 选项点击后回填到触发器并 emit；(d) backdrop 点击关闭 |
| 解决场景 | "排序：默认/价格/销量"、"筛选：全部/待付/已付"、表单中"性别：男/女/保密"——任何"触发器 + 选项列表"的单选场景 |
| L2 边界 | 原生 `<select>` 已能覆盖简单下拉 → 直接用 `<select class="input">`；需自定义选项视觉/触发器样式 → 用 af-dropdown |
| 体积预算 | JS ~0.1KB gzip；CSS 0（Light DOM，§4.2，见 9.8.10） |

#### 9.8.2 DOM 模式：Light DOM（useShadow = false）

| 理由 | 说明 |
|---|---|
| 直接复用 L2 配方 | 触发器用 `.input`（只读）或 `.btn`，选项列表用 `.list` + `.list-item`，无专属视觉 |
| 原生 popover API | Light DOM 下 `popover` 属性可直接生效 |
| 内部无专属样式 | af-dropdown 只负责"选项渲染 + popover 控制 + 选中回填" |
| 主题零代码 | L2 配方已 token 化 |

#### 9.8.3 属性 API

**attribute 列表**

| 属性名 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `options` | JSON String → Array | `"[]"` | 选项 `[{label, value, disabled?:Boolean}]` |
| `value` | String | `""` | 当前选中值（受控，双向） |
| `placeholder` | String | `"请选择"` | 未选中时触发器显示的占位文案 |
| `trigger-class` | String | `"input"` | 触发器使用的 L2 配方类（`"input"`/`"btn"`/`"btn-ghost"`） |
| `disabled` | Boolean | `false` | 禁用整个下拉 |

**property / 方法映射**

| 名称 | 类型 | 说明 |
|---|---|---|
| `options` | `Array<{label, value, disabled?}>` | 选项数组 |
| `value` | `any` | 当前选中值（与 attribute 双向同步） |
| `selectedLabel` | `String`（只读） | 当前选中项的 label（用于触发器显示） |
| `open()` / `close()` | `Function` | 编程控制显隐 |

#### 9.8.4 DOM 结构（Light DOM）

```
<af-dropdown>
  ├─ <button class="input" [disabled]>                ← 触发器（用户在 trigger-class 设配方类）
  │   └─ span.flex-1 ${selectedLabel || placeholder}
  │   └─ ▼                                            ← 下拉箭头（CSS ::after 或文字）
  └─ <div class="list" popover>                       ← L2 配方 + 原生 popover 属性
      ├─ <button.list-item[data-idx=0]>
      │   └─ span.flex-1 ${option.label}
      │   └─ ${selected ? '✓' : ''}                   ← 选中标记
      ├─ <button.list-item[disabled][data-idx=1]>
      └─ ...
```

#### 9.8.5 算法

**算法 A：触发器点击 → 显示选项**

```javascript
mounted() {
  this.render();
  this._trigger.addEventListener('click', () => {
    if (this.disabled) return;
    this._list.showPopover();
  });
}
```

**算法 B：选项点击 → 回填 + 关闭 + emit**

```javascript
this._list.addEventListener('click', (e) => {
  const item = e.target.closest('.list-item');
  if (!item || item.disabled) return;
  const idx = Number(item.dataset.idx);
  const option = this.options[idx];

  this.value = option.value;
  this.setAttribute('value', String(option.value));
  this._updateTrigger();
  this._list.hidePopover();
  this.emit('af-dropdown:select', { index: idx, value: option.value });
});

_updateTrigger() {
  const opt = this.options.find(o => o.value === this.value);
  this._trigger.querySelector('span.flex-1').textContent = opt?.label || this.placeholder;
}
```

**算法 C：popover 关闭事件**

```javascript
this._list.addEventListener('toggle', (e) => {
  if (e.newState === 'closed') {
    this.emit('af-dropdown:close', {});
  }
});
```

#### 9.8.6 事件

| 事件名 | payload | 触发时机 |
|---|---|---|
| `af-dropdown:select` | `{ index: number, value: any }` | 用户点击某选项后 |
| `af-dropdown:close` | `{}` | 任意关闭途径（选项选择 / backdrop / Esc / close()） |

#### 9.8.7 ARIA 与键盘

| 项 | 内容 |
|---|---|
| `role="combobox"` | 触发器 button（aria-haspopup="listbox"） |
| `aria-expanded` | 触发器，popover 显示时 `true`，隐藏时 `false` |
| `role="listbox"` | 选项列表 `.list` |
| `role="option"` | 每个 `.list-item` |
| `aria-selected` | 当前选中项 `true`，其他 `false` |
| `aria-disabled` | 禁用选项 `true` |
| 键盘 Enter/Space | 触发器聚焦时按 → 显示选项 |
| 键盘 ↑↓ | 选项列表内导航 |
| 键盘 Esc | 关闭（popover 原生支持） |

#### 9.8.8 使用示例

**示例 1：排序下拉**

```html
<!doctype html>
<html>
<head><link rel="stylesheet" href="/aiflow-ui.css"></head>
<body>
  <div class="form-row-h">
    <label class="label">排序</label>
    <af-dropdown id="sort" placeholder="默认排序"></af-dropdown>
  </div>

  <script type="module">
    import { AfDropdown } from '@af-mobile/ui';
    customElements.define('af-dropdown', AfDropdown);

    sort.options = [
      { label: '默认',   value: 'default' },
      { label: '价格升序', value: 'price_asc' },
      { label: '价格降序', value: 'price_desc' },
      { label: '销量',   value: 'sales' },
    ];

    sort.addEventListener('af-dropdown:select', (e) => {
      console.log('排序:', e.detail.value);
      // 触发列表重新加载
    });
  </script>
</body>
</html>
```

**示例 2：按钮触发器（带图标）**

```html
<af-dropdown id="filter" trigger-class="btn btn-ghost btn-sm" placeholder="筛选">
</af-dropdown>
<script>
  filter.options = [
    { label: '全部', value: 'all' },
    { label: '待付款', value: 'unpaid' },
    { label: '已付款', value: 'paid' },
  ];
</script>
```

#### 9.8.9 与 L2 的协作

| L2 配方 | 用途 |
|---|---|
| `.input` / `.btn` / `.btn-ghost` | 触发器（用户在 `trigger-class` 指定） |
| `.list` | 选项容器（圆角/背景/分隔线） |
| `.list-item` | 单个选项（用 `<button>` 获得原生键盘可达） |
| `.flex-1` | 触发器内文案撑满 + 选项内 label 撑满 |
| `.text-muted` | placeholder 文案灰色 |

**与 L2 禁区**：用户**不应**在 `<af-dropdown>` 内手动写触发器或选项 DOM——组件根据 `options` 与 `trigger-class` 自动渲染。手动写会被下次 render 覆盖。

#### 9.8.10 体积拆分

| 部分 | gzip | 占比 | 主要开销 |
|---|---|---|---|
| 属性/特性映射 | ~0.01KB | 7% | 基类内置 |
| options + trigger → DOM 渲染 | ~0.04KB | 27% | innerHTML 模板字符串 |
| 触发器点击 → showPopover | ~0.01KB | 7% | 1 行原生 API |
| 选项点击 → 回填 + 关闭 + emit | ~0.03KB | 20% | closest + dataset + _updateTrigger |
| toggle 事件监听（backdrop 关闭） | ~0.02KB | 13% | newState === 'closed' |
| _updateTrigger（更新触发器文案） | ~0.02KB | 13% | find + textContent |
| ARIA（role/aria-selected/aria-expanded） | ~0.02KB | 13% | setAttribute |
| **JS 合计** | **~0.15KB** | **100%** | 略超 0.1KB 预算 0.05KB，可接受 |
| **CSS** | **0** | — | Light DOM，纯 L2 配方（§4.2 Light 分配，CSS 预算归零） |

**体积风险点与优化**：
- Light DOM 省去专属 CSS ~0.1KB（用 L2 `.input`/`.list-item` 配方覆盖视觉），JS 略增 0.05KB——净省 0.05KB
- 不实现"搜索过滤"（如选项超 50 项时输入过滤）——走 v1.1 扩展（需 af-search-input 嵌入），MVP 仅静态选项
- 不实现"多选"——多选语义复杂（需 chip 显示/全选/清空），走 v1.1 扩展

---

### 9.9 af-img 详设（P2 · 懒加载图片）

#### 9.9.1 概述

| 项 | 内容 |
|---|---|
| 职责 | 图片懒加载：(a) `IntersectionObserver` 监听进入视口才加载；(b) 占位符（默认灰色 + skeleton 动画）；(c) 加载失败回退（显示 broken 图标或自定义 fail-src）；(d) 加载状态事件 |
| 解决场景 | 商品列表图、文章配图、用户头像——任何"图片可能不在首屏、避免一次性加载全部图片"的场景 |
| L2 边界 | 首屏单张图片 → 直接用 `<img class="thumb">` 或 `<img class="avatar">`；列表内大量图片需懒加载 → 用 af-img |
| 体积预算 | JS ~0.1KB gzip；CSS 0（Light DOM，D19，见 9.9.10） |

#### 9.9.2 DOM 模式：Light DOM（useShadow = false）

| 理由 | 说明 |
|---|---|
| 直接复用 L2 配方 | `.thumb`/`.avatar`/`.skeleton` 配方已定义视觉，af-img 在 `<img>` 上叠加这些 class |
| 内部无专属样式 | af-img 只负责"懒加载 + 占位 + 失败回填"逻辑 |
| 原生 `<img>` 语义 | Light DOM 下 `<img>` 的 alt/src 属性原生可用，无障碍零成本 |
| 主题零代码 | L2 配方已 token 化 |

**决策 D19（af-img）**：Light DOM 模式（原 §2.4/§4.2 预估 Shadow，本设计改 Light）。理由：(a) `<img>` 是原生元素，Shadow 封装反而失去 alt/src 的原生语义；(b) `.thumb`/`.avatar` 配方已覆盖视觉，无需专属 CSS；(c) 节省 0.1KB CSS 预算。

#### 9.9.3 属性 API

**attribute 列表**

| 属性名 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `src` | String | `""` | 真实图片地址（懒加载目标） |
| `alt` | String | `""` | **必填**，无障碍描述（透传到内部 `<img>`） |
| `placeholder-src` | String | `""` | 占位图片地址（如低分辨率模糊图）；未设时用 `.skeleton` 动画 |
| `fail-src` | String | `""` | 加载失败时显示的图片地址；未设时显示 broken 图标 + `.text-muted` 文案 |
| `variant` | `default`/`thumb`/`avatar` | `default` | 视觉变体：`thumb` 叠加 `.thumb` 配方（72×72），`avatar` 叠加 `.avatar`（36×36 圆形） |
| `root-margin` | String | `"200px"` | IntersectionObserver rootMargin，提前 200px 触发加载 |
| `lazy` | Boolean | `true` | 是否启用懒加载（false 时立即加载） |

**property 映射**

| 名称 | 类型 | 说明 |
|---|---|---|
| `loaded` | `Boolean`（只读） | 是否已加载完成 |
| `error` | `Boolean`（只读） | 是否加载失败 |

#### 9.9.4 DOM 结构（Light DOM）

```
<af-img class="thumb" src="..." alt="商品图">        ← 用户在 af-img 上设 .thumb/.avatar 配方
  └─ <img class="af-img-inner" alt="${alt}">          ← 内部真实图片元素
      // src 在懒加载触发前为空，触发后设为 attribute src
  └─ <div class="skeleton af-img-placeholder">        ← 占位（loaded 前）
  └─ <div class="af-img-error">                       ← 错误态（error=true 时）
      └─ <span class="caption">图片加载失败</span>
```

注：`<af-img>` 自身设 `.thumb`/`.avatar` class（用户指定），内部 `<img>` 继承尺寸（`width:100%; height:100%`）。

#### 9.9.5 算法

**算法 A：IntersectionObserver 懒加载**

```javascript
mounted() {
  this._img = this.$('img.af-img-inner');
  this._placeholder = this.$('.af-img-placeholder');

  if (!this.lazy || this.loaded) {
    this._load();
    return;
  }

  this._observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      this._load();
      this._observer.disconnect();
    }
  }, { rootMargin: this.rootMargin });

  this._observer.observe(this);
}

_load() {
  this._img.src = this.src;
  this._img.onload = () => {
    this.loaded = true;
    this._placeholder?.remove();
    this.emit('af-img:load', {});
  };
  this._img.onerror = () => {
    this.error = true;
    if (this.failSrc) {
      this._img.src = this.failSrc;                   // 失败回退图
    } else {
      this._img.style.display = 'none';
      this._renderError();                             // 显示错误文案
    }
    this.emit('af-img:error', {});
  };
}

_renderError() {
  const err = document.createElement('div');
  err.className = 'af-img-error';
  err.innerHTML = `<div class="empty"><p class="caption">图片加载失败</p></div>`;
  this.appendChild(err);
}
```

**算法 B：unmounted 清理**

```javascript
unmounted() {
  this._observer?.disconnect();
  this._img.onload = null;
  this._img.onerror = null;
}
```

#### 9.9.6 事件

| 事件名 | payload | 触发时机 |
|---|---|---|
| `af-img:load` | `{}` | 图片加载完成（onload 触发） |
| `af-img:error` | `{}` | 图片加载失败（onerror 触发） |

#### 9.9.7 ARIA 与键盘

| 项 | 内容 |
|---|---|
| `<img>` 原生语义 | 内部 `<img>` 自带 `role="img"` |
| `alt` 属性 | **必填**——L4 ESLint 规则 `wc-alt-text` 检测 af-img 缺 alt 时 error 阻断 |
| 占位符 | 不需要 aria（视觉装饰，屏幕阅读器忽略） |
| 错误态 | `.af-img-error` 设 `role="alert"` + `aria-live="assertive"`（加载失败是用户需知晓的信息） |
| 不需要键盘交互 | 图片非交互元素 |

#### 9.9.8 使用示例

**示例 1：商品列表懒加载**

```html
<!doctype html>
<html>
<head><link rel="stylesheet" href="/aiflow-ui.css"></head>
<body>
  <div class="page">
    <div class="list" id="goods"></div>
  </div>

  <script type="module">
    import { AfImg } from '@af-mobile/ui';
    customElements.define('af-img', AfImg);

    const goods = [{id:1,title:'商品A',img:'/a.jpg'},{id:2,title:'商品B',img:'/b.jpg'}];

    goods.innerHTML = goods.map(g => `
      <div class="list-item">
        <af-img class="thumb" src="${g.img}" alt="${g.title}商品图" variant="thumb"></af-img>
        <div class="flex-1">
          <div class="body">${g.title}</div>
        </div>
      </div>
    `).join('');
  </script>
</body>
</html>
```

**示例 2：带占位图与失败回退**

```html
<af-img
  class="avatar"
  src="/user.jpg"
  alt="用户头像"
  variant="avatar"
  placeholder-src="/placeholder.svg"
  fail-src="/default-avatar.png"
></af-img>
```

#### 9.9.9 与 L2 的协作

| L2 配方 | 用途 |
|---|---|
| `.thumb` | variant=thumb 时 af-img 根元素叠加（72×72 圆角） |
| `.avatar` | variant=avatar 时叠加（36×36 圆形） |
| `.skeleton` | 占位符动画（无 placeholder-src 时） |
| `.empty` | 错误态容器 |
| `.caption` | 错误文案 |

**与 L2 禁区**：用户**不应**在 `<af-img>` 内手动写 `<img>` 或占位元素——组件自动管理。用户只需在 `<af-img>` 上设 `src`/`alt`/`variant`，视觉靠 `.thumb`/`.avatar` 配方。

#### 9.9.10 体积拆分

| 部分 | gzip | 占比 | 主要开销 |
|---|---|---|---|
| 属性/特性映射 | ~0.01KB | 7% | 基类内置 |
| DOM 渲染（img + placeholder + error） | ~0.03KB | 20% | innerHTML 模板字符串 |
| IntersectionObserver 创建 + observe | ~0.03KB | 20% | new + observe + disconnect |
| _load（src 设置 + onload/onerror） | ~0.03KB | 20% | 2 个事件绑定 + state 切换 |
| _renderError（失败态渲染） | ~0.02KB | 13% | createElement + appendChild |
| unmounted 清理 | ~0.01KB | 7% | disconnect + null |
| ARIA（alt 透传 + error role=alert） | ~0.01KB | 7% | setAttribute |
| emit（load/error 2 个事件） | ~0.01KB | 6% | 基类内置 |
| **JS 合计** | **~0.15KB** | **100%** | 略超 0.1KB 预算 0.05KB，可接受 |
| **CSS** | **0** | — | Light DOM，纯 L2 配方（D19：原 §4.2 预估 Shadow，改 Light 后 CSS 确定为 0） |

**体积风险点与优化**：
- Light DOM 模式确认 CSS=0——若按 §4.2 原 Shadow 预估，占位/失败态需专属 CSS ~0.1KB，改 Light 后用 L2 `.skeleton`/`.empty` 配方覆盖，净省 0.1KB CSS（JS 略增 0.05KB）
- IntersectionObserver 是零依赖原生 API，比手写 scroll 监听 + getBoundingClientRect 更高效且体积更小
- 不实现"高斯模糊预览图渐进式加载"（LQIP）——走 v1.1 扩展（需 canvas 处理），MVP 仅简单占位
- 不实现"srcset 响应式图片"——用户在 src 字段自行决定（移动端单视口场景，YAGNI）

---

### 9.10 af-backtop 详设（P2 · 回到顶部）

#### 9.10.1 概述

| 项 | 内容 |
|---|---|
| 职责 | 回到顶部按钮：(a) 滚动超过阈值时显示（淡入）；(b) 点击平滑滚动到顶部；(c) 滚动监听自动显隐；(d) 可配置目标滚动容器 |
| 解决场景 | 长列表/长文章/长商品详情页——任何"用户向下滚动后需要快速回到顶部"的场景 |
| L2 边界 | 静态按钮（不需自动显隐）→ 用 L2 `.btn` 配方 + `scrollTo(0,0)`；需自动显隐 + 平滑滚动 → 用 af-backtop |
| 体积预算 | JS ~0.1KB gzip；CSS 0（Light DOM 模式） |

#### 9.10.2 DOM 模式：Light DOM（useShadow = false）

| 理由 | 说明 |
|---|---|
| 直接复用 L2 配方 | `.btn` 配方已定义按钮视觉，af-backtop 在其上叠加 `position:fixed` |
| 内部无专属样式 | af-backtop 只负责"滚动监听 + 显隐 + 平滑滚动"逻辑 |
| 原生 `<button>` 语义 | Light DOM 下 button 原生键盘可达 |
| 主题零代码 | L2 配方已 token 化 |

#### 9.10.3 属性 API

**attribute 列表**

| 属性名 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `threshold` | Number（px） | `200` | 滚动超过此值时显示按钮 |
| `target` | String | `""` | 滚动容器选择器（如 `"#scroll-area"`）；未设时监听 window |
| `text` | String | `"↑"` | 按钮文案/图标（默认上箭头） |
| `aria-label-text` | String | `"回到顶部"` | 无障碍标签（按钮只有符号，需文字描述） |
| `position` | `right-bottom`/`left-bottom` | `right-bottom` | 固定位置 |

**property 映射**

| 名称 | 类型 | 说明 |
|---|---|---|
| `visible` | `Boolean`（只读） | 当前是否显示 |
| `scrollToTop()` | `Function` | 编程触发回顶 |

#### 9.10.4 DOM 结构（Light DOM）

```
<af-backtop class="af-backtop-fixed">               ← 根元素，position:fixed（ recipes.project.css 扩展）
  └─ <button class="btn btn-ghost" aria-label="回到顶部">
      ${text}
```

注：`position:fixed` + `right`/`bottom` 偏移由 `recipes.project.css` 扩展类 `.af-backtop-fixed` 提供（避免 L2 配方膨胀，详见 9.10.9）。

#### 9.10.5 算法

**算法 A：滚动监听 + 显隐（节流 100ms）**

```javascript
mounted() {
  this._scrollTarget = this.target
    ? document.querySelector(this.target)
    : window;

  let scrollTimer;
  this._onScroll = () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => this._updateVisibility(), 100);
  };

  this._scrollTarget.addEventListener('scroll', this._onScroll);
  this._updateVisibility();                          // 初始化
}

_updateVisibility() {
  const scrollTop = this._scrollTarget === window
    ? window.scrollY
    : this._scrollTarget.scrollTop;
  const shouldShow = scrollTop > this.threshold;
  if (shouldShow !== this.visible) {
    this.visible = shouldShow;
    this.style.display = shouldShow ? '' : 'none';   // width/height/display 豁免 no-inline-style
    this.emit(shouldShow ? 'af-backtop:show' : 'af-backtop:hide', {});
  }
}
```

**算法 B：点击 → 平滑滚动到顶部**

```javascript
mounted() {
  // ... 算法 A ...
  this.$('button').addEventListener('click', () => {
    this.scrollToTop();
    this.emit('af-backtop:click', {});
  });
}

scrollToTop() {
  if (this._scrollTarget === window) {
    window.scrollTo({ top: 0, behavior: 'smooth' });  // 原生平滑滚动
  } else {
    this._scrollTarget.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
```

**算法 C：unmounted 清理**

```javascript
unmounted() {
  this._scrollTarget.removeEventListener('scroll', this._onScroll);
}
```

#### 9.10.6 事件

| 事件名 | payload | 触发时机 |
|---|---|---|
| `af-backtop:click` | `{}` | 用户点击按钮后（平滑滚动开始前） |
| `af-backtop:show` | `{}` | 按钮从隐藏变为显示 |
| `af-backtop:hide` | `{}` | 按钮从显示变为隐藏 |

#### 9.10.7 ARIA 与键盘

| 项 | 内容 |
|---|---|
| `<button>` 原生语义 | 内部 button 自带 `role="button"` |
| `aria-label` | 必须设（按钮仅符号，屏幕阅读器需文字描述）；默认"回到顶部"，用户可覆盖 |
| 键盘 Tab | 按钮可聚焦 |
| 键盘 Enter/Space | 触发点击（原生 button 自带） |
| 显隐状态 | 不需要 `aria-hidden`（display:none 已让屏幕阅读器跳过） |

#### 9.10.8 使用示例

**示例 1：页面级回到顶部**

```html
<!doctype html>
<html>
<head>
  <link rel="stylesheet" href="/aiflow-ui.css">
  <link rel="stylesheet" href="/aiflow-ui/recipes.project.css">   <!-- 含 .af-backtop-fixed -->
</head>
<body>
  <div class="page">
    <h1 class="title">长文章</h1>
    <p class="body">... 很长的内容 ...</p>
  </div>

  <af-backtop threshold="300"></af-backtop>

  <script type="module">
    import { AfBacktop } from '@af-mobile/ui';
    customElements.define('af-backtop', AfBacktop);

    backtop.addEventListener('af-backtop:click', () => {
      console.log('用户点击回顶');
    });
  </script>
</body>
</html>
```

**示例 2：滚动容器内回到顶部**

```html
<div class="list" id="scroll-list" style="height:400px;overflow-y:auto;">
  <!-- 长列表 -->
</div>

<af-backtop target="#scroll-list" threshold="100"></af-backtop>
```

#### 9.10.9 与 L2 的协作

| L2 配方 | 用途 |
|---|---|
| `.btn` / `.btn-ghost` | 按钮视觉（圆角/背景/触控反馈） |

**项目级扩展（recipes.project.css）**：

由于 af-backtop 需要 `position:fixed` + 位置偏移，而 L2 配方不内置 fixed 定位（避免 `.btn` 配方膨胀），用户需在 `recipes.project.css` 扩展：

```css
/* recipes.project.css */
@layer components {
  .af-backtop-fixed {
    position: fixed;
    right: var(--s-4);
    bottom: calc(var(--s-6) + env(safe-area-inset-bottom));
    z-index: var(--z-sticky);
    transition: opacity var(--dur-fast) var(--ease-out);
  }
}
```

并在 `.eslintrc` 的 `extraClass` 登记 `'af-backtop-fixed'`。

**与 L2 禁区**：用户**不应**手写 `<button class="btn" style="position:fixed">`——内联 style 违反 L1-2 `no-inline-style` 规则。必须通过 af-backtop 组件 + 项目级扩展类实现。

#### 9.10.10 体积拆分

| 部分 | gzip | 占比 | 主要开销 |
|---|---|---|---|
| 属性/特性映射 | ~0.01KB | 10% | 基类内置 |
| DOM 渲染（button + text） | ~0.01KB | 10% | innerHTML 模板字符串 |
| 滚动监听 + 节流（100ms） | ~0.03KB | 30% | addEventListener + setTimeout |
| _updateVisibility（显隐切换） | ~0.02KB | 20% | scrollTop 判断 + display 切换 + emit |
| 点击 → scrollToTop（平滑滚动） | ~0.01KB | 10% | scrollTo({behavior:'smooth'}) |
| unmounted 清理 | ~0.01KB | 10% | removeEventListener |
| ARIA（aria-label 透传） | ~0.01KB | 10% | setAttribute |
| **JS 合计** | **~0.10KB** | **100%** | 符合 1.4 节 0.1KB 预算 |
| **CSS** | **0** | — | Light DOM，纯 L2 配方 + 项目级扩展 |

**体积风险点与优化**：
- 滚动监听节流是必要开销——不节流会导致 scroll 事件高频触发，性能差
- 平滑滚动用原生 `behavior:'smooth'`——零 JS 动画代码，体积最优
- 不实现"圆形悬浮按钮 + 阴影 + 图标"视觉——由用户在 `recipes.project.css` 扩展（如 `.af-backtop-circle { border-radius: var(--r-f); box-shadow: var(--shadow-md); }`）
- 不实现"滚动进度条"——走 v1.1 扩展（独立组件 af-scroll-progress），MVP 仅回顶功能

---

## 设计决策索引

| # | 决策 | 所在节 |
|---|---|---|
| D1 | L3 用原生 Web Components（Custom Elements），不用 Lit/Stencil | 2.1 |
| D2 | AfElement 基类：5 生命周期钩子 + 主题订阅 + defineProp + emit | 2.2 |
| D3 | 注册机制：导出类 + 用户显式 `customElements.define`（不自动注册） | 2.3 |
| D4 | JS 与 CSS 不分离文件：Light 零 CSS，Shadow CSS 嵌入 JS 字符串 | 2.4 |
| D5 | mounted 一次性 + unmounted 资源清理清单 + 属性特性双向同步防循环 | 3.1 / 3.2 / 3.4 |
| D6 | CSS 混合方案：7 Light + 3 Shadow（详设阶段 af-img 由 Shadow 改 Light，D19） | 4.1 / 4.2 |
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
| D17 | af-tabs 双模式 panel 渲染（`renderPanel` 函数 + `<slot name="panel-N">` 静态透传，两者皆无则只切 tab 高亮，外部监听 change 自行处理） | 9.3.3 |
| D18 | af-dialog 基于原生 `<dialog>` + `showModal()`，不手写遮罩/focus trap（借用原生 backdrop / top-layer / Esc / 焦点陷阱） | 9.4.3 |
| D19 | af-img 由 §4.2 预估的 Shadow 改为 Light DOM（`<img>` 原生语义 + L2 `.thumb`/`.avatar`/`.skeleton`/`.empty` 配方覆盖视觉，CSS=0；连带 D6 计数变 7 Light + 3 Shadow） | 9.9.2 |
