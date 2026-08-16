# Vant → @af-mobile/ui 替代方案对比与迁移设计

> 目标：给 vant 用户提供一份**可执行的平滑切换方案**——能力映射、API 范式对照、缺口处理路径，以及本方案如何融入 AI 生成链路。
> 结论先行：**vant 约 70 个组件中，28 个有 af-* 一对一对应，~15 个由 L2 配方或原生 HTML 覆盖，真实缺口 ~12 个且全部有逃生舱**。交互类组件几乎无痛迁移；Vue 生态深度绑定（unplugin 自动导入、`van-*` 全局类型）是主要迁移成本。

---

## 目录

- [0. 定位差异：范式不同，不是简单竞品](#0-定位差异范式不同不是简单竞品)
- [1. 能力映射总表](#1-能力映射总表)
- [2. API 范式对照](#2-api-范式对照)
- [3. 迁移策略：三层分级](#3-迁移策略三层分级)
- [4. 真实缺口清单与处理路径](#4-真实缺口清单与处理路径)
- [5. 方案如何投喂 AI / 融入项目](#5-方案如何投喂-ai--融入项目)
- [6. 不建议迁移的场景（诚实边界）](#6-不建议迁移的场景诚实边界)

---

## 0. 定位差异：范式不同，不是简单竞品

| 维度 | Vant 4 | @af-mobile/ui |
|---|---|---|
| 技术形态 | Vue 3 组件库（SFC 编译时组件） | Web Components（浏览器运行时标准） |
| 框架绑定 | 仅 Vue（React 需 @vant/react 等社区包） | 框架无关：Vue / React 19 / 原生 / SSR 均直用 |
| 样式体系 | BEM class + `--van-*` CSS 变量 | 四层体系：Token(43) → 配方+原子(154 封闭白名单) → 组件 → ESLint 约束 |
| 生成保障 | 无（AI 自由发挥，靠 review） | System Prompt + ESLint 20 规则 + CI + 数据飞轮，AI 生成质量有闸门 |
| 体积 | 全量较大，依赖 unplugin 按需 | 源码 ESM + `register()` 按需 + CSS 摇树，全量 28 组件 ≤ 23.7KB gzip |
| 暗色主题 | ConfigProvider / CSS 变量 | `data-theme` + `initTheme()/toggleTheme()` + tokens.project.css 覆盖 |

**一句话**：vant 是"给工程师的 Vue 组件库"；@af-mobile/ui 是"给 AI 生成的约束化原语集"。迁移的本质是**从编译时组件换成运行时标准元素**——换掉的是范式，留下的是（大部分）同名能力。

---

## 1. 能力映射总表

### 1.1 直接对应（28 个，标签名几乎同名，改前缀即可）

| vant | af-* | 迁移注记 |
|---|---|---|
| ActionSheet | `<af-action-sheet>` | 原生 popover API 承载 |
| BackTop | `<af-backtop>` | — |
| Badge | `<af-badge>` | — |
| Calendar | `<af-calendar>` | — |
| Cascader | `<af-cascade-picker>` | — |
| CountDown | `<af-countdown>` | — |
| Dialog | `<af-dialog>` | `showDialog({...})` → 元素 + `.open()`；自带焦点陷阱 |
| DropdownMenu | `<af-dropdown>` | 单级；多级用 cascade-picker 组合 |
| Field | `<af-field>` | 校验逻辑外置到页面层 |
| Image | `<af-img>` | 自带懒加载/占位/失败兜底（Lazyload 不再需要） |
| List | `<af-list>` | 内置虚拟滚动 + `loadmore` 分页协议 |
| NavBar | `<af-navbar>` | — |
| NoticeBar | `<af-notice-bar>` | — |
| Picker | `<af-picker>` | vant 级联列也可先降级为 cascade-picker |
| Progress | `<af-progress>` | — |
| PullRefresh | `<af-pull-refresh>` | — |
| Rate | `<af-rate>` | — |
| Search | `<af-search-bar>` | 自带防抖/清除 |
| Skeleton | `<af-skeleton-page>` | 整页 4 变体；局部骨架用 `.skeleton-line` |
| Stepper / InputNumber | `<af-stepper>` | — |
| Steps | `<af-steps>` | — |
| SwipeCell | `<af-swipe-cell>` | — |
| Swipe | `<af-swiper>` | loop/autoplay/键盘导航内置 |
| Switch | `<af-switch>` | — |
| Tabbar | `<af-tabbar>` | — |
| Tabs / Tab | `<af-tabs>` | — |
| Toast | `<af-toast>` | `showToast('x')` → `toastEl.show('x')` 单例 |
| Uploader | `<af-upload>` | — |

### 1.2 配方替代（L2 class + 原生元素，零 JS 零组件）

| vant | af 方案 | 说明 |
|---|---|---|
| Button | `.btn` + `.btn-ghost/.btn-danger/.btn-block/.btn-sm/.btn-lg` | 原生 `<button>` |
| Cell | `.cell` / `.list-item` | 原生 div；可点击加 `role="button"` + tabindex |
| Checkbox | `.checkbox` 配方 + `<input type="checkbox">` | 原生 a11y/键盘免费获得 |
| Radio | `.radio` 配方 + `<input type="radio">` | 同上 |
| Tag | `.tag`（含语义变体） | — |
| Avatar | `.avatar` | 图片头像可用 `<af-img>` 组合 |
| Divider | `.divider` | — |
| Empty | `.empty` | 配文案/按钮组合 |
| Form | `.form-row` + `.label` + `.input` + `.form-err` | 原生 `<form>` + 校验外置 |
| Grid | 原生 CSS Grid + `g-*` 原子 | — |
| Layout (Row/Col) | 原生 flex/grid + `f/fc/jcsb/aic` 原子 | — |
| Loading | `.skeleton-line`（加载占位）/ `.spinner` 类配方 | 阻塞态用 af-dialog + 文案 |
| Icon | inline SVG（各组件内嵌） | 无独立 icon font；迁移时抽成项目 SVG 资产 |

### 1.3 原生能力替代（2022+ 浏览器标准，见 AGENTS.md 原生优先原则）

| vant | 原生方案 |
|---|---|
| Popover | 原生 `popover` API（af-dropdown / af-action-sheet 同款机制） |
| Overlay | `dialog::backdrop`（af-dialog 自带） |
| Collapse / Accordion | `<details><summary>` + 配方（或 recipes.project.css 扩展） |
| Notify | `<af-toast>` 或 `.notice-bar` 变体 |
| Lazyload | `<af-img>` 内置 / 原生 `loading="lazy"` |
| ImagePreview | `<af-swiper>` 全屏变体组合（半成品，见 §4） |

---

## 2. API 范式对照

### 2.1 双向绑定：v-model → property + 事件

```vue
<!-- vant -->
<van-switch v-model="checked" />
```

```html
<!-- af（任意框架/原生） -->
<af-switch id="s"></af-switch>
<script type="module">
  const s = document.getElementById('s');
  s.addEventListener('af-switch:change', (e) => { state.checked = e.detail.checked; });
</script>
```

Vue 3 直用时接近原样：`<af-switch :checked="checked" @change="checked = $event.detail.checked" />`。

### 2.2 弹层：函数调用 → 元素方法

```js
// vant
import { showConfirmDialog } from 'vant';
showConfirmDialog({ title: '标题', message: '确认删除？' }).then(() => { /* ... */ });
```

```html
<!-- af：声明式元素 + 命令式 open/close，事件携带结果 -->
<af-dialog id="dlg"><div slot="body">确认删除？</div></af-dialog>
<script type="module">
  const dlg = document.getElementById('dlg');
  dlg.addEventListener('af-dialog:close', (e) => { if (e.detail?.action === 'ok') del(); });
  dlg.open();
</script>
```

### 2.3 其余高频对照

| vant 习惯 | af 对应 |
|---|---|
| `<template #title>` 具名插槽 | `slot="body"` / `slot="footer"`（Light DOM slot） |
| `import { Button } from 'vant'` + 自动按需 | `import { register } from '@af-mobile/ui'; register('af-switch')`（显式按需，tree shaking 等价） |
| `--van-button-primary-background` 覆盖 | `tokens.project.css` 覆盖 `--c-brand` 等 token（L4 禁令：不可重定义 token 名，只能改值） |
| ConfigProvider 主题 | `data-theme="dark"` + `initTheme()` |
| 全局类型（van-* 标签提示） | `src/index.d.ts` 提供组件类类型；标签级提示由框架 `isCustomElement` 配置解决 |

---

## 3. 迁移策略：三层分级

```
L1 可直替（28 组件 + 配方类）：改标签前缀 + v-model 改事件，页面结构不变
L2 需改写：弹层函数调用 → 元素方法；校验/多级 dropdown 逻辑外置到页面层
L3 需补缺口：§4 清单，走 recipes.project.css / extraClass / 原生 / 新组件立项
```

**逐页迁移 playbook**（推荐节奏）：

1. 挑一个纯展示页（List/Cell/Card 类）试点，验证 L1 直替手感；
2. 表单页迁移：Field 直替 + Checkbox/Radio 换配方 + 校验逻辑收敛到 `createPage` 的 actions；
3. 弹层密集页：把 `showXxx()` 调用点收拢为页面级 `<af-dialog>/<af-action-sheet>` 元素 + 事件路由；
4. 每页迁完跑 `check_compliance`（MCP）或 `npx aiflow lint <路径>`，保证落到白名单体系内。

---

## 4. 真实缺口清单与处理路径

> 与"组件数量不足"结论一致：缺口优先走逃生舱，不盲目立项。

| 缺口 | 优先级 | 处理路径 |
|---|---|---|
| Slider 滑块 | 高 | **建议立项 L3**（原生 `<input type="range">` + 配方即可起步，成本低） |
| Collapse 折叠面板 | 高 | 原生 `<details>` + recipes.project.css（无需组件） |
| ImagePreview 图片预览 | 中 | af-swiper 全屏变体组合；或 recipes.project.css |
| NumberKeyboard / PasswordInput | 中 | recipes.project.css + 原生 `inputmode`（支付场景组合） |
| Circle 环形进度 | 低 | SVG `stroke-dasharray` 配方 |
| FloatingBubble / FloatingPanel | 低 | 原生 `drag`（2025+）或少量 JS + 配方 |
| Sidebar / TreeSelect | 低 | af-tabs 垂直变体 / cascade-picker 承载 |
| ShareSheet | 低 | af-action-sheet 变体（options + 描述） |
| GoodsAction / SubmitBar | 中 | `.actions` / `.checkout-bar` 配方已覆盖大半，差价场景走 recipes.project.css |
| AddressEdit / AddressList / Area | 中 | af-field + af-cascade-picker（省市区 tree）组合，业务层组装 |
| Sku / Coupon 等重业务组件 | 低 | 不建议库内对齐——属业务模板，回归 Block 复活条件（结构完整性失败 >30%）再议 |

---

## 5. 方案如何投喂 AI / 融入项目

> 本文档**可以直接投喂**，但要选对注入点——原则：**常驻 prompt 只放高频精简知识，全量对照表按需检索**。

| 形式 | 成本 | 适用 | 建议 |
|---|---|---|---|
| A. 文档即知识源：AI 编码工具按需 Read 本文档 | 零 | TRAE / Claude Code / Cursor 会话内迁移任务 | ✅ 立即可用 |
| B. 消费端规则注入：starter `.trae/rules.md` 加一行"vant 迁移先读映射表" | 极低 | 所有 AI 生成项目 | ✅ 随 `npx aiflow create` 分发 |
| C. MCP `get_prompt` 关键词裁剪：需求含 "vant/迁移/van-" 时注入 §1 精简映射 few-shot | 中（~30 行 prompt） | MCP 工作流 | ✅ 推荐，符合现有按需求裁剪机制 |
| D. 组件速查表加 vant 别名列（README + system-prompt 同步） | 低（+1 列） | 让 AI 天然认识 vant 词汇 | 可选，需过 `prompt:check` 三源同步 |
| E. 全表进 system-prompt 常驻 | 高（体积预算） | — | ❌ 不做，prompt 膨胀得不偿失 |
| F. 迁移场景进 eval 飞轮 | 中 | 长期质量 | 把"vant 页面 → af 页面"写进 prompts.jsonl，统计迁移 pass@1 |

**推荐组合：A + B 先行（零改动），C 作为 MCP 增强，F 做长期验证。**

---

## 6. 不建议迁移的场景（诚实边界）

1. **深度 Vue 生态绑定**：依赖 `unplugin-vue-components` 自动导入、`van-*` 全局模板类型、Nuxt 模块生态——迁移收益低于改造成本；
2. **重业务组件重度使用**：Sku / Coupon / AddressEdit 直接构成页面主体的电商项目，af 需要大量业务层重组；
3. **需要 vant 特有交互细节**：如 FloatingPanel 物理回弹、NumberKeyboard 键盘联动等，先确认 §4 路径可接受再迁；
4. **团队无 lint/CI 约束习惯**：af 的价值一半在 L4 约束层，绕过约束层使用等于只用了一半。

反之，**新项目 / AI 生成主导 / 需要跨框架 / 极致体积** 四类场景，迁移收益最大。
