# AIFlow UI —— 迭代版本详细设计（v1.1.0 / v1.2.0 / v1.3.0）

> 本文档基于 [iteration-plan.md](file:///d:/projects/aiflow-ui/docs/iteration-plan.md)，将 10 个迭代项（IP-1 ~ IP-10）细化为可直接落地的详细设计。
>
> 设计原则遵循 L3 总体架构（[l3-detailed-design.md](file:///d:/projects/aiflow-ui/docs/design/l3-detailed-design.md)）：原生 WC、混合 Shadow/Light DOM、`AfElement` 基类、`af-{component}:{action}` 事件、白名单封闭、体积预算。
>
> 新增组件详设沿用 §9 的 10 节模板：概述 / DOM 模式 / 属性 API / DOM 结构 / 算法 / 事件 / ARIA 与键盘 / 使用示例 / 与 L2 协作 / 体积拆分。

---

## 目录

- [v1.1.0 工程化补全](#v110-工程化补全)
  - [IP-1 TypeScript 类型声明](#ip-1-typescript-类型声明)
  - [IP-2 ESLint 版本锁定与 CI 验证](#ip-2-eslint-版本锁定与-ci-验证)
  - [IP-3 af-tabs 面板渲染优化](#ip-3-af-tabs-面板渲染优化)
- [v1.2.0 组件覆盖度扩展](#v120-组件覆盖度扩展)
  - [IP-4 af-switch 详设](#ip-4-af-switch-详设)
  - [IP-5 af-search-bar 详设](#ip-5-af-search-bar-详设)
  - [IP-6 af-skeleton-page 详设](#ip-6-af-skeleton-page-详设)
  - [IP-7 配套控件评估](#ip-7-配套控件评估)
- [v1.3.0 SSR 与可观测性](#v130-ssr-与可观测性)
  - [IP-8 SSR / hydration 指引](#ip-8-ssr--hydration-指引)
  - [IP-9 官方 demo 站](#ip-9-官方-demo-站)
  - [IP-10 slotchange 监听补齐](#ip-10-slotchange-监听补齐)
- [设计决策索引](#设计决策索引)

---

## v1.1.0 工程化补全

### IP-1 TypeScript 类型声明

#### 1. 目标

为库提供完整的 `.d.ts` 类型声明，使 TypeScript 项目中 `import { AfDialog } from 'aiflow-ui'` 可获得 props/events/methods 类型提示。

#### 2. 文件清单

| 文件 | 职责 |
|---|---|
| `src/index.d.ts` | 主入口，re-export 全部公开 API + 全局注册接口 |
| `src/components/*.d.ts` | （可选）单组件类型，若 index.d.ts 过大则拆分；初版集中在 index.d.ts |
| `package.json` | 新增 `"types": "./src/index.d.ts"` |

#### 3. 类型设计

**3.1 基础类型**

```ts
// src/index.d.ts —— 公共类型 + 全部导出

/// <reference lib="dom" />

/** 组件事件 detail 基类 */
export interface AfEventDetail {
  [key: string]: unknown;
}

/** 主题类型 */
export type ThemeName = 'light' | 'dark';

/** 主题相关 API */
export function initTheme(): void;
export function setTheme(theme: ThemeName): void;
export function toggleTheme(): void;
export function getTheme(): ThemeName;

/** HTML 转义工具 */
export function escapeHtml(s: unknown): string;

/** AfElement 基类（供用户继承自定义组件） */
export class AfElement extends HTMLElement {
  static useShadow?: boolean;
  static observedAttributes?: string[];
  $(selector: string): Element | null;
  $$(selector: string): Element[];
  readonly $root: ShadowRoot | HTMLElement;
  emit(name: string, detail?: AfEventDetail): void;
  protected mounted?(): void;
  protected unmounted?(): void;
  protected onAttributeChange?(name: string, oldVal: string, newVal: string): void;
  protected onThemeChange?(theme: ThemeName): void;
  static defineProp(
    proto: AfElement,
    name: string,
    opts?: { attr?: string; type?: 'String' | 'Number' | 'Boolean' | 'Array' | 'Object'; default?: unknown }
  ): void;
}
```

**3.2 组件类型（节选关键 3 个，其余同理）**

```ts
// —— af-dialog ——
export interface DialogEventDetail extends AfEventDetail {
  action: 'confirm' | 'cancel' | 'close';
}
export class AfDialog extends AfElement {
  static useShadow: true;
  open: boolean;
  title: string;
  closeOnBackdrop: boolean;
  show(): void;
  close(action?: 'confirm' | 'cancel' | 'close'): void;
  addEventListener(type: 'af-dialog:close', listener: (e: CustomEvent<DialogEventDetail>) => void): void;
}

// —— af-list ——
export interface ListItemClickDetail extends AfEventDetail {
  index: number;
  item: unknown;
}
export interface ListLoadMoreDetail extends AfEventDetail {
  page: number;
}
export class AfList extends AfElement {
  static useShadow: false;
  data: unknown[];
  totalCount: number;
  itemHeight: number;
  height: string;
  loading: boolean;
  refresh: boolean;
  mode: 'normal' | 'compact';
  renderItem?: (item: unknown, index: number) => string;
  endLoadMore(hasMore: boolean): void;
  endRefresh(): void;
  addEventListener(type: 'af-list:itemclick', listener: (e: CustomEvent<ListItemClickDetail>) => void): void;
  addEventListener(type: 'af-list:loadmore', listener: (e: CustomEvent<ListLoadMoreDetail>) => void): void;
  addEventListener(type: 'af-list:refresh', listener: (e: CustomEvent) => void): void;
}

// —— af-swiper ——
export interface SwiperChangeDetail extends AfEventDetail {
  index: number;
}
export class AfSwiper extends AfElement {
  static useShadow: true;
  activeIndex: number;
  loop: boolean;
  autoplay: number;
  duration: number;
  showDots: boolean;
  disabled: boolean;
  readonly slideCount: number;
  goTo(index: number): void;
  next(): void;
  prev(): void;
  addEventListener(type: 'af-swiper:change', listener: (e: CustomEvent<SwiperChangeDetail>) => void): void;
}
```

> 其余 7 组件（af-tabs / af-toast / af-action-sheet / af-picker / af-dropdown / af-img / af-backtop）按相同模式声明，详见实现阶段。

**3.3 注册接口**

```ts
/** 按需注册单个组件 */
export function register(tag?: string, ctor?: typeof AfElement): void;
/** 全量注册 10 个组件 */
export function registerAll(): void;
```

#### 4. package.json 变更

```json
{
  "types": "./src/index.d.ts"
}
```

#### 5. 验收标准

- [ ] TS 项目 `import { AfDialog, AfList } from 'aiflow-ui'` 有完整类型
- [ ] `el.addEventListener('af-list:itemclick', cb)` 中 `cb` 参数类型正确推断
- [ ] `tsc --noEmit` 通过

#### 6. 设计决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 类型文件位置 | `src/index.d.ts` | 与源码同目录，package.json `types` 直接指向 |
| 是否生成 .js.map | 否 | 手写 .d.ts，精度可控，避免 JSDoc 缺漏 |
| 泛型化组件 | 仅 AfList\<T\> 可选泛型 | 其余组件 item 类型用 unknown，避免过度抽象 |

---

### IP-2 ESLint 版本锁定与 CI 验证

#### 1. 目标

核实 `package.json` 中 `eslint: ^10.8.1` 是否真实存在，避免 `npm ci` 在全新环境失败。

#### 2. 核查方案

```bash
# 查询 npm registry 实际最新版本
npm view eslint version
npm view eslint versions --json | findstr "10."
```

#### 3. 处置矩阵

| 情况 | 处置 |
|---|---|
| ESLint 10.x 确实存在且 ^10.8.1 可用 | 无需改动，CI 增 `npm ci` 验证步骤 |
| ESLint 10.x 存在但无 10.8.1 | 改为 `^10.0.0` 或实际存在的最低 10.x |
| ESLint 最高仍为 9.x | 降级 `^9.x`，调整 eslint.config.js 兼容性 |

#### 4. CI 增强

在 `.github/workflows/ci.yml` 的 install 步骤前增加：

```yaml
- name: Verify dependencies installable
  run: npm ci --ignore-scripts
```

#### 5. 验收标准

- [ ] `npm ci` 在全新 runner 成功
- [ ] `npm run lint` 通过

---

### IP-3 af-tabs 面板渲染优化

#### 1. 问题回顾

[af-tabs.js#L48-L74](file:///d:/projects/aiflow-ui/src/components/af-tabs.js#L48-L74) 的 `_renderPanels` 在 slot 静态面板模式下，把 Light DOM 面板 `move` 到 `.af-tabs-panel-container`。若面板内已绑定事件或外部持有 DOM 引用，移动会破坏引用。

#### 2. 方案对比

| 方案 | 实现 | 优点 | 缺点 |
|---|---|---|---|
| A. 克隆内容（深拷贝） | `panel.cloneNode(true)` 后插入 | 原节点引用不变 | 事件监听丢失（cloneNode 不复制 listener） |
| B. 不搬运，原地加 ARIA | 面板留原位，用 `hidden` 属性切换 | 引用/事件全保留 | DOM 结构与 panel container 分离，样式需额外处理 |
| C. 事件委托（推荐） | 面板仍搬运，但文档约定用事件委托 | 实现简单，符合 L3 既有模式 | 需使用者遵循约定 |

#### 3. 选定方案：B（原地加 ARIA + hidden 切换）

**理由**：
- 面板不搬运，外部引用与事件监听全保留，彻底消除"搬运会破坏引用"的隐患
- panel container 改为只放 renderPanel 函数模式的内容；slot 面板留原位
- 切换用 `hidden` 属性，与既有逻辑一致

#### 4. 实现变更

```js
_renderPanels() {
  const slotted = this.$$('div[slot^="panel-"]');
  if (this._renderPanel) {
    // 函数驱动：仍用 panel container
    this._panelContainer.innerHTML = this.tabs.map((tab, i) => {
      const html = this._renderPanel(tab, i) || '';
      return `<div class="af-tabs-panel" role="tabpanel" id="af-tabs-panel-${i}" aria-labelledby="af-tabs-tab-${i}" hidden>${html}</div>`;
    }).join('');
  } else if (slotted.length) {
    // slot 静态透传：原地加 ARIA，不搬运
    this._panelContainer.innerHTML = ''; // container 清空
    this.tabs.forEach((tab, i) => {
      const panel = this.$(`div[slot="panel-${i}"]`);
      if (!panel) return;
      panel.classList.add('af-tabs-panel');
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('id', `af-tabs-panel-${i}`);
      panel.setAttribute('aria-labelledby', `af-tabs-tab-${i}`);
      panel.hidden = i !== this.activeIndex; // 原地切换显隐
    });
  }
}
```

`setActive` 中切换面板的逻辑同步调整：slot 面板用 `hidden` 属性而非依赖 container 内 index。

#### 5. 验收标准

- [ ] 面板内按钮 click 监听在 tabs 渲染后仍可触发
- [ ] 外部 `const panel = document.querySelector('div[slot="panel-0"]')` 引用稳定
- [ ] ARIA tabpanel 关联正确

#### 6. 设计决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 面板是否搬运 | 否（slot 模式原地） | 保留引用与事件 |
| renderPanel 函数模式 | 仍用 container | 函数生成内容无外部引用，container 无副作用 |

---

## v1.2.0 组件覆盖度扩展

### IP-4 af-switch 详设

#### 4.1 概述

| 项 | 内容 |
|---|---|
| 职责 | 开关切换（受控/非受控），支持 loading 禁用态、size 变体 |
| 解决场景 | 表单"开启通知/自动续费/深色模式"等二值开关 |
| L2 边界 | 单个静态 checkbox → 用 L2 配方；需 JS 状态管理 + 事件 → af-switch |
| 体积预算 | JS ~0.35KB + CSS ~0.05KB = ~0.4KB gzip |

#### 4.2 DOM 模式：Light DOM（useShadow = false）

| 理由 | 说明 |
|---|---|
| 复用 L2 token | 视觉完全由 CSS 变量驱动，无需样式隔离 |
| 表单可嵌套 | Light DOM 可被 form 序列化（若需） |
| 体积优先 | 无 Shadow 模板开销 |

#### 4.3 属性 API

| 属性名 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `checked` | Boolean | `false` | 开关状态 |
| `disabled` | Boolean | `false` | 禁用 |
| `loading` | Boolean | `false` | 加载中（显示 spinner，禁用交互） |
| `size` | `sm`/`md` | `md` | 尺寸变体 |

#### 4.4 DOM 结构

```html
<!-- 使用方 -->
<af-switch checked></af-switch>

<!-- 渲染后（Light DOM） -->
<button class="switch switch-md" role="switch" aria-checked="true" tabindex="0">
  <span class="switch-thumb"></span>
</button>
```

#### 4.5 算法

```js
import { AfElement } from '../lib/af-element.js';

export class AfSwitch extends AfElement {
  static useShadow = false;

  mounted() {
    this.innerHTML = `<button class="switch switch-${this.size}" role="switch" aria-checked="${this.checked}" tabindex="0" ${this.disabled ? 'disabled' : ''}><span class="switch-thumb"></span></button>`;
    this._btn = this.$('.switch');
    this._bindClick();
    this._bindKeydown();
  }

  toggle(force) {
    const next = force != null ? force : !this.checked;
    if (next === this.checked) return;
    this.checked = next;
    this._updateView();
    this.emit('af-switch:change', { checked: next });
  }

  _updateView() {
    this._btn.setAttribute('aria-checked', String(this.checked));
    this._btn.classList.toggle('switch-on', this.checked);
    this._btn.disabled = this.disabled || this.loading;
    this._btn.classList.toggle('switch-loading', this.loading);
  }

  _bindClick() {
    this._onClick = () => {
      if (this.disabled || this.loading) return;
      this.toggle();
    };
    this._btn.addEventListener('click', this._onClick);
  }

  _bindKeydown() {
    this._onKeydown = (e) => {
      if (this.disabled || this.loading) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.toggle();
      }
    };
    this._btn.addEventListener('keydown', this._onKeydown);
  }

  onAttributeChange(name) {
    if (!this._btn) return;
    if (name === 'checked' || name === 'disabled' || name === 'loading' || name === 'size') {
      this._updateView();
    }
  }

  unmounted() {
    this._btn?.removeEventListener('click', this._onClick);
    this._btn?.removeEventListener('keydown', this._onKeydown);
  }
}

AfElement.defineProp(AfSwitch.prototype, 'checked', { type: Boolean, default: false });
AfElement.defineProp(AfSwitch.prototype, 'disabled', { type: Boolean, default: false });
AfElement.defineProp(AfSwitch.prototype, 'loading', { type: Boolean, default: false });
AfElement.defineProp(AfSwitch.prototype, 'size', { type: String, default: 'md' });
```

#### 4.6 事件

| 事件 | detail | 触发时机 |
|---|---|---|
| `af-switch:change` | `{ checked: boolean }` | 用户切换开关后 |

#### 4.7 ARIA 与键盘

| 项 | 实现 |
|---|---|
| role | `switch` |
| aria-checked | 反映 checked |
| 键盘 | Space / Enter 切换 |
| 禁用 | `disabled` 属性 + `aria-disabled` |

#### 4.8 使用示例

```html
<!-- 基础 -->
<af-switch checked></af-switch>

<!-- 受控 + loading -->
<af-switch id="notify" loading></af-switch>
<script>
  document.getElementById('notify').addEventListener('af-switch:change', async (e) => {
    const sw = e.target;
    sw.loading = true;
    await api.setNotify(e.detail.checked);
    sw.loading = false;
  });
</script>
```

#### 4.9 与 L2 协作

需在 L2 recipes.css 新增 `.switch` 配方：

```css
.switch { position: relative; display: inline-flex; align-items: center; width: 52px; height: 32px; border-radius: 999px; background: var(--c-muted-bg); border: 1px solid var(--c-border); transition: background var(--dur-base) var(--ease-out); cursor: pointer; padding: 0; }
.switch.switch-md { width: 52px; height: 32px; }
.switch.switch-sm { width: 40px; height: 24px; }
.switch.switch-on { background: var(--c-brand); border-color: var(--c-brand); }
.switch[disabled] { opacity: 0.5; cursor: not-allowed; }
.switch-thumb { display: block; width: 28px; height: 28px; border-radius: 50%; background: var(--c-bg); box-shadow: 0 1px 3px rgba(0,0,0,0.2); transition: transform var(--dur-base) var(--ease-out); margin: 0 2px; }
.switch.switch-sm .switch-thumb { width: 20px; height: 20px; }
.switch.switch-on .switch-thumb { transform: translateX(20px); }
.switch.switch-sm.switch-on .switch-thumb { transform: translateX(16px); }
.switch.switch-loading .switch-thumb { animation: switch-spin 0.8s linear infinite; }
@keyframes switch-spin { to { transform: rotate(360deg); } }
```

#### 4.10 体积拆分

| 部分 | gzip | 预算 |
|---|---|---|
| JS | ~0.35KB | 0.5KB |
| CSS（L2 配方，不计入 L3） | ~0.10KB | — |
| **L3 合计** | **~0.35KB** | **0.5KB** |

---

### IP-5 af-search-bar 详设

#### 5.1 概述

| 项 | 内容 |
|---|---|
| 职责 | 搜索输入框，内置搜索图标、清除按钮、防抖 input 事件、回车 search 事件 |
| 解决场景 | 电商商品搜索、列表筛选、OPC 应用顶栏搜索 |
| L2 边界 | 纯静态 `.search-input` → 用 L2；需防抖/清除/事件封装 → af-search-bar |
| 体积预算 | JS ~0.4KB + CSS ~0.05KB = ~0.45KB gzip |

#### 5.2 DOM 模式：Light DOM（useShadow = false）

复用 L2 `.search-input` 配方，无需样式隔离。

#### 5.3 属性 API

| 属性名 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `value` | String | `""` | 输入值 |
| `placeholder` | String | `"搜索"` | 占位文案 |
| `clearable` | Boolean | `true` | 是否显示清除按钮 |
| `debounce` | Number(ms) | `300` | input 事件防抖时间；`0` 表示不防抖 |

#### 5.4 DOM 结构

```html
<!-- 使用方 -->
<af-search-bar placeholder="搜索商品" debounce="400"></af-search-bar>

<!-- 渲染后 -->
<div class="search search-bar-wrap">
  <svg class="search-bar-icon" viewBox="0 0 24 24"><!-- 放大镜 --></svg>
  <input class="search-input search-bar-input" type="search" placeholder="搜索商品" />
  <button class="search-bar-clear" type="button" aria-label="清除" hidden></button>
</div>
```

#### 5.5 算法

```js
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';

const ICON = '<svg class="search-bar-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm6.32 8.32a1 1 0 0 1 1.36 0l3 3a1 1 0 0 1-1.36 1.36l-3-3a1 1 0 0 1 0-1.36z" fill="currentColor"/></svg>';
const CLEAR = '<svg class="search-bar-clear-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm5 13.59L13.59 15 15 13.59 17 11.59 15 9.59 13.59 8 12 9.59 10.41 8 9 9.59 11 11.59 9 13.59 10.41 15 12 13.59 14 15 13.59 17 12 15.41z" fill="currentColor"/></svg>';

export class AfSearchBar extends AfElement {
  static useShadow = false;

  mounted() {
    this.innerHTML = `<div class="search search-bar-wrap">${ICON}<input class="search-input search-bar-input" type="search" placeholder="${esc(this.placeholder)}" />${this.clearable ? `<button class="search-bar-clear" type="button" aria-label="清除" hidden>${CLEAR}</button>` : ''}</div>`;
    this._input = this.$('.search-bar-input');
    this._clear = this.$('.search-bar-clear');
    this._input.value = this.value;
    this._debounceTimer = null;
    this._bindInput();
    this._bindKeydown();
    this._bindClear();
    this._syncClear();
  }

  _emitInput() {
    this.value = this._input.value;
    this._syncClear();
    this.emit('af-search-bar:input', { value: this.value });
  }

  _syncClear() {
    if (this._clear) this._clear.hidden = !this._input.value;
  }

  _bindInput() {
    this._onInput = () => {
      if (this.debounce > 0) {
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => this._emitInput(), this.debounce);
      } else {
        this._emitInput();
      }
    };
    this._input.addEventListener('input', this._onInput);
  }

  _bindKeydown() {
    this._onKeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(this._debounceTimer);
        this._emitInput();
        this.emit('af-search-bar:search', { value: this.value });
      }
    };
    this._input.addEventListener('keydown', this._onKeydown);
  }

  _bindClear() {
    if (!this._clear) return;
    this._onClear = () => {
      this._input.value = '';
      this.value = '';
      this._syncClear();
      this._input.focus();
      this.emit('af-search-bar:clear', { value: '' });
      this.emit('af-search-bar:input', { value: '' });
    };
    this._clear.addEventListener('click', this._onClear);
  }

  focus() { this._input?.focus(); }

  onAttributeChange(name) {
    if (!this._input) return;
    if (name === 'value') this._input.value = this.value;
    if (name === 'placeholder') this._input.placeholder = this.placeholder;
  }

  unmounted() {
    clearTimeout(this._debounceTimer);
    this._input?.removeEventListener('input', this._onInput);
    this._input?.removeEventListener('keydown', this._onKeydown);
    this._clear?.removeEventListener('click', this._onClear);
  }
}

AfElement.defineProp(AfSearchBar.prototype, 'value', { type: String, default: '' });
AfElement.defineProp(AfSearchBar.prototype, 'placeholder', { type: String, default: '搜索' });
AfElement.defineProp(AfSearchBar.prototype, 'clearable', { type: Boolean, default: true });
AfElement.defineProp(AfSearchBar.prototype, 'debounce', { type: Number, default: 300 });
```

#### 5.6 事件

| 事件 | detail | 触发时机 |
|---|---|---|
| `af-search-bar:input` | `{ value: string }` | 输入防抖后 |
| `af-search-bar:search` | `{ value: string }` | 回车 |
| `af-search-bar:clear` | `{ value: '' }` | 点击清除 |

#### 5.7 ARIA 与键盘

| 项 | 实现 |
|---|---|
| input type | `search` |
| 清除按钮 | `aria-label="清除"` |
| 键盘 | 回车触发 search；清除按钮 Tab 可达 |
| 焦点 | `focus()` 方法暴露 |

#### 5.8 使用示例

```html
<af-search-bar id="sb" placeholder="搜索商品" debounce="400"></af-search-bar>
<script>
  const sb = document.getElementById('sb');
  sb.addEventListener('af-search-bar:input', e => loadSuggestions(e.detail.value));
  sb.addEventListener('af-search-bar:search', e => doSearch(e.detail.value));
</script>
```

#### 5.9 与 L2 协作

需在 L2 recipes.css 新增 `.search-bar-*` 辅助类：

```css
.search-bar-wrap { position: relative; display: flex; align-items: center; }
.search-bar-icon { position: absolute; left: var(--s-2); width: 16px; height: 16px; color: var(--c-muted); pointer-events: none; }
.search-bar-input { padding-left: var(--s-5); }
.search-bar-clear { position: absolute; right: var(--s-1); border: none; background: var(--c-muted-bg); border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--c-muted); }
.search-bar-clear-icon { width: 12px; height: 12px; }
.search-bar-clear[hidden] { display: none; }
```

#### 5.10 体积拆分

| 部分 | gzip | 预算 |
|---|---|---|
| JS | ~0.4KB | 0.6KB |
| CSS（L2 配方） | ~0.08KB | — |
| **L3 合计** | **~0.4KB** | **0.6KB** |

---

### IP-6 af-skeleton-page 详设

#### 6.1 概述

| 项 | 内容 |
|---|---|
| 职责 | 整页骨架屏占位，4 种预设布局变体（list/detail/profile/card） |
| 解决场景 | 首屏加载、列表请求中的整页占位 |
| L2 边界 | 单行 `.skeleton-line` → 用 L2；整页布局 → af-skeleton-page |
| 体积预算 | JS ~0.15KB + CSS ~0.05KB = ~0.2KB gzip |

#### 6.2 DOM 模式：Light DOM（useShadow = false）

纯结构组合，复用 L2 `.skeleton` + `.skeleton-line` + `.skeleton-block`。

#### 6.3 属性 API

| 属性名 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `variant` | `list`/`detail`/`profile`/`card` | `list` | 布局变体 |
| `animated` | Boolean | `true` | 是否动画 |

#### 6.4 DOM 结构

```html
<!-- 使用方 -->
<af-skeleton-page variant="list"></af-skeleton-page>

<!-- 渲染后（list 变体） -->
<div class="skeleton-page skeleton-page-list">
  <div class="skeleton-line"></div>
  <div class="skeleton-line"></div>
  <div class="skeleton-line"></div>
  <div class="skeleton-line"></div>
  <div class="skeleton-line"></div>
</div>
```

#### 6.5 算法

```js
import { AfElement } from '../lib/af-element.js';

const TEMPLATES = {
  list: '<div class="skeleton-line"></div>'.repeat(6),
  detail: '<div class="skeleton-block" style="height:200px"></div><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line" style="width:60%"></div>',
  profile: '<div class="skeleton-block" style="width:64px;height:64px;border-radius:50%"></div><div class="skeleton-line" style="width:40%"></div><div class="skeleton-line" style="width:80%"></div>',
  card: '<div class="skeleton-block" style="height:120px"></div>'.repeat(2) + '<div class="skeleton-line"></div><div class="skeleton-line" style="width:60%"></div>',
};

export class AfSkeletonPage extends AfElement {
  static useShadow = false;

  mounted() { this._render(); }

  _render() {
    const tpl = TEMPLATES[this.variant] || TEMPLATES.list;
    this.innerHTML = `<div class="skeleton-page skeleton-page-${this.variant}${this.animated ? ' skeleton-animated' : ''}">${tpl}</div>`;
  }

  onAttributeChange(name) {
    if (name === 'variant' || name === 'animated') this._render();
  }
}

AfElement.defineProp(AfSkeletonPage.prototype, 'variant', { type: String, default: 'list' });
AfElement.defineProp(AfSkeletonPage.prototype, 'animated', { type: Boolean, default: true });
```

#### 6.6 事件

无（纯展示组件）。

#### 6.7 ARIA 与键盘

| 项 | 实现 |
|---|---|
| role | `status` |
| aria-live | `polite` |
| aria-label | `"加载中"` |

> 实现：根 div 加 `role="status" aria-live="polite" aria-label="加载中"`。

#### 6.8 使用示例

```html
<!-- 列表页骨架 -->
<af-skeleton-page variant="list"></af-skeleton-page>

<!-- 详情页骨架 -->
<af-skeleton-page variant="detail"></af-skeleton-page>
```

#### 6.9 与 L2 协作

需在 L2 recipes.css 新增 `.skeleton-block` 配方（块状占位）：

```css
.skeleton-block { composes: skeleton; height: 100px; border-radius: var(--r-m); margin-bottom: var(--s-2); }
.skeleton-page { padding: var(--s-3); }
```

> 注：CSS 不支持 composes，实际为 `.skeleton-block { background: linear-gradient(...); animation: skeleton-shimmer 1.5s infinite var(--ease-in-out); border-radius: var(--r-m); }`，复用 `.skeleton` 同款动画。

#### 6.10 体积拆分

| 部分 | gzip | 预算 |
|---|---|---|
| JS | ~0.15KB | 0.4KB |
| CSS（L2 配方） | ~0.05KB | — |
| **L3 合计** | **~0.15KB** | **0.4KB** |

---

### IP-7 配套控件评估

#### 7.1 候选清单

| 组件 | 场景 | 优先级 | 是否纳入 v1.2.0 |
|---|---|---|---|
| af-steps 步骤条 | 订单流程、引导 | 低 | 否（v1.4 评估） |
| af-number-input 数字输入 | 数量选择、购物车 | 中 | 否（可先用原生 input + L2） |
| af-countdown 倒计时 | 秒杀、验证码 | 中 | 否（v1.4 评估） |
| af-progress 进度条 | 上传进度、任务 | 低 | 否（可用 L2 `.skeleton` 变通） |

#### 7.2 评估结论

v1.2.0 聚焦 IP-4/5/6 三个高频组件。IP-7 候选控件均可用"L2 配方 + 原生"临时替代，推迟到 v1.4.0 按实际需求评估，避免过早抽象。

---

## v1.3.0 SSR 与可观测性

### IP-8 SSR / hydration 指引

#### 1. 目标

在 README 新增"SSR 使用指南"章节，覆盖 Next.js / Nuxt / Remix 三大框架。

#### 2. 核心问题

| 问题 | 说明 |
|---|---|
| `customElements` 在服务端不存在 | Node 环境无 `customElements`，直接 `import` 会抛错 |
| `connectedCallback` 不触发 | 服务端无 DOM，组件不 upgrade |
| 属性 JSON 序列化 | `data`/`tabs` 等复杂属性需在 HTML 中预渲染 |

#### 3. 指引方案

**3.1 客户端条件注册**

```js
// 仅在浏览器环境注册组件
if (typeof window !== 'undefined') {
  const { registerAll } = await import('aiflow-ui');
  registerAll();
}
```

**3.2 SSR 预渲染 Light DOM**

服务端渲染组件的 Light DOM 结构（含 L2 class），客户端 upgrade 后接管：

```jsx
// Next.js 示例
function ProductList({ items }) {
  return (
    <>
      {/* 服务端预渲染 Light DOM 结构 */}
      <af-list data={JSON.stringify(items)} item-height={48}>
        <div class="list">
          {items.map((item, i) => (
            <div class="list-item" key={i}>
              <div class="body">{item.title}</div>
            </div>
          ))}
        </div>
      </af-list>
      {/* 客户端 hydrate */}
      <Script src="/aiflow-ui.js" strategy="lazyOnload" onLoad={() => window.AiflowUI?.registerAll()} />
    </>
  );
}
```

**3.3 组件 SSR 兼容性矩阵**

| 组件 | SSR 预渲染 | 客户端 upgrade | 注意 |
|---|---|---|---|
| af-list | ✓ 渲染 .list 结构 | ✓ 接管虚拟滚动 | 需 data 属性 |
| af-swiper | ✓ 渲染 slides | ✓ 接管 touch | Shadow 内不预渲染 |
| af-tabs | ✓ 渲染 tabbar + panels | ✓ 接管切换 | — |
| af-dialog | ✗ 不预渲染 | ✓ showModal | 仅客户端 |
| af-toast | ✗ 不预渲染 | ✓ 单例 | 仅客户端 |
| af-action-sheet | ✗ 不预渲染 | ✓ popover | 仅客户端 |
| af-picker | ✗ Shadow 不预渲染 | ✓ 接管 | 仅客户端 |
| af-dropdown | ✗ 不预渲染 | ✓ popover | 仅客户端 |
| af-img | ✓ 渲染 img + 占位 | ✓ 懒加载 | 需 src 属性 |
| af-backtop | ✗ 不预渲染 | ✓ | 仅客户端 |

#### 4. 验收标准

- [ ] README 含 SSR 章节
- [ ] Next.js demo 可运行

---

### IP-9 官方 demo 站

#### 1. 目标

为 10 个组件提供可交互 demo，与 eval 飞轮互补。

#### 2. 方案对比

| 方案 | 优点 | 缺点 | 选择 |
|---|---|---|---|
| Storybook | 生态成熟，props 面板 | 体积大，与"原生优先"理念冲突 | 否 |
| 自建 demo 站（Vite + 原生） | 轻量，贴合库哲学 | 需自研 props 面板 | ✓ |

#### 3. 结构

```
demo/
├── index.html          # 入口，组件列表
├── components/
│   ├── af-list.html    # 各组件 demo
│   ├── af-swiper.html
│   └── ...
└── props-panel.js      # 简易 props 调节面板
```

#### 4. 验收标准

- [ ] 10 组件均有可交互 demo
- [ ] props 可调节

---

### IP-10 slotchange 监听补齐

#### 1. 目标

为 af-tabs（af-picker 若需）补齐 slotchange 监听，支持动态增删子元素。

#### 2. af-tabs 实现

```js
mounted() {
  this._buildShell();
  this._renderTabs();
  this._renderPanels();
  this._bindClick();
  this._bindKeydown();
  this._bindSlotChange();  // 新增
  this.setActive(this.activeIndex, true);
}

_bindSlotChange() {
  // 监听 slotted 面板的增删
  this._onSlotChange = () => {
    this._renderTabs();
    this._renderPanels();
    this.setActive(this.activeIndex, true);
  };
  // af-tabs 无 slot 元素（Light DOM），用 MutationObserver 监听子节点变化
  this._observer = new MutationObserver(this._onSlotChange);
  this._observer.observe(this, { childList: true, subtree: false });
}

unmounted() {
  this._tabbar?.removeEventListener('click', this._onClick);
  this._tabbar?.removeEventListener('keydown', this._onKeydown);
  this._observer?.disconnect();
}
```

> 注：af-tabs 是 Light DOM 且面板通过 `div[slot]` 传入，无 `<slot>` 元素，故用 `MutationObserver` 监听 `childList` 变化。这与 af-swiper（有 Shadow `<slot>`）的 `slotchange` 事件机制不同。

#### 3. af-picker 评估

af-picker 当前为 Shadow DOM，选项通过 `data` 属性传入（非 slot），无 slotted 子元素动态增删需求。**结论：af-picker 不需 slotchange**。

#### 4. 验收标准

- [ ] 动态增删 tab 后 ARIA + 面板同步更新
- [ ] MutationObserver 在 unmounted 时正确断开

---

## 设计决策索引

| 决策编号 | 决策内容 | 所属 IP |
|---|---|---|
| D-IT-01 | 类型文件手写 .d.ts，非 JSDoc 生成 | IP-1 |
| D-IT-02 | AfList 支持泛型 \<T\>，其余组件用 unknown | IP-1 |
| D-IT-03 | ESLint 版本按 registry 实际为准，CI 增 npm ci 验证 | IP-2 |
| D-IT-04 | af-tabs 面板改为原地加 ARIA（不搬运），保留引用与事件 | IP-3 |
| D-SW-01 | af-switch 用 Light DOM + role=switch | IP-4 |
| D-SW-02 | af-switch 需在 L2 新增 .switch 配方 | IP-4 |
| D-SB-01 | af-search-bar 用 Light DOM 复用 .search-input | IP-5 |
| D-SB-02 | 防抖用 setTimeout，debounce=0 时不防抖 | IP-5 |
| D-SK-01 | af-skeleton-page 4 种变体用模板字符串组合 | IP-6 |
| D-SK-02 | 需在 L2 新增 .skeleton-block 配方 | IP-6 |
| D-EX-01 | IP-7 配套控件推迟到 v1.4.0 评估 | IP-7 |
| D-SS-01 | SSR 采用客户端条件注册 + Light DOM 预渲染 | IP-8 |
| D-DM-01 | demo 站自建（Vite + 原生），不用 Storybook | IP-9 |
| D-SC-01 | af-tabs 用 MutationObserver（非 slotchange）监听子节点 | IP-10 |
| D-SC-02 | af-picker 不需 slotchange（选项走 data 属性） | IP-10 |
