# AIFlow UI —— Charts 图表子库详细设计（@af-mobile/ui/charts）

> 状态：**已实施**（Phase 1-2 完成，5 组件 + 内核全部落地，2026-08-16）。验收记录见 §11。
> 定位：L3 之上的**可选子库**，独立入口 `@af-mobile/ui/charts`，不进主 `index.js`。
> 基线：2022+ 移动端浏览器（iOS 16+ / Chrome 99+），不考虑 PC 兼容与降级。

---

## 目录

- [0. 概述与范围](#0-概述与范围)
- [1. 架构与目录结构](#1-架构与目录结构)
- [2. 技术选型：为什么是原生 SVG](#2-技术选型为什么是原生-svg)
- [3. 内核模块设计（src/charts/lib/）](#3-内核模块设计srcchartslib)
- [4. 共享契约（五组件统一遵守）](#4-共享契约五组件统一遵守)
- [5. 组件逐个详设](#5-组件逐个详设)
- [6. 无障碍设计](#6-无障碍设计)
- [7. 体积预算与 size-check 集成](#7-体积预算与 size-check-集成)
- [8. 三源同步 / 类型 / L4 接入](#8-三源同步--类型--l4-接入)
- [9. 测试策略](#9-测试策略)
- [10. 明确不做清单](#10-明确不做清单)
- [11. 实施分期](#11-实施分期)

---

## 0. 概述与范围

### 0.1 问题

移动端 H5 需要 1-2 张图（趋势/占比/漏斗）时，引入 ECharts 按需构建也要 **~110-150KB gzip**，占一个典型 AIFlow 页面总预算（主库全量 23.8KB + coreRuntime 5.4KB）的 4-6 倍。ECharts 的体积大头（zrender 双渲染器、25+ 图表、5 套坐标系、dataZoom/visualMap/toolbox）在移动端 H5 场景中是"为没出现的需求预付的抽象税"。

### 0.2 目标

- **5 个组件覆盖移动端 ~95% 高频图表场景**（line/area/spark/scatter、bar/条形/堆叠/分组、pie/donut/半环/玫瑰、radar、funnel，共 15+ 图型，大部分靠 variant 实现）
- **全量子级 ~15KB gzip**（内核 ~3.5KB + 5 组件 ~11KB），对比 ECharts 按需 ~10 倍缩减
- **对主库零影响**：不进 `index.js`，不 import 不加载，主库 23.8KB 预算线不动
- **复用现有工程管线**：token 主题、五态、i18n、ARIA、size-check、whitelist 三源同步全部沿用 L3 规范

### 0.3 非目标（详见 §10）

Canvas 渲染、geo 地图、3D、dataset transform、dataZoom/visualMap/toolbox、K 线、大数据渐进渲染、SSR/DSD 预渲染（图表数据驱动，客户端渲染即可，同 af-calendar）。

---

## 1. 架构与目录结构

```
src/charts/
├─ lib/                        # 内核（5 个模块，被 5 组件共享）
│  ├─ scale.js                 # 线性刻度 + nice-ticks 算法
│  ├─ geometry.js              # path 字符串生成（折线/平滑/弧/雷达多边形/漏斗梯形）
│  ├─ render.js                # SVG 元素工厂 + ResizeObserver + IntersectionObserver 懒渲染
│  ├─ chart-theme.js           # getComputedStyle 读 token + themechange 缓存失效
│  └─ tooltip.js               # Shadow DOM 内 DOM tooltip + 最近点查找
├─ components/
│  ├─ af-chart-line.js         # 折线/面积/散点/sparkline
│  ├─ af-chart-bar.js          # 柱状/条形/堆叠/分组
│  ├─ af-chart-pie.js          # 饼/环形/半环/玫瑰
│  ├─ af-chart-radar.js        # 雷达
│  └─ af-chart-funnel.js       # 漏斗
└─ index.js                    # 命名导出 + registerCharts() / registerChart()
```

**分发与入口**（`package.json` `exports` 新增一条）：

```json
"./charts": "./src/charts/index.js"
```

**主库影响清单**：

| 触点 | 改动 | 影响 |
|---|---|---|
| `src/index.js` | 不动 | 0 |
| 主库体积预算（total 23.8KB） | 不动 | 0 |
| `package.json` exports | +1 行（`./charts`） | 需跑 `npm run build && npm run publish:check`（AGENTS §2） |
| `whitelist-v1.json` components | +5 个 `af-chart-*` 标签 | 三源同步（§8） |
| `size-check.mjs` BUDGET | +2 条预算线（§7） | 独立预算，不碰主库线 |

消费端接入：

```js
// 按需（推荐）
import { AfChartLine } from '@af-mobile/ui/charts';
customElements.define('af-chart-line', AfChartLine);

// 或辅助函数
import { registerChart, registerCharts } from '@af-mobile/ui/charts';
registerChart('af-chart-line');   // 单个
registerCharts();                  // 全部 5 个（失去 Tree Shaking）
```

---

## 2. 技术选型：为什么是原生 SVG

| 维度 | 原生 SVG（选定） | 原生 Canvas | echarts/core 薄壳 |
|---|---|---|---|
| 命中检测 | **DOM 事件天然免费（0 行）** | 手写反算 ~200 行 | 库内已含 |
| DPR 适配 | **矢量天然清晰（0 行）** | 矩阵运算 ~80 行 | 库内已含 |
| jsdom 单测 | **DOM 断言直接可测** | 需 canvas-mock，测试基建翻倍 | 可测但重 |
| 动画 | CSS transition/keyframes + `prefers-reduced-motion` 一行覆盖 | 手写 rAF 动画引擎 | 自带引擎（体积税） |
| 主题 | `getComputedStyle` 读 `var(--c-*)`，深色免费跟随 | 手动监听重绘 | 主题 JSON 体系 |
| 移动端数据量上限 | 折线 ≤200 点 / 柱 ≤30 / 饼 ≤10 块 —— 足够 | 无上限 | 无上限 |

决策依据：图表库的测试基建与无障碍成本是隐性大头，SVG 方案把这两块降为零；移动端图表数据量远低于 SVG 承受阈值。

---

## 3. 内核模块设计（src/charts/lib/）

内核是**唯一付一次的成本**。每种图表组件只是"数据 → 几何映射"的薄层。

### 3.1 scale.js（~90 LOC / ≤0.5KB）

```js
niceTicks(min, max, tickCount = 5)     // → { ticks: [0, 25, 50, 75, 100], min, max }
linear(domain, range)                  // → (v) => 像素值，纯函数
```

- nice-ticks：步长取 1/2/5×10^n 归整（经典算法 ~40 行），保证刻度值"好看"
- 含零策略：`clamp-zero`（bar/area 从 0 起）与 `nice`（line 允许压缩到数据区间）两种，由组件选择

### 3.2 geometry.js（~180 LOC / ≤1.0KB）

```js
linePath(points, { smooth })           // 折线 path；smooth 用 Catmull-Rom → 三次贝塞尔（~30 行）
areaPath(points, baseline, { smooth }) // 面积 path（linePath + 闭合到基线）
arcPath(cx, cy, r, r0, a0, a1)         // 环形扇区 path（pie/donut/rose/半环共用）
radarPath(cx, cy, r, angles, values)   // 雷达多边形 path（极坐标直连）
funnelPath(widths, heights, i)         // 漏斗梯形 path（零坐标系，纯宽度比例）
```

全部返回 SVG `d` 字符串（纯函数、可单测），不含任何 DOM 操作。

### 3.3 render.js（~170 LOC / ≤0.9KB）

```js
svgEl(tag, attrs)                      // SVG 命名空间元素工厂，attrs 一次性 set
bindResize(el, rerender)               // ResizeObserver + rAF 防抖；返回 disconnect
bindLazy(el, render)                   // IntersectionObserver 首次可见才渲染；返回 disconnect
```

- 组件用 **1:1 像素坐标**（`width/height` 属性 = 实测尺寸，不用 viewBox 缩放），文字不因容器形变而变形
- 两个 Observer 在 `unmounted()` 中断开（AGENTS 反模式 #4 清理要求）

### 3.4 chart-theme.js（~60 LOC / ≤0.4KB）

```js
chartColors()                          // → 6 色序列数组
watchTheme(cb)                         // themechange 时清缓存并回调；返回取消函数
```

- 取色策略（**不新增 L1 token，零 CODEOWNERS 评审**）：
  `[--c-brand, --c-success, --c-warn, --c-danger, --c-muted]` 轮转，第 6 色起用 `--c-brand` + `fill-opacity:.55` 分层
- 数据项可显式 `color` 字段覆盖（消费端自由度）
- 主题切换（`data-theme` 变化 → `themechange` 事件）时缓存失效 + 重绘，深色模式免费跟随

### 3.5 tooltip.js（~110 LOC / ≤0.7KB）

```js
createTooltip(shadowRoot)              // → { show(x, y, html), hide(), move(x, y) }
nearestIndex(points, px)               // 触点 x 坐标 → 最近数据点索引
```

- **DOM 实现而非 SVG 绘制**：Shadow DOM 内绝对定位 div，跟随触点、边界翻转
- 触发：`pointerdown`/`pointermove`（触摸友好），`pointerleave`/`scroll` 隐藏
- `aria-live="polite"`（AGENTS 反模式 #13）

**内核合计：~610 LOC / ≤3.5KB gzip（预算 4.5KB 含容差）。**

---

## 4. 共享契约（五组件统一遵守）

### 4.1 数据契约

| 场景 | 属性 | 形态 |
|---|---|---|
| 单序列（line/bar/pie/funnel） | `data` | `[{"label":"1月","value":120}]`，可选项 `color` |
| 多序列（仅 line/bar） | `labels` + `series` | `labels:["1月","2月"]`，`series:[{"name":"今年","values":[1,2]}]` |
| 雷达 | `data` | `[{"label":"速度","value":80,"max":100}]`（`max` 缺省 100） |

`data`/`series` 支持两种赋值：attribute JSON 字符串（`:bind` 场景）/ property 直接赋数组（`bind.js` 复杂对象优先走 property）。

### 4.2 五态

| 态 | 触发 | 表现 |
|---|---|---|
| loading | `loading` 属性 | 图表形骨架（图表区 shimmer 矩形），`aria-busy="true"` |
| error | `error` 属性（非空字符串为文案） | `.empty` 错误文案 + 重试按钮 → 派发 `af-chart-{x}:retry` |
| empty | `data` 为空数组 | `.empty` "暂无数据"（走组件 `static i18n` 映射，v1.6 模式） |
| success | data 非空 | 渲染图表 |
| （离屏） | IntersectionObserver | 首次可见才渲染（骨架占位） |

### 4.3 通用属性

| 属性 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `height` | Number(px) | `240` | 图表高度（spark 变体建议 60-80） |
| `legend` | Boolean | `false` | 图例（色点 + 名称，横向 flex；v1 只读展示，交互留 v1.1） |
| `loading` / `error` | Boolean / String | `false` / `''` | 五态 |

### 4.4 事件

遵循 `wc-event-naming`（`af-{组件}:{动作}`，`emit` 带 `composed:true`）：

| 事件 | detail | 时机 |
|---|---|---|
| `af-chart-line:select` 等 | `{ index, seriesIndex, label, value }` | 点选数据点（tooltip 触摸即出，tap 确认选择） |
| `af-chart-{x}:retry` | `{}` | error 态点重试 |

### 4.5 动画（CSS 驱动，内核统一一份）

| 图型 | 入场动画 |
|---|---|
| line | `stroke-dasharray/dashoffset` 描边生长 |
| bar | `transform: scaleY(0→1)`，`transform-box: fill-box; transform-origin: bottom` |
| pie/radar | `opacity 0→1` + 微缩放 |
| funnel | `transform: scaleX(0→1)` |

内核 CSS 末尾统一：

```css
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
```

（AGENTS 反模式 #2；Shadow DOM CSS 全用 `var(--*)` token，`wc-shadow-use-token` 合规。）

---

## 5. 组件逐个详设

### 5.1 af-chart-line（P0 · 折线/面积/散点/迷你趋势）

#### 概述

| 项 | 内容 |
|---|---|
| 职责 | (a) 折线/多序列折线；(b) 面积图；(c) 平滑曲线；(d) 散点（去连线）；(e) sparkline 迷你趋势（无轴，嵌 KPI 卡） |
| 场景 | 月度趋势、活跃用户曲线、KPI 卡内嵌迷你趋势、双序列对比、相关性散点 |
| 预算 | ~350 LOC / ≤2.5KB gzip |

#### DOM 模式

Shadow DOM（图表专属样式封闭，token 穿透跟随主题）。

#### 属性 API

| 属性 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `data` | JSON Array | `"[]"` | 单序列 `[{label,value,color?}]` |
| `labels` / `series` | JSON Array | `"[]"` | 多序列（与 `data` 互斥，`series` 优先） |
| `variant` | String enum | `"line"` | `line` / `area` / `scatter` / `spark` |
| `smooth` | Boolean | `false` | Catmull-Rom 平滑（line/area 有效） |
| `show-axis` | Boolean | `true` | spark 变体自动忽略 |
| `height` / `legend` / `loading` / `error` | — | — | 共享契约 §4.3 |

#### 算法要点

1. y 轴 `niceTicks(min,max,5)`；x 轴标签**自动抽稀**（相邻标签重叠时按 `Math.ceil(n / maxLabels)` 间隔取，`maxLabels = floor(width / 48)`，~10 行）
2. `geometry.linePath/areaPath` 生成 `d`；scatter 变体只渲染 `<circle r=3>`
3. spark：跳过轴/tooltip/图例，`height` 默认改 60，线宽 2、末点 `<circle>` 强调
4. resize：`bindResize` → rAF 合并 → 全量重绘（200 点级重绘 <1ms，不做增量 diff）

#### Shadow 结构

```
<af-chart-line>
  #shadowRoot
  ├─ <style>                     ← 内核共享 CSS + line 专属（描边动画）
  ├─ <svg part="chart" role="img" aria-label="..."> … </svg>
  ├─ <div class="legend" part="legend"> … </div>
  ├─ <div class="tooltip" part="tooltip" aria-live="polite"></div>
  └─ <div class="sr-table"> … </div>     ← 视觉隐藏数据表（§6）
```

### 5.2 af-chart-bar（P0 · 柱状/条形/堆叠/分组）

#### 概述

| 项 | 内容 |
|---|---|
| 职责 | (a) 垂直柱；(b) 水平条形（长类目名）；(c) 堆叠柱；(d) 分组柱 |
| 场景 | 类目值对比、销量排行、多产品线构成、双维度对比 |
| 预算 | ~280 LOC / ≤2.2KB gzip |

#### 属性 API

| 属性 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `data` / `labels` / `series` | — | — | 同 §4.1（堆叠/分组需 `series`） |
| `variant` | String enum | `"column"` | `column` / `bar`(水平) / `stacked` / `grouped` |
| `max-count` | Number | `30` | 超出截断为前 N + "其他"聚合（移动端可读性红线） |
| 共享属性 | — | — | `height/legend/loading/error` |

#### 算法要点

1. y（或 x，水平变体）轴 `niceTicks` + clamp-zero（柱必须从 0 起）
2. 柱宽 `band = plot / (n * slotRatio)`，`slotRatio`：单序列 .6 / 分组 .7（组内再分）
3. 圆角用 SVG 原生 `rx` 属性（`min(band/4, 6)`），**不写 path**（对比 Canvas 需 `roundRect`）
4. 堆叠：逐段累加 y 基线；段色 = `chartColors()` 轮转
5. 值标签：柱内/柱顶 `t-sm`，宽不足（<36px）自动隐藏

### 5.3 af-chart-pie（P0 · 饼/环形/半环/玫瑰）

#### 概述

| 项 | 内容 |
|---|---|
| 职责 | (a) 饼图；(b) 环形 donut（中心 KPI）；(c) 半环；(d) 玫瑰图（半径映射数值） |
| 场景 | 占比构成 ≤6 块（超过引导用 bar）、完成度半环、数值差异强调的玫瑰 |
| 预算 | ~260 LOC / ≤2.2KB gzip |

#### 属性 API

| 属性 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `data` | JSON Array | `"[]"` | `[{label,value,color?}]`，**>6 项自动聚合为"其他"**（走 i18n） |
| `variant` | String enum | `"pie"` | `pie` / `donut` / `half` / `rose` |
| `inner-radius` | Number(%) | `60` | donut 内径百分比 |
| `center-text` | String | `''` | donut 中心 KPI 文案（`{total}` 占位符替换合计） |
| 共享属性 | — | — | `height/legend/loading/error` |

#### 算法要点

1. 角度从 12 点顺时针起算（最大块居首的排序可选：`sort` Boolean，默认按原序尊重业务输入）
2. `geometry.arcPath` 统一支持 `r0`（内径）/任意起止角 —— **donut/half/rose/pie 四变体共用一个弧函数**
3. rose：半径 = `r * sqrt(v/max)`（面积正比），角度均分
4. half：`a0=-90°, a1=90°`，常配 `center-text="{total}"` 做完成度
5. 标签：块外引线标签 vs 图例 —— 移动端窄屏默认**图例 + tooltip**，引线标签仅在 `label-out` 属性显式开启

### 5.4 af-chart-radar（P1 · 雷达）

#### 概述

| 项 | 内容 |
|---|---|
| 职责 | 多维能力画像：单/双主体对比（≤2 个多边形，多则可读性崩） |
| 场景 | 用户能力评估、信用评分维度、商品多维对比 |
| 预算 | ~250 LOC / ≤2.0KB gzip |

#### 属性 API

| 属性 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `data` | JSON Array | `"[]"` | `[{label,value,max?}]`（3-8 维） |
| `series` | JSON Array | `"[]"` | 对比主体 `[{"name":"本期","values":[...]},{"name":"上期","values":[...]}]` |
| `shape` | String enum | `"polygon"` | `polygon` / `circle` |
| 共享属性 | — | — | `height/legend/loading/error` |

#### 算法要点

1. 复用 pie 的**极坐标内核**：角度均分 `angles[i] = -90° + i * 360°/n`，半径 = `r * v/max`
2. 网格：3-4 层同心多边形（`stroke: var(--c-border)`）+ 维度标签（超长截断 4 字 + 省略号）
3. 双主体：第二序列 `fill-opacity:.45` + 描边区分；>2 序列渲染前 2 并 console.warn
4. `geometry.radarPath` 一个函数出多边形 path

### 5.5 af-chart-funnel（P1 · 漏斗）

#### 概述

| 项 | 内容 |
|---|---|
| 职责 | 转化漏斗：梯形堆叠 + 层间转化率标注 |
| 场景 | 电商转化（浏览→加购→下单→支付）、招聘漏斗、注册流程 |
| 预算 | ~180 LOC / ≤1.5KB gzip |

#### 属性 API

| 属性 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `data` | JSON Array | `"[]"` | `[{label,value}]`（自动按 value 降序排） |
| `show-rate` | Boolean | `true` | 层间转化率标注（`v[i]/v[i-1]` 百分比） |
| 共享属性 | — | — | `height/legend/loading/error` |

#### 算法要点

1. **零坐标系**：宽度 = `plotWidth * v/max`，居中对齐梯形，`geometry.funnelPath` 直出
2. 层标签左置（label）+ 右置（value + 转化率），窄屏溢出时并入层内两行
3. 配色：`chartColors()` 顺序取（前几层饱和、后几层浅，靠 fill-opacity 阶梯）

---

## 6. 无障碍设计

| 项 | 方案 |
|---|---|
| 图表本体 | `<svg role="img" aria-label="折线图：1月 120，2月 150，…（前 5 项 + 省略）">` 摘要式描述 |
| 完整数据 | Shadow DOM 内**视觉隐藏数据表**（`<table>` + `caption` + `th scope`，`.sr-table` 样式 `position:absolute; clip-path: inset(50%)`），屏幕阅读器可读全量 |
| tooltip | `aria-live="polite"`（AGENTS #13） |
| loading | 根 `aria-busy="true"` |
| 键盘 | 图表为只读可视化，**不做 roving tabindex**（数据表承担可达性）；error 态重试按钮天然可聚焦 |
| reduced-motion | 内核 CSS 统一覆盖（§4.5） |

---

## 7. 体积预算与 size-check 集成

`scripts/size-check.mjs` BUDGET 新增两条独立线（**不碰主库任何既有线**）：

```js
const BUDGET = {
  // ……既有主库预算不动……
  chartsRuntime: 4.5,   // KB，charts 内核 5 模块（external 模式，同 coreRuntime 测法）
  chartsTotal: 15.0,    // KB，5 图表组件 + 内核全量 import（gzip）
};
```

| 项 | 预估 | 预算（阻断线） |
|---|---|---|
| chartsRuntime（scale+geometry+render+theme+tooltip） | ~3.5KB | ≤ 4.5KB |
| 单图表组件（沿用 perComponent 语义） | 1.5-2.5KB | ≤ 2.8KB |
| chartsTotal（5 组件 + 内核） | ~14KB | ≤ 15KB |

测量方式：组件单测 external `../lib/*.js`（内核）与 `../lib/af-element.js`（基类），内核 5 模块仿 `measureCoreRuntime` 建临时入口防 tree-shake。

---

## 8. 三源同步 / 类型 / L4 接入

### 8.1 whitelist 三源

`af-chart-line/bar/pie/radar/funnel` 5 个标签登记：

1. `eslint-plugin-aiflow/utils/whitelist-v1.json` → `components` +5
2. `prompt/system-prompt.md` 注入（`build-prompt.mjs` 自动，跑 `npm run prompt:check` 验证）
3. 图表组件为 Shadow DOM，**无新增 L2 class**，recipes.css 零改动（CSS 全在 Shadow 内）

### 8.2 类型声明

新增 `src/charts/index.d.ts`（5 组件类 + registerChart/registerCharts）；`check-types-sync.mjs` 扩展为双入口核对（主库 28 + charts 5）。主库 `src/index.d.ts` 不动。

### 8.3 L4 规则适配

- `wc-shadow-use-token`：图表 Shadow CSS 全 `var(--*)`，天然合规
- `wc-event-naming`：事件名全量遵循 `af-chart-{x}:{action}`
- `wc-cleanup`：两个 Observer + themechange 订阅在 `unmounted()` 清理
- `wc-aria-required`：`aria-requirements.json` 若为 Shadow 弹层组件维护，图表按 §6 的 role/aria-label 声明同步登记检测分支（AGENTS #5）

### 8.4 i18n

5 组件各带 `static i18n` 映射（loading/error/empty/"其他" 文案），v1.6 模式，无新增运行时依赖。

---

## 9. 测试策略

### 9.1 单元（vitest + jsdom，SVG 方案可直接 DOM 断言）

| 用例组 | 断言 |
|---|---|
| scale | niceTicks(0,103,5) → 步长 25；clamp-zero 生效 |
| geometry | linePath/arcPath/radarPath/funnelPath 输出字符串快照 |
| 五组件 | data 属性 → `<path>/<rect>/<circle>` 数量与 `d` 前缀；variant 切换重渲染；五态切换（loading 骨架 / error+retry 事件 / empty 文案走 i18n） |
| 事件 | 模拟 pointerdown → select 事件 detail `{index,seriesIndex,label,value}` |
| resize | mock ResizeObserver 触发 → 重绘（path 更新）；unmounted 后 observer.disconnect 被调用 |
| a11y | aria-label 摘要生成；`.sr-table` 存在且含全量行 |

### 9.2 e2e（Playwright，随 CI Step 3b）

触摸出 tooltip、sparkline 嵌卡片、donut 中心文案、主题切换（`data-theme=dark` 后取色变化）、reduced-motion 下无动画。

---

## 10. 明确不做清单

| 不做 | 理由 |
|---|---|
| Canvas 渲染 / 双渲染器 | SVG 方案命中检测/DPR/测试三项全免费 |
| geo 地图 / treemap / sankey / graph / 3D | 移动端小屏低频，需第三/四套坐标系，成本失控 |
| dataset transform / visualMap / dataZoom / toolbox | ECharts 交互大件，移动端用 tab 切换时间粒度（af-tabs）替代 |
| K 线 candlestick | 金融场景用专用库 |
| >200 点渐进渲染 | 超出用 LTTB 采样（可选 props，留 v1.1） |
| 图例交互（点选隐藏序列） | v1 只读图例，交互留 v1.1 |
| DSD/SSR 预渲染 | 图表数据驱动，客户端渲染（同 af-calendar 矩阵定位） |

---

## 11. 实施分期

| 期 | 内容 | 产出预算 | 验收 |
|---|---|---|---|
| **Phase 1（MVP）✅ 已实施** | 内核 5 模块 + af-chart-line/bar/pie（含全部 variant）+ size-check 两条预算线 + whitelist/types/prompt 三源同步 + 单测 | chartsTotal ≤ 11KB | ✅ charts 全量 8.83KB gzip；单测 1071 通过；ESLint/size/whitelist/types/aria 全绿 |
| **Phase 2 ✅ 已实施** | af-chart-radar（复用极坐标弧内核）+ af-chart-funnel | chartsTotal ≤ 15KB | ✅ charts 全量（5 组件+内核）10.18KB gzip；单测 1095 通过；publish:check 14/14 |

每期完成后按 AGENTS §2 全量自检（ESLint/测试/size/whitelist/types/aria），exports 变更额外跑 `npm run build && npm run publish:check`。
