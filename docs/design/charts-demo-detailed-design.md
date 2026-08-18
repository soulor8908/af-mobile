# af-mobile UI —— Charts Demo 详细设计

> 状态：**设计中（未实施）**。本文档只产出设计，不做代码改动。
> 上游依赖：charts 子库已实施完成（详见 [charts-sublibrary-detailed-design.md](./charts-sublibrary-detailed-design.md) §11 Phase 1-2 验收记录）。
> 范围：在现有 `demo/` 站补齐 chart 组件演示，覆盖 5 个 `af-chart-*` 组件 + 1 个联动场景页 + 主入口 `demo/index.html` 接入。
> 不在范围：charts 子库本身的能力扩展、新增 chart 类型、改 chart 组件源码。

---

## 目录

- [0. 背景与目标](#0-背景与目标)
- [1. 现状盘点](#1-现状盘点)
- [2. 设计原则与约束](#2-设计原则与约束)
- [3. 文件清单与命名约定](#3-文件清单与命名约定)
- [4. demo/index.html 改动](#4-demoindexhtml-改动)
- [5. af-chart-line.html 详细设计](#5-af-chart-linehtml-详细设计)
- [6. af-chart-bar.html 详细设计](#6-af-chart-barhtml-详细设计)
- [7. af-chart-pie.html 详细设计](#7-af-chart-piehtml-详细设计)
- [8. af-chart-radar.html 详细设计](#8-af-chart-radarhtml-详细设计)
- [9. af-chart-funnel.html 详细设计](#9-af-chart-funnelhtml-详细设计)
- [10. scenarios/af-chart.html 联动演示](#10-scenariosaf-charthtml-联动演示)
- [11. 共享 Mock 数据集](#11-共享-mock-数据集)
- [12. 无障碍与 reduced-motion](#12-无障碍与-reduced-motion)
- [13. 验收标准](#13-验收标准)
- [14. 明确不做清单](#14-明确不做清单)

---

## 0. 背景与目标

### 0.1 背景

charts 子库（`@af-mobile/ui/charts`）已于 2026-08-16 完成 Phase 1-2 全部交付：5 个组件（line/bar/pie/radar/funnel）+ 内核 5 模块（scale/geometry/render/chart-theme/tooltip）落地，chartsTotal 10.18KB gzip，1095 单测通过，ESLint/size/whitelist/types/aria/publish:check 全绿。

但 `demo/` 站目前**完全没有 chart 演示入口**：
- `demo/components/` 下 28 个组件 demo HTML，无一为 `af-chart-*`
- `demo/index.html` 主入口 2 个 section（核心组件 / 交互组件）共 28 个入口，无 chart
- `demo/scenarios/` 13 个 scenario 模块，无 chart 集成场景

结果：消费端开发者无法在本地 `npm run demo` 一眼看到 chart 效果，导致 chart 子库**可用不可见**——这是文档型组件库的可用性缺口。

### 0.2 目标

1. **补齐 5 个 chart 组件的独立 demo 页**，每页演示该组件全部 variant + 五态 + props 面板 + 事件日志，对齐现有 28 个组件 demo 的演示范式
2. **新增 1 个 scenarios 联动演示页**：sparkline 嵌入 KPI 卡 + af-tabs 切换 5 种 chart 类型 + 主题切换 + prefers-reduced-motion 验证
3. **主入口 `demo/index.html` 新增"图表组件" section**，6 个入口（5 组件 + 1 联动页）
4. **不改动任何 src/ 源码**——charts 子库本身不动，仅在 demo/ 增量

### 0.3 非目标（详见 §14）

- 不改 chart 组件源码（API/样式/行为完全照搬现有实现）
- 不新增 chart 类型（geo/treemap/sankey 等明确不做项见上游 §10）
- 不重构 demo 站架构（沿用现有单文件 HTML + module script 模式）
- 不改 ESLint 规则 / whitelist / 类型声明（demo 文件不受 COMPONENT_RULES 约束，受 AI_RULES 约束但 demo 站本身不参与 CI lint）

---

## 1. 现状盘点

### 1.1 charts 子库 API（已实施）

入口 `@af-mobile/ui/charts` 或 `src/charts/index.js`：

| 导出 | 类型 | 说明 |
|---|---|---|
| `AfChartLine / AfChartBar / AfChartPie / AfChartRadar / AfChartFunnel` | class | 5 个组件类 |
| `registerChart(tag)` | function | 注册单个标签（保持 Tree Shaking，幂等） |
| `registerCharts()` | function | 注册全部 5 个（失去 Tree Shaking） |
| `CHART_TAGS` | const | 标签→类映射 |
| `niceTicks / linear / linePath / areaPath / arcPath / polar / radarPath / funnelPath / fmtNum / svgEl / bindResize / bindLazy / CHART_COLORS / seriesColor / seriesOpacity / CHART_CSS / createTooltip / nearestIndex / AfChart` | 各种 | 内核高级导出（demo 演示不直接用） |

### 1.2 5 个 chart 组件实际 API（基于源码核对，本设计的真实真相源）

| 组件 | 标签 | 专有属性 | variant 枚举 | 事件 |
|---|---|---|---|---|
| AfChartLine | `af-chart-line` | `data` / `labels` / `series` / `variant` / `smooth` / `showAxis`(attr:`show-axis`) | `line` \| `area` \| `scatter` \| `spark` | `af-chart-line:select` / `af-chart-line:retry` |
| AfChartBar | `af-chart-bar` | `data` / `labels` / `series` / `variant` / `maxCount`(attr:`max-count`) | `column` \| `bar` \| `stacked` \| `grouped` | `af-chart-bar:select` / `af-chart-bar:retry` |
| AfChartPie | `af-chart-pie` | `data` / `variant` / `innerRadius`(attr:`inner-radius`) / `centerText`(attr:`center-text`) | `pie` \| `donut` \| `half` \| `rose` | `af-chart-pie:select` / `af-chart-pie:retry` |
| AfChartRadar | `af-chart-radar` | `data`({label,value,max?}[]) / `series` / `shape` | `polygon` \| `circle`（shape 字段，非 variant） | `af-chart-radar:select` / `af-chart-radar:retry` |
| AfChartFunnel | `af-chart-funnel` | `data` / `showRate`(attr:`show-rate`) | 无 variant | `af-chart-funnel:select` / `af-chart-funnel:retry` |

5 组件共享契约（来自 `ChartCommonProps`）：

| 属性 | 类型 | 默认 | attr 名 |
|---|---|---|---|
| `height` | Number(px) | `240`（spark 默认 60） | `height` |
| `legend` | Boolean | `false` | `legend` |
| `loading` | Boolean | `false` | `loading` |
| `error` | String | `''`（非空即 error 态） | `error` |
| `lazy` | Boolean | `false` | `lazy` |

### 1.3 现有 demo 演示范式（来自 28 个已存 HTML）

每页统一结构：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>af-xxx demo - af-mobile</title>
  <link rel="stylesheet" href="../../src/index.css">
</head>
<body>
  <main class="page">
    <section class="hero">
      <p class="eyebrow"><a href="../index.html" class="subtitle">← 返回</a></p>
      <h1 class="display">af-xxx 中文名</h1>
    </section>

    <!-- 演示区：组件实例 + caption 日志 -->

    <!-- props 调节面板容器 -->
    <section id="props" class="card"></section>
  </main>

  <script type="module">
    import { AfXxx } from '../../src/components/af-xxx.js';
    customElements.define('af-xxx', AfXxx);
    import { createPropsPanel } from '../props-panel.js';

    // 组件初始化 + 事件绑定
    // createPropsPanel(container, schema, target, onChange?)
  </script>
</body>
</html>
```

`createPropsPanel` schema 类型：`'boolean' | 'number' | 'string' | 'select'`，select 需 `options` 数组，number 可给 `min/max/step`。

### 1.4 主入口 `demo/index.html` 结构

现有 2 个 section（核心组件 18 项 / 交互组件 11 项 + perf）。chart 需新增第 3 个 section。

---

## 2. 设计原则与约束

### 2.1 对齐原则

| 维度 | 现有约定 | chart demo 对齐策略 |
|---|---|---|
| 单文件 HTML | 每组件一页 | 5 个 `af-chart-{x}.html`，1:1 对应 |
| CSS 引入 | `<link rel="stylesheet" href="../../src/index.css">` | 完全照搬（chart 样式在 Shadow DOM 内自带，主 CSS 只提供 page/hero/card 等 layout） |
| 组件加载 | `import { AfXxx } from '../../src/components/af-xxx.js'` | 改路径为 `'../../src/charts/components/af-chart-{x}.js'`（charts 是独立子库，不走主 `src/components/`） |
| props 面板 | `createPropsPanel(container, schema, target)` | 完全复用，schema 按 §5-§9 逐组件定义 |
| 事件日志 | `<p class="caption" id="log">...</p>` | 完全照搬，监听 `af-chart-{x}:select` / `:retry` |
| 返回链接 | `<a href="../index.html">← 返回</a>` | 完全照搬 |
| scenario 模块 | `demo/scenarios/af-{x}.js` 默认导出 `{ tag, name, scenarios: [...] }` | chart 联动用独立 `demo/scenarios/af-chart.html`（不走 scenario 模块模式，理由见 §10.2） |

### 2.2 设计约束（硬性）

1. **不改 chart 源码**：所有 demo 行为必须用现有 API 实现，禁止为 demo 加 props / 改默认值 / 加 hook
2. **不动主库 CSS / whitelist / 类型声明**：demo 文件不参与三源同步（demo 不在 `src/` 内）
3. **5 态必须全覆盖**：每页演示 success / loading / error / empty 至少各 1 例（lazy 在联动页演示）
4. **mock 数据贴近真实业务**：电商转化漏斗、月度活跃趋势、KPI 卡、能力画像——禁止 `[{label:'A',value:1}]` 这种无意义 mock
5. **触摸交互可演示**：tooltip 出现条件 = `pointerdown`/`pointermove`，桌面端鼠标也触发（`pointer` 事件统一），无需触屏
6. **不引第三方图表对比库**：不与 ECharts 同屏对比（避免 demo 站体积膨胀）

### 2.3 设计约束（软性 / 优先级）

1. 每页演示 variant 时优先**横向并列**（用 `.card` + flex），单屏可一眼对比；超过 4 个 variant 时分两行
2. props 面板只控**当前焦点组件**（页面顶部那个），其他 variant 实例只读展示
3. mock 数据全部放在 `<script>` 标签顶部，便于复制改玩

---

## 3. 文件清单与命名约定

### 3.1 新增文件（共 7 个）

| 路径 | 类型 | 大小预估 | 职责 |
|---|---|---|---|
| `demo/components/af-chart-line.html` | HTML | ~5KB | 折线/面积/散点/sparkline 演示 |
| `demo/components/af-chart-bar.html` | HTML | ~5KB | 柱状/条形/堆叠/分组演示 |
| `demo/components/af-chart-pie.html` | HTML | ~5KB | 饼/环形/半环/玫瑰演示 |
| `demo/components/af-chart-radar.html` | HTML | ~4KB | 雷达单/双主体 + polygon/circle 演示 |
| `demo/components/af-chart-funnel.html` | HTML | ~4KB | 漏斗 + 转化率演示 |
| `demo/scenarios/af-chart.html` | HTML | ~6KB | 联动：KPI卡嵌 spark + tabs 切换 5 chart + 主题切换 + reduced-motion |
| `docs/design/charts-demo-detailed-design.md` | MD | — | 本设计文档 |

### 3.2 修改文件（1 个）

| 路径 | 改动 |
|---|---|
| `demo/index.html` | 新增第 3 个 section「图表组件」，6 个入口（5 组件 + 1 联动页） |

### 3.3 命名约定

- 组件 demo 页：`demo/components/af-chart-{type}.html`，与 `src/charts/components/af-chart-{type}.js` 一一对应
- 联动页：`demo/scenarios/af-chart.html`，单数（不是 `af-charts.html`），与 scenario 目录现有 `af-{x}.js` 命名对齐
- 主入口链接文案：`af-chart-{type} 中文名`，中文部分取自上游详设 §5 各组件"职责"

---

## 4. demo/index.html 改动

在现有"交互组件" section 之后追加第 3 个 section。改动定位：现有第 56 行 `</section>` 之后、第 57 行 `</main>` 之前。

### 4.1 改动 diff

```diff
      <a class="cell" href="components/af-countdown.html"><span class="body">af-countdown 倒计时</span></a>
      <a class="cell" href="perf.html"><span class="body">perf 性能监测（web-vitals）</span></a>
    </nav>
  </section>
+
+  <section class="section">
+    <h2 class="section-title">图表组件</h2>
+    <nav class="list">
+      <a class="cell" href="components/af-chart-line.html"><span class="body">af-chart-line 折线/面积/散点</span></a>
+      <a class="cell" href="components/af-chart-bar.html"><span class="body">af-chart-bar 柱状/条形/堆叠</span></a>
+      <a class="cell" href="components/af-chart-pie.html"><span class="body">af-chart-pie 饼/环形/玫瑰</span></a>
+      <a class="cell" href="components/af-chart-radar.html"><span class="body">af-chart-radar 雷达画像</span></a>
+      <a class="cell" href="components/af-chart-funnel.html"><span class="body">af-chart-funnel 转化漏斗</span></a>
+      <a class="cell" href="scenarios/af-chart.html"><span class="body">af-chart 联动场景（KPI卡 + tabs + 主题切换）</span></a>
+    </nav>
+  </section>
  </main>
```

### 4.2 section 命名选型

选「图表组件」而非「数据可视化」：与现有「核心组件」「交互组件」语义层级一致（"组件"为统一后缀），且明确表达这是 L3 组件分类，而非运营概念。

---

## 5. af-chart-line.html 详细设计

### 5.1 演示矩阵

| 区块 | variant | 数据 | 演示要点 |
|---|---|---|---|
| A · 折线（单序列） | `line` | `MONTHLY_ACTIVE`（12 月） | 默认形态，axis + 抽稀标签 |
| B · 折线（多序列对比） | `line` + `series` | `MONTHLY_ACTIVE` + `PREV_YEAR`（去年同曲线） | 双线对比 + 图例 + tooltip 多行 |
| C · 平滑曲线 | `line` + `smooth` | 同 A | Catmull-Rom 平滑对比 A 的折线 |
| D · 平滑 + 多序列 | `line` + `smooth` + `series` | 同 B | 双线平滑对比，区分于 C 的单序列 |
| E · 面积图 | `area` | `REVENUE_TREND`（8 月营收） | 渐变填充 + clamp-zero |
| F · 面积 + 平滑 | `area` + `smooth` | 同 E | 平滑面积对比 E 的折线面积 |
| G · 面积多序列对比 | `area` + `series` | `REVENUE_2Y`（今年 vs 去年营收） | 双序列面积 + 半透明叠加 + 图例 |
| H · 散点图 | `scatter` | `SCATTER_CORRELATION`（20 点：广告投入 vs 转化） | 无连线、点 r=3 |
| I · sparkline 嵌入 | `spark` | `SPARK_7D`（7 日 DAU 迷你） | 无轴、线宽 2、末点强调 |
| J · loading 态 | `line` + `loading` | 任意 | 图表形骨架 + `aria-busy` |
| K · error 态 | `line` + `error="加载失败"` | 任意 | 错误文案 + 重试按钮 → 派发 `af-chart-line:retry` |
| L · empty 态 | `line` + `data=[]` | `[]` | "暂无数据"文案（走 i18n） |
| **焦点组件**（接 props 面板） | `line` | `MONTHLY_ACTIVE` | 切 variant / smooth / show-axis / legend / height |

**variant × 配置组合全集**（共 7 种有效组合，I/K/L 为五态）：

| variant | smooth=false | smooth=true | 单序列 | 多序列 |
|---|---|---|---|---|
| `line` | A | C | A | B / D(smooth) |
| `area` | E | F | E / F | G |
| `scatter` | H | （smooth 静默忽略） | H | （scatter 多序列无意义） |
| `spark` | I | （smooth 静默忽略） | I | （源码 `_seriesList()[0]` 仅取首序列，多序列仅图例显示） |

### 5.2 页面骨架（参考实现，开发阶段照抄）

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>af-chart-line demo - af-mobile</title>
  <link rel="stylesheet" href="../../src/index.css">
</head>
<body>
  <main class="page">
    <section class="hero">
      <p class="eyebrow"><a href="../index.html" class="subtitle">← 返回</a></p>
      <h1 class="display">af-chart-line 折线/面积/散点</h1>
    </section>

    <!-- 焦点组件（顶部，接 props 面板） -->
    <p class="caption">焦点组件 · 切换下方 props 即时生效</p>
    <div class="card">
      <af-chart-line id="focus" variant="line" legend></af-chart-line>
    </div>

    <p class="caption" id="log">点击数据点查看 select 事件</p>

    <!-- variant 矩阵 -->
    <p class="caption">A · 单序列折线（月活趋势）</p>
    <div class="card"><af-chart-line class="demo" variant="line" data-line="monthly"></af-chart-line></div>

    <p class="caption">B · 多序列对比（今年 vs 去年）</p>
    <div class="card"><af-chart-line class="demo" variant="line" legend data-line="compare"></af-chart-line></div>

    <p class="caption">C · 平滑曲线（smooth 单序列）</p>
    <div class="card"><af-chart-line class="demo" variant="line" smooth data-line="monthly"></af-chart-line></div>

    <p class="caption">D · 平滑 + 多序列（smooth + series）</p>
    <div class="card"><af-chart-line class="demo" variant="line" smooth legend data-line="compare"></af-chart-line></div>

    <p class="caption">E · 面积图（营收趋势，clamp-zero）</p>
    <div class="card"><af-chart-line class="demo" variant="area" data-line="revenue"></af-chart-line></div>

    <p class="caption">F · 面积 + 平滑（area + smooth）</p>
    <div class="card"><af-chart-line class="demo" variant="area" smooth data-line="revenue"></af-chart-line></div>

    <p class="caption">G · 面积多序列对比（今年 vs 去年营收，半透明叠加）</p>
    <div class="card"><af-chart-line class="demo" variant="area" legend data-line="revenue_2y"></af-chart-line></div>

    <p class="caption">H · 散点图（20 点相关性）</p>
    <div class="card"><af-chart-line class="demo" variant="scatter" data-line="scatter"></af-chart-line></div>

    <p class="caption">I · sparkline（7 日 DAU 迷你趋势，KPI 卡内嵌示例）</p>
    <div class="card" style="padding:12px;display:flex;align-items:center;gap:12px">
      <div style="flex:0 0 auto">
        <div class="body" style="color:var(--c-muted)">DAU</div>
        <div class="display" style="font-size:24px">128.5K</div>
      </div>
      <af-chart-line class="demo" variant="spark" data-line="spark" style="flex:1 1 auto"></af-chart-line>
    </div>

    <!-- 五态 -->
    <p class="caption">J/K/L · 五态：loading / error（含重试）/ empty</p>
    <div class="card" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <af-chart-line id="j-loading" loading></af-chart-line>
      <af-chart-line id="k-error" error="加载失败，请重试" data-line="empty"></af-chart-line>
      <af-chart-line id="l-empty" data-line="empty"></af-chart-line>
    </div>

    <div class="card">
      <button class="btn btn-ghost btn-block" id="retry-btn">手动触发 retry 事件（K 区）</button>
    </div>

    <section id="props" class="card"></section>
  </main>

  <script type="module">
    import { AfChartLine } from '../../src/charts/components/af-chart-line.js';
    customElements.define('af-chart-line', AfChartLine);
    import { createPropsPanel } from '../props-panel.js';

    // —— Mock 数据集（详见 §11）——
    const MOCK = {
      monthly:   { labels: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
                   series: [{ name: '月活', values: [82,85,88,91,94,98,103,108,112,118,122,128] }] },
      compare:   { labels: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
                   series: [{ name: '今年', values: [82,85,88,91,94,98,103,108,112,118,122,128] },
                            { name: '去年', values: [70,72,75,78,80,83,86,89,92,95,98,101] }] },
      revenue:   { labels: ['1月','2月','3月','4月','5月','6月','7月','8月'],
                   series: [{ name: '营收', values: [320,340,365,380,410,440,475,510] }] },
      revenue_2y:{ labels: ['1月','2月','3月','4月','5月','6月','7月','8月'],
                   series: [{ name: '今年', values: [320,340,365,380,410,440,475,510] },
                            { name: '去年', values: [280,300,320,335,360,385,410,440] }] },
      scatter:   { labels: Array.from({length:20}, (_,i)=>`p${i+1}`),
                   series: [{ values: Array.from({length:20}, (_,i)=> Math.round(50+i*2.5+(i%3)*8)) }] },
      spark:     { labels: ['周一','周二','周三','周四','周五','周六','周日'],
                   series: [{ values: [110,115,118,121,125,128,128.5] }] },
      empty:     { labels: [], series: [] },
    };

    // —— 焦点组件初始化 ——
    const focus = document.getElementById('focus');
    focus.labels = MOCK.monthly.labels;
    focus.series = MOCK.monthly.series;

    // —— variant 矩阵实例化（data-line 属性 → mock key） ——
    document.querySelectorAll('af-chart-line.demo[data-line]').forEach(el => {
      const m = MOCK[el.dataset.line];
      el.labels = m.labels;
      el.series = m.series;
    });

    // —— 事件日志 ——
    focus.addEventListener('af-chart-line:select', (e) => {
      document.getElementById('log').textContent =
        `select: index=${e.detail.index} seriesIndex=${e.detail.seriesIndex} label=${e.detail.label} value=${e.detail.value}`;
    });
    document.getElementById('k-error').addEventListener('af-chart-line:retry', () => {
      document.getElementById('log').textContent = 'K 区派发 af-chart-line:retry';
    });
    document.getElementById('retry-btn').addEventListener('click', () => {
      // 手动模拟重试：清除 error 后 2s 再设回，演示重试→loading→success 流程
      const k = document.getElementById('k-error');
      k.error = '';
      k.loading = true;
      setTimeout(() => { k.loading = false; k.labels = MOCK.monthly.labels; k.series = MOCK.monthly.series; }, 800);
    });

    // —— props 面板 ——
    createPropsPanel(document.getElementById('props'), [
      { prop: 'variant', label: '形态', type: 'select', options: ['line','area','scatter','spark'] },
      { prop: 'smooth', label: '平滑', type: 'boolean' },
      { prop: 'showAxis', label: '坐标轴', type: 'boolean' },
      { prop: 'legend', label: '图例', type: 'boolean' },
      { prop: 'height', label: '高度(px)', type: 'number', min: 60, max: 400, step: 10 },
      { prop: 'loading', label: 'loading 态', type: 'boolean' },
      { prop: 'error', label: 'error 文案', type: 'string' },
    ], focus, (prop) => {
      // 切到 spark 时提示自动忽略坐标轴
      if (prop === 'variant' && focus.variant === 'spark') {
        document.getElementById('log').textContent = 'spark 变体自动忽略 showAxis / tooltip';
      }
    });
  </script>
</body>
</html>
```

### 5.3 props 面板 schema 说明

| prop | type | 说明 |
|---|---|---|
| `variant` | select | line/area/scatter/spark 四枚举 |
| `smooth` | boolean | 仅 line/area 有效，scatter/spark 静默忽略 |
| `showAxis` | boolean | spark 自动忽略（已在源码 `_isSpark` 兜底） |
| `legend` | boolean | 多序列时切换图例显隐 |
| `height` | number | 60-400，step 10；切到 spark 时建议手动设 60 |
| `loading` | boolean | 演示五态切换 |
| `error` | string | 非空字符串触发 error 态；清空即恢复 |

**注意**：props 面板的 `prop` 名用 camelCase（`showAxis` / `maxCount` 等），`props-panel.js` 内部直接 `target[prop] = v` 走 property 赋值，`AfElement.defineProp` 已声明 attr 映射，会同步到 attribute。

---

## 6. af-chart-bar.html 详细设计

### 6.1 演示矩阵

| 区块 | variant | 数据 | 演示要点 |
|---|---|---|---|
| A · 垂直柱（单序列） | `column` | `CATEGORY_SALES`（6 类目销量） | 默认形态 + 抽稀标签 |
| B · 水平条形（单序列） | `bar` | `LONG_NAME_RANK`（10 个长类目） | 长类目名横向可读 |
| C · 堆叠柱（多序列） | `stacked` | `STACKED_QUARTERLY`（4 季度 × 3 产品线） | 逐段累加 + 配色阶梯 |
| D · 分组柱（多序列） | `grouped` | 同 C | 同组并排对比 |
| E · 水平条形 + max-count 截断 | `bar` + `maxCount=5` | `OVER_30_CATEGORIES`（35 个长类目） | 水平方向也支持截断，前 4 + "其他"聚合 |
| F · 水平条形（小时段分布） | `bar` | `HOURLY_TRAFFIC`（24 小时访问量） | 水平条形的长尾分布对比 B 的排行场景 |
| G · max-count 截断 | `column` + `maxCount=5` | `OVER_30_CATEGORIES`（35 个类目） | 前 4 + "其他"聚合（走 i18n） |
| H · loading 态 | `column` + `loading` | 任意 | 图表形骨架 + `aria-busy` |
| I · error 态 | `column` + `error="加载失败"` | 任意 | 错误文案 + 重试按钮 → 派发 `af-chart-bar:retry` |
| J · empty 态 | `column` + `data=[]` | `[]` | "暂无数据"文案 |
| **焦点组件** | `column` | `CATEGORY_SALES` | 切 variant / maxCount / legend / height |

**variant × 配置组合全集**：

| variant | 单序列 | 多序列 |
|---|---|---|
| `column`（垂直） | A | D（grouped） / C（stacked） |
| `bar`（水平） | B / F | （源码不支持水平多序列，多序列会重叠，不演示） |

> 普通多序列 `column`/`bar` 不显式声明 grouped/stacked 时，源码会按"每柱居中"渲染导致多序列重叠，**无业务意义**——多序列必须显式选 `grouped` 或 `stacked`（两者均为垂直方向，源码未实现水平 grouped/stacked 组合）。

### 6.2 页面骨架（关键差异点）

```html
<!-- 焦点组件 -->
<af-chart-bar id="focus" variant="column" legend></af-chart-bar>

<!-- variant 矩阵 -->
<p class="caption">A · 垂直柱（6 类目销量）</p>
<div class="card"><af-chart-bar class="demo" variant="column" data-bar="cat_sales"></af-chart-bar></div>

<p class="caption">B · 水平条形（10 个长类目名排行）</p>
<div class="card"><af-chart-bar class="demo" variant="bar" data-bar="long_rank"></af-chart-bar></div>

<p class="caption">C · 堆叠柱（季度 × 产品线）</p>
<div class="card"><af-chart-bar class="demo" variant="stacked" legend data-bar="stacked_q"></af-chart-bar></div>

<p class="caption">D · 分组柱（同数据并排对比）</p>
<div class="card"><af-chart-bar class="demo" variant="grouped" legend data-bar="stacked_q"></af-chart-bar></div>

<p class="caption">E · 水平条形 + max-count 截断（35 类目 → 前 4 + "其他"）</p>
<div class="card"><af-chart-bar class="demo" variant="bar" max-count="5" data-bar="over_30"></af-chart-bar></div>

<p class="caption">F · 水平条形（24 小时访问量分布）</p>
<div class="card"><af-chart-bar class="demo" variant="bar" data-bar="hourly"></af-chart-bar></div>

<p class="caption">G · max-count 截断（35 类目 → 前 4 + "其他"）</p>
<div class="card"><af-chart-bar class="demo" variant="column" max-count="5" data-bar="over_30"></af-chart-bar></div>

<!-- 五态 -->
<p class="caption">H/I/J · 五态：loading / error（含重试）/ empty</p>
<div class="card" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
  <af-chart-bar id="h-loading" loading></af-chart-bar>
  <af-chart-bar id="i-error" error="加载失败，请重试" data-bar="empty"></af-chart-bar>
  <af-chart-bar id="j-empty" data-bar="empty"></af-chart-bar>
</div>

<div class="card">
  <button class="btn btn-ghost btn-block" id="retry-btn">手动触发 retry 事件（I 区）</button>
</div>
```

### 6.3 mock 数据

```js
const MOCK = {
  cat_sales:     { labels: ['手机','笔记本','平板','手表','耳机','音箱'],
                  series: [{ name: '销量', values: [1280,960,540,420,680,310] }] },
  long_rank:     { labels: ['华东区-上海','华东区-杭州','华东区-南京','华北区-北京','华北区-天津',
                           '华南区-深圳','华南区-广州','西南区-成都','西南区-重庆','华中区-武汉'],
                  series: [{ name: 'GMV', values: [980,820,640,1120,540,1080,890,460,420,510] }] },
  stacked_q:     { labels: ['Q1','Q2','Q3','Q4'],
                  series: [{ name: '手机', values: [320,360,400,420] },
                           { name: '笔记本', values: [240,260,280,300] },
                           { name: '配件', values: [120,140,160,180] }] },
  grouped_long:  { labels: ['华东区-上海','华北区-北京','华南区-深圳','西南区-成都'],
                  series: [{ name: '手机', values: [320,420,380,260] },
                           { name: '笔记本', values: [240,300,260,180] },
                           { name: '配件', values: [120,180,140,80] }] },
  stacked_long:  { labels: ['华东区-上海','华北区-北京','华南区-深圳','西南区-成都'],
                  series: [{ name: '手机', values: [320,420,380,260] },
                           { name: '笔记本', values: [240,300,260,180] },
                           { name: '配件', values: [120,180,140,80] }] },
  hourly:        { labels: Array.from({length:24},(_,i)=>`${i}:00`),
                  series: [{ name: '访问量', values: [120,80,50,30,20,15,30,80,180,320,420,510,580,620,590,540,480,420,380,340,280,220,180,150] }] },
  over_30:       { labels: Array.from({length:35},(_,i)=>`SKU-${i+1}`),
                  series: [{ name: '销量', values: Array.from({length:35},(_,i)=>Math.round(50+Math.random()*200)) }] },
  empty:         { labels: [], series: [] },
};
```

### 6.4 props 面板 schema

```js
[
  { prop: 'variant', label: '形态', type: 'select', options: ['column','bar','stacked','grouped'] },
  { prop: 'maxCount', label: '类目上限', type: 'number', min: 3, max: 30, step: 1 },
  { prop: 'legend', label: '图例', type: 'boolean' },
  { prop: 'height', label: '高度(px)', type: 'number', min: 120, max: 400, step: 10 },
  { prop: 'loading', label: 'loading 态', type: 'boolean' },
  { prop: 'error', label: 'error 文案', type: 'string' },
]
```

---

## 7. af-chart-pie.html 详细设计

### 7.1 演示矩阵

| 区块 | variant | 数据 | 演示要点 |
|---|---|---|---|
| A · 饼图 | `pie` | `TRAFFIC_SOURCE`（5 渠道） | 默认形态 |
| B · 环形 + 中心 KPI | `donut` + `center-text="合计 {total}"` | `TRAFFIC_SOURCE` | 中心文案占位符替换 |
| C · 半环（完成度） | `half` + `center-text="75%"` | `COMPLETION`（完成 75 / 待办 25） | 半环 + 中心百分比 |
| D · 玫瑰图 | `rose` | `CATEGORY_DIFF`（6 类目数值差异大） | 半径 ∝ sqrt(v/max) 面积正比 |
| E · >6 项自动聚合 | `pie` | `OVER_10_SLICES`（10 块） | 前 5 + "其他"聚合（走 i18n） |
| F · innerRadius 多值对比 | `donut` × 3 | `TRAFFIC_SOURCE` × 3 个实例：innerRadius=30/60/90 | 同数据不同内径对比，验证内径范围 0-99 |
| G · 自定义颜色覆盖 | `pie` | `TRAFFIC_CUSTOM_COLOR`（5 项，每项带 `color` 字段覆盖 `seriesColor`） | 数据项 color 优先于序列色轮转 |
| H · loading 态 | `pie` + `loading` | 任意 | 骨架 + `aria-busy` |
| I · error 态 | `pie` + `error="加载失败"` | 任意 | 错误文案 + 重试按钮 → 派发 `af-chart-pie:retry` |
| J · empty 态 | `pie` + `data=[]` | `[]` | "暂无数据"文案 |
| **焦点组件** | `pie` | `TRAFFIC_SOURCE` | 切 variant / innerRadius / centerText / legend |

**variant × 配置组合全集**：

| variant | innerRadius 默认 | innerRadius 自定义 | centerText | 自定义 color |
|---|---|---|---|---|
| `pie` | A | （pie 无内径概念） | （pie 无中心） | G |
| `donut` | B（60%） | F（30/60/90 对比） | B | G |
| `half` | C（必 donut） | （half 默认 60%，可改） | C | G |
| `rose` | D（rr0=0） | （rose 强制 rr0=0） | （rose 无中心） | G |

### 7.2 页面骨架

```html
<af-chart-pie id="focus" variant="pie" legend></af-chart-pie>

<p class="caption">A · 饼图（5 渠道流量）</p>
<div class="card"><af-chart-pie class="demo" variant="pie" data-pie="traffic"></af-chart-pie></div>

<p class="caption">B · 环形 + 中心 KPI（{total} 占位符）</p>
<div class="card"><af-chart-pie class="demo" variant="donut" center-text="合计 {total}" data-pie="traffic"></af-chart-pie></div>

<p class="caption">C · 半环完成度（center-text 自定义）</p>
<div class="card"><af-chart-pie class="demo" variant="half" center-text="75%" data-pie="completion"></af-chart-pie></div>

<p class="caption">D · 玫瑰图（数值差异强调，面积正比）</p>
<div class="card"><af-chart-pie class="demo" variant="rose" data-pie="category_diff"></af-chart-pie></div>

<p class="caption">E · >6 项自动聚合为"其他"</p>
<div class="card"><af-chart-pie class="demo" variant="pie" data-pie="over_10"></af-chart-pie></div>

<p class="caption">F · innerRadius 多值对比（30 / 60 / 90，同数据 donut）</p>
<div class="card" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
  <af-chart-pie class="demo" variant="donut" inner-radius="30" data-pie="traffic"></af-chart-pie>
  <af-chart-pie class="demo" variant="donut" inner-radius="60" data-pie="traffic"></af-chart-pie>
  <af-chart-pie class="demo" variant="donut" inner-radius="90" data-pie="traffic"></af-chart-pie>
</div>

<p class="caption">G · 自定义颜色覆盖（data 项 color 字段，绕过 seriesColor 轮转）</p>
<div class="card"><af-chart-pie class="demo" variant="pie" data-pie="custom_color"></af-chart-pie></div>

<!-- 五态 -->
<p class="caption">H/I/J · 五态：loading / error（含重试）/ empty</p>
<div class="card" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
  <af-chart-pie id="h-loading" loading></af-chart-pie>
  <af-chart-pie id="i-error" error="加载失败，请重试" data-pie="empty"></af-chart-pie>
  <af-chart-pie id="j-empty" data-pie="empty"></af-chart-pie>
</div>

<div class="card">
  <button class="btn btn-ghost btn-block" id="retry-btn">手动触发 retry 事件（I 区）</button>
</div>
```

### 7.3 mock 数据

```js
const MOCK = {
  traffic:       [{ label:'自然搜索', value:4200 },{ label:'付费广告', value:2800 },
                  { label:'社交媒体', value:1900 },{ label:'直接访问', value:1200 },
                  { label:'邮件营销', value:600 }],
  completion:    [{ label:'已完成', value:75 },{ label:'待办', value:25 }],
  category_diff: [{ label:'手机', value:1280 },{ label:'笔记本', value:960 },
                  { label:'平板', value:540 },{ label:'手表', value:120 },
                  { label:'耳机', value:680 },{ label:'音箱', value:80 }],
  over_10:       Array.from({length:10},(_,i)=>({ label:`渠道${i+1}`, value: 100 + i*30 + (i%3)*40 })),
  // 自定义颜色覆盖 seriesColor：每个 data 项带 color 字段（hex/var 皆可）
  custom_color:  [{ label:'iOS', value:5400, color:'#FF6B6B' },
                  { label:'Android', value:7200, color:'#4ECDC4' },
                  { label:'H5', value:3100, color:'#FFD93D' },
                  { label:'小程序', value:2400, color:'#95E1D3' },
                  { label:'其他', value:900, color:'#A8DADC' }],
  empty:         [],
};
```

### 7.4 props 面板 schema

```js
[
  { prop: 'variant', label: '形态', type: 'select', options: ['pie','donut','half','rose'] },
  { prop: 'innerRadius', label: '内径(%)', type: 'number', min: 0, max: 99, step: 5 },
  { prop: 'centerText', label: '中心文案', type: 'string' },
  { prop: 'legend', label: '图例', type: 'boolean' },
  { prop: 'height', label: '高度(px)', type: 'number', min: 120, max: 400, step: 10 },
  { prop: 'loading', label: 'loading 态', type: 'boolean' },
  { prop: 'error', label: 'error 文案', type: 'string' },
]
```

**提示文案**：`centerText` 输入框 placeholder 提示"支持 {total} 占位符"，提示用户半环/donut 都可填。

---

## 8. af-chart-radar.html 详细设计

### 8.1 演示矩阵

| 区块 | shape | series | 数据 | 演示要点 |
|---|---|---|---|---|
| A · 多边形网格 + 单主体 | `polygon` | — | `ABILITY_6D`（6 维能力） | 默认形态 + 维度标签 |
| B · 圆形网格 + 单主体 | `circle` | — | 同 A | shape 切换 |
| C · 双主体对比（polygon） | `polygon` | 双序列 | `ABILITY_6D` + `PREV_PERIOD` | 半透明 + 描边区分 |
| D · 维度超长截断 | `polygon` | — | `LONG_LABEL_5D`（5 维 4 字+截断） | 维度标签超长截断 4 字 + 省略号 |
| E · >2 序列警告 | `polygon` | 3 序列 | 同 C + 第 3 主体 | console.warn + 仅渲染前 2（控制台可观察） |
| F · 3 维（最少兜底） | `polygon` | — | `RADAR_3D`（速度/力量/敏捷） | 源码 `n = Math.max(dims.length, 3)` 兜底，三角形雷达 |
| G · 8 维（最多上限） | `polygon` | — | `RADAR_8D`（8 维综合能力） | 标签密集，验证可读性上限 |
| H · 自定义 max | `polygon` | — | `RADAR_CUSTOM_MAX`（5 维各 max 不同：100/200/500/50/20） | 每维 max 独立，归一化渲染 |
| I · circle + 双主体 | `circle` | 双序列 | 同 C 数据 | circle 网格下的双主体对比 |
| J · loading 态 | `polygon` | — | 任意 + `loading` | 骨架 + `aria-busy` |
| K · error 态 | `polygon` | — | 任意 + `error="加载失败"` | 错误文案 + 重试按钮 → 派发 `af-chart-radar:retry` |
| L · empty 态 | `polygon` | — | `[]` | "暂无数据"文案 |
| **焦点组件** | `polygon` | — | `ABILITY_6D` | 切 shape / legend / height |

**shape × series × 维度数组合全集**：

| shape | 单主体 | 双主体 | >2 序列 | 3 维 | 8 维 | 自定义 max |
|---|---|---|---|---|---|---|
| `polygon` | A | C | E（warn+前2） | F | G | H |
| `circle` | B | I | （同 E 行为） | （同 F） | （同 G） | （同 H） |

### 8.2 mock 数据

```js
const MOCK = {
  ability_6d:    [{ label:'速度', value:80, max:100 },{ label:'力量', value:65, max:100 },
                 { label:'敏捷', value:90, max:100 },{ label:'智力', value:75, max:100 },
                 { label:'体能', value:85, max:100 },{ label:'技巧', value:70, max:100 }],
  prev_period:   { name:'上期', values:[70,55,80,65,75,60] },
  this_period:    { name:'本期', values:[80,65,90,75,85,70] },
  long_label_5d: [{ label:'需求理解力', value:80 },{ label:'架构设计能力', value:65 },
                  { label:'代码质量', value:90 },{ label:'团队协作度', value:75 },
                  { label:'业务理解深度', value:85 }],
  // 3 维（最少，源码兜底 n = Math.max(dims.length, 3)）
  radar_3d:      [{ label:'速度', value:80, max:100 },{ label:'力量', value:65, max:100 },
                  { label:'敏捷', value:90, max:100 }],
  // 8 维（最多上限，标签密集）
  radar_8d:      [{ label:'速度', value:80, max:100 },{ label:'力量', value:65, max:100 },
                  { label:'敏捷', value:90, max:100 },{ label:'智力', value:75, max:100 },
                  { label:'体能', value:85, max:100 },{ label:'技巧', value:70, max:100 },
                  { label:'耐力', value:88, max:100 },{ label:'爆发', value:60, max:100 }],
  // 自定义 max（每维不同 max，归一化渲染：v/max → 0-1）
  custom_max:    [{ label:'GMV', value:85, max:200 },     // 85/200 = 0.425
                  { label:'订单', value:170, max:500 },    // 170/500 = 0.34
                  { label:'UV', value:920, max:1000 },     // 920/1000 = 0.92
                  { label:'转化率', value:3.2, max:5 },    // 3.2/5 = 0.64
                  { label:'客单价', value:18, max:20 }],     // 18/20 = 0.9
  empty:         [],
};
```

**双主体演示（C 区 polygon / I 区 circle）**：

```html
<!-- C 区：polygon + 双主体 -->
<af-chart-radar class="demo" shape="polygon" legend data-radar="ability_6d" data-series="two"></af-chart-radar>

<!-- I 区：circle + 双主体（同数据，shape 切换对比） -->
<af-chart-radar class="demo" shape="circle" legend data-radar="ability_6d" data-series="two"></af-chart-radar>
```

JS 内统一注入：

```js
document.querySelectorAll('af-chart-radar.demo[data-series="two"]').forEach(el => {
  el.data = MOCK.ability_6d;
  el.series = [MOCK.this_period, MOCK.prev_period];
});
```

**>2 序列警告（E 区）**：

```html
<af-chart-radar class="demo" shape="polygon" legend data-radar="ability_6d" data-series="three"></af-chart-radar>
```

```js
const el3 = document.querySelector('af-chart-radar.demo[data-series="three"]');
if (el3) {
  el3.data = MOCK.ability_6d;
  // 第 3 个主体 + 故意违反"双主体红线"，触发源码 console.warn
  el3.series = [MOCK.this_period, MOCK.prev_period, { name:'目标', values:[90,80,95,85,90,85] }];
}
```

**五态演示（J/K/L 区）**：

```html
<div class="card" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
  <af-chart-radar id="j-loading" loading></af-chart-radar>
  <af-chart-radar id="k-error" error="加载失败，请重试"></af-chart-radar>
  <af-chart-radar id="l-empty"></af-chart-radar>
</div>
<div class="card">
  <button class="btn btn-ghost btn-block" id="retry-btn">手动触发 retry 事件（K 区）</button>
</div>
```

```js
document.getElementById('j-loading').data = MOCK.ability_6d; // 有数据但被 loading 遮挡
document.getElementById('k-error').addEventListener('af-chart-radar:retry', () => {
  document.getElementById('log').textContent = 'K 区派发 af-chart-radar:retry';
});
document.getElementById('retry-btn').addEventListener('click', () => {
  const k = document.getElementById('k-error');
  k.error = ''; k.loading = true;
  setTimeout(() => { k.loading = false; k.data = MOCK.ability_6d; }, 800);
});
```

### 8.3 props 面板 schema

```js
[
  { prop: 'shape', label: '网格', type: 'select', options: ['polygon','circle'] },
  { prop: 'legend', label: '图例', type: 'boolean' },
  { prop: 'height', label: '高度(px)', type: 'number', min: 200, max: 400, step: 10 },
  { prop: 'loading', label: 'loading 态', type: 'boolean' },
  { prop: 'error', label: 'error 文案', type: 'string' },
]
```

---

## 9. af-chart-funnel.html 详细设计

### 9.1 演示矩阵

| 区块 | showRate | 数据 | 演示要点 |
|---|---|---|---|
| A · 默认（带转化率） | `true`（默认） | `EC_CONVERSION`（5 步电商转化） | 层间转化率标注 |
| B · 无转化率 | `false` | 同 A | showRate 关闭对比 |
| C · 招聘漏斗 | `true` | `HR_FUNNEL`（4 步招聘） | 不同业务场景 |
| D · 自动降序 | `true` | `UNSORTED_INPUT`（乱序输入） | 演示自动按 value 降序排 |
| E · 3 层（最短可读） | `true` | `FUNNEL_3_STEP`（浏览→下单→支付） | 最少层数验证 |
| F · 8 层（最长上限） | `true` | `FUNNEL_8_STEP`（8 步精细化运营） | 最多层数验证，标签/转化率密集 |
| G · 自定义颜色 | `true` | `FUNNEL_CUSTOM_COLOR`（5 层，每层带 color 字段覆盖 seriesColor） | 数据项 color 优先于序列色轮转 |
| H · loading 态 | `true` | 任意 + `loading` | 骨架 + `aria-busy` |
| I · error 态 | `true` | 任意 + `error="加载失败"` | 错误文案 + 重试按钮 → 派发 `af-chart-funnel:retry` |
| J · empty 态 | `true` | `[]` | "暂无数据"文案 |
| **焦点组件** | `true` | `EC_CONVERSION` | 切 showRate / legend / height |

**层数边界全集**：

| 层数 | 区块 | 说明 |
|---|---|---|
| 3 | E | 最少可读（低于 3 层缺乏漏斗语义） |
| 4 | C | 招聘常用 |
| 5 | A | 电商转化默认 |
| 8 | F | 最长上限（标签密集，验证可读性） |
| >8 | — | 不演示（标签重叠，源码无强制限制但视觉上不可读） |

### 9.2 mock 数据

```js
const MOCK = {
  ec_conversion:      [{ label:'浏览', value:12000 },{ label:'加购', value:4800 },
                       { label:'下单', value:2400 },{ label:'支付', value:1500 },
                       { label:'复购', value:600 }],
  hr_funnel:          [{ label:'投递', value:800 },{ label:'初筛', value:400 },
                       { label:'面试', value:120 },{ label:'offer', value:30 }],
  unsorted:           [{ label:'下单', value:2400 },{ label:'浏览', value:12000 },
                       { label:'支付', value:1500 },{ label:'加购', value:4800 }],
  funnel_3_step:      [{ label:'浏览', value:12000 },{ label:'下单', value:2400 },
                       { label:'支付', value:1500 }],
  funnel_8_step:      [{ label:'曝光', value:50000 },{ label:'点击', value:28000 },
                       { label:'访问', value:18000 },{ label:'加购', value:4800 },
                       { label:'下单', value:2400 },{ label:'支付', value:1500 },
                       { label:'复购', value:600 },{ label:'分享', value:180 }],
  funnel_custom_color:[{ label:'浏览', value:12000, color:'#FF6B6B' },
                       { label:'加购', value:4800, color:'#FFA94D' },
                       { label:'下单', value:2400, color:'#FFD93D' },
                       { label:'支付', value:1500, color:'#4ECDC4' },
                       { label:'复购', value:600, color:'#95E1D3' }],
  empty:              [],
};
```

### 9.3 页面骨架

```html
<af-chart-funnel id="focus" show-rate legend></af-chart-funnel>

<p class="caption">A · 默认带转化率（5 步电商）</p>
<div class="card"><af-chart-funnel class="demo" data-funnel="ec_conversion"></af-chart-funnel></div>

<p class="caption">B · 无转化率（showRate=false）</p>
<div class="card"><af-chart-funnel class="demo" data-funnel="ec_conversion" show-rate="false"></af-chart-funnel></div>

<p class="caption">C · 招聘漏斗（4 步）</p>
<div class="card"><af-chart-funnel class="demo" data-funnel="hr_funnel"></af-chart-funnel></div>

<p class="caption">D · 自动降序（乱序输入）</p>
<div class="card"><af-chart-funnel class="demo" data-funnel="unsorted"></af-chart-funnel></div>

<p class="caption">E · 3 层（最短可读）</p>
<div class="card"><af-chart-funnel class="demo" data-funnel="funnel_3_step"></af-chart-funnel></div>

<p class="caption">F · 8 层（最长上限，标签密集）</p>
<div class="card"><af-chart-funnel class="demo" data-funnel="funnel_8_step"></af-chart-funnel></div>

<p class="caption">G · 自定义颜色覆盖（data 项 color 字段）</p>
<div class="card"><af-chart-funnel class="demo" data-funnel="funnel_custom_color"></af-chart-funnel></div>

<!-- 五态 -->
<p class="caption">H/I/J · 五态：loading / error（含重试）/ empty</p>
<div class="card" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
  <af-chart-funnel id="h-loading" loading></af-chart-funnel>
  <af-chart-funnel id="i-error" error="加载失败，请重试"></af-chart-funnel>
  <af-chart-funnel id="j-empty"></af-chart-funnel>
</div>
<div class="card">
  <button class="btn btn-ghost btn-block" id="retry-btn">手动触发 retry 事件（I 区）</button>
</div>
```

```js
// 实例化
document.querySelectorAll('af-chart-funnel.demo[data-funnel]').forEach(el => {
  el.data = MOCK[el.dataset.funnel];
});
document.getElementById('h-loading').data = MOCK.ec_conversion;
// retry 流程
document.getElementById('i-error').addEventListener('af-chart-funnel:retry', () => {
  document.getElementById('log').textContent = 'I 区派发 af-chart-funnel:retry';
});
document.getElementById('retry-btn').addEventListener('click', () => {
  const i = document.getElementById('i-error');
  i.error = ''; i.loading = true;
  setTimeout(() => { i.loading = false; i.data = MOCK.ec_conversion; }, 800);
});
```

### 9.4 props 面板 schema

```js
[
  { prop: 'showRate', label: '转化率标注', type: 'boolean' },
  { prop: 'legend', label: '图例', type: 'boolean' },
  { prop: 'height', label: '高度(px)', type: 'number', min: 200, max: 400, step: 10 },
  { prop: 'loading', label: 'loading 态', type: 'boolean' },
  { prop: 'error', label: 'error 文案', type: 'string' },
]
```

---

## 10. scenarios/af-chart.html 联动演示

### 10.1 演示目标

把 5 个 chart 与其他 af-mobile 组件组合，验证真实业务场景：

1. **KPI 卡内嵌 sparkline**（dashboard 顶部一排）
2. **af-tabs 切换 5 种 chart 类型**（同一个数据集用不同 chart 视角看）
3. **主题切换**（light/dark 实时验证 chart 颜色跟随 `var(--c-*)`）
4. **prefers-reduced-motion 验证**（devtools 切换 + 入场动画消失对比）
5. **lazy 离屏懒加载**（IntersectionObserver 首次可见才渲染，验证 `lazy` 属性）
6. **error 态重试流程**（error → 重试按钮 → loading → success 完整流，验证 `:retry` 事件）

### 10.2 为什么是独立 HTML 而非 scenario 模块

现有 `demo/scenarios/af-{x}.js` 是 **playground 输入**（默认导出 `{ tag, name, scenarios }`），用于 `demo/playground/index.html` 加载运行。但联动页要**主动组合多个组件**（af-tabs + 5 个 chart + af-button + 主题 API + KPI layout），结构是"页面"而非"场景模块"，硬塞进 scenario 模式会破坏 scenario schema（单个 tag / 单个 main selector）。

因此采用**独立 HTML**：`demo/scenarios/af-chart.html`。命名上仍走 `af-chart` 单数对齐 scenario 目录约定。

### 10.3 页面结构

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>af-chart 联动场景 - af-mobile</title>
  <link rel="stylesheet" href="../../src/index.css">
</head>
<body>
  <main class="page">
    <section class="hero">
      <p class="eyebrow"><a href="../index.html" class="subtitle">← 返回</a></p>
      <h1 class="display">af-chart 联动场景</h1>
      <p class="subtitle">KPI卡 · tabs切换 · 主题切换 · reduced-motion</p>
    </section>

    <!-- 工具条：主题切换 + reduced-motion 提示 -->
    <div class="actions">
      <button class="btn btn-ghost" id="theme-toggle">切换主题</button>
      <span class="caption">系统 reduced-motion：<span id="rm-state">未启用</span></span>
    </div>

    <!-- ① KPI 卡内嵌 sparkline（3 张并排） -->
    <p class="caption">① KPI 卡 + sparkline（迷你趋势嵌入）</p>
    <div class="card" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div style="padding:12px">
        <div class="body" style="color:var(--c-muted)">月活（30 日）</div>
        <div class="display" style="font-size:22px">128.5K</div>
        <af-chart-line variant="spark" data-line="spark_dau"></af-chart-line>
      </div>
      <div style="padding:12px">
        <div class="body" style="color:var(--c-muted)">营收（30 日）</div>
        <div class="display" style="font-size:22px">¥510万</div>
        <af-chart-line variant="spark" data-line="spark_rev"></af-chart-line>
      </div>
      <div style="padding:12px">
        <div class="body" style="color:var(--c-muted)">转化率（30 日）</div>
        <div class="display" style="font-size:22px">3.2%</div>
        <af-chart-line variant="spark" data-line="spark_cvr"></af-chart-line>
      </div>
    </div>

    <!-- ② af-tabs 切换 5 种 chart 类型（同数据集不同视角） -->
    <p class="caption">② af-tabs 切换 chart 类型（电商 5 步转化数据的多视角）</p>
    <af-tabs id="tabs"></af-tabs>
    <div id="chart-host" class="card" style="margin-top:8px"></div>
    <p class="caption" id="log">选中：funnel 视角</p>

    <!-- ③ lazy 离屏懒加载（IntersectionObserver 首次可见才渲染） -->
    <p class="caption">③ lazy 离屏懒加载（向下滚动至 1000px 处，chart 首次可见才渲染）</p>
    <div style="height:1000px;background:repeating-linear-gradient(45deg, var(--c-surface), var(--c-surface) 10px, transparent 10px, transparent 20px);display:flex;align-items:center;justify-content:center;color:var(--c-muted);border-radius:8px;margin-bottom:8px">
      占位区域（1000px 高）—— 验证 lazy chart 在视口外不渲染
    </div>
    <div class="card">
      <af-chart-line id="lazy-line" lazy variant="line" legend></af-chart-line>
    </div>

    <!-- ④ error 态重试流程（error → 重试 → loading → success） -->
    <p class="caption">④ error 态重试流程（点击 chart 内重试按钮，触发 loading → success 流）</p>
    <div class="card">
      <af-chart-bar id="err-bar" error="加载失败，请重试" legend></af-chart-bar>
    </div>

    <section id="props" class="card"></section>
  </main>

  <script type="module">
    // 一次性注册 5 个 chart + tabs
    import { registerCharts } from '../../src/charts/index.js';
    registerCharts();
    import { AfTabs } from '../../src/components/af-tabs.js';
    customElements.define('af-tabs', AfTabs);
    import { toggleTheme } from '../../src/lib/theme.js';
    import { createPropsPanel } from '../props-panel.js';

    // —— 共享数据集（电商 5 步转化）——
    const FUNNEL = [
      { label:'浏览', value:12000 },{ label:'加购', value:4800 },
      { label:'下单', value:2400 },{ label:'支付', value:1500 },
      { label:'复购', value:600 },
    ];
    // line/bar/pie 各自的形态数据派生
    const LINE_DATA = { labels: FUNNEL.map(d=>d.label), series: [{ name:'转化', values: FUNNEL.map(d=>d.value) }] };
    const BAR_DATA  = LINE_DATA;
    const PIE_DATA  = FUNNEL;

    // —— KPI 卡 sparkline mock ——
    const SPARK = {
      spark_dau: { labels: Array.from({length:7},(_,i)=>`d${i+1}`), series:[{ values:[110,115,118,121,125,128,128.5] }] },
      spark_rev: { labels: Array.from({length:7},(_,i)=>`d${i+1}`), series:[{ values:[380,395,410,440,475,490,510] }] },
      spark_cvr:{ labels: Array.from({length:7},(_,i)=>`d${i+1}`), series:[{ values:[2.8,2.9,3.0,3.1,3.0,3.2,3.2] }] },
    };

    // KPI sparkline 实例化
    document.querySelectorAll('af-chart-line[data-line^="spark_"]').forEach(el => {
      const m = SPARK[el.dataset.line];
      el.labels = m.labels; el.series = m.series;
    });

    // —— tabs 切换 chart 类型 ——
    // 用 af-tabs:change 事件驱动 chart 容器重建（比 renderPanel side-effect 更清晰，
    // 避免 _renderPanels 一次性执行所有 tab 渲染函数导致 5 个 chart 都被实例化）
    const tabs = document.getElementById('tabs');
    tabs.tabs = [
      { label: '漏斗', value: 'funnel' },
      { label: '柱状', value: 'bar' },
      { label: '折线', value: 'line' },
      { label: '饼图', value: 'pie' },
      { label: '雷达', value: 'radar' },
    ];
    const host = document.getElementById('chart-host');

    function renderChart(value) {
      host.innerHTML = '';
      const tag = `af-chart-${value}`;
      const el = document.createElement(tag);
      if (tag === 'af-chart-funnel') {
        el.data = FUNNEL; el.showRate = true; el.legend = true;
      } else if (tag === 'af-chart-bar') {
        el.labels = BAR_DATA.labels; el.series = BAR_DATA.series; el.legend = true;
      } else if (tag === 'af-chart-line') {
        el.labels = LINE_DATA.labels; el.series = LINE_DATA.series; el.legend = true;
      } else if (tag === 'af-chart-pie') {
        el.data = PIE_DATA; el.legend = true;
      } else if (tag === 'af-chart-radar') {
        // 漏斗数据派生雷达：每步转化率作为能力维度（max=100）
        el.data = FUNNEL.map(d => ({ label: d.label, value: Math.round(d.value / FUNNEL[0].value * 100), max: 100 }));
        el.legend = false;
      }
      el.addEventListener(`${tag}:select`, (e) => {
        document.getElementById('log').textContent = `${value} select: index=${e.detail.index} label=${e.detail.label} value=${e.detail.value}`;
      });
      host.appendChild(el);
    }

    // 初始渲染：首个 tab（funnel）
    renderChart('funnel');
    tabs.addEventListener('af-tabs:change', (e) => {
      renderChart(e.detail.value);
      document.getElementById('log').textContent = `选中：${e.detail.value} 视角`;
    });

    // —— 主题切换 ——
    document.getElementById('theme-toggle').addEventListener('click', () => {
      toggleTheme();
    });

    // —— reduced-motion 状态显示 ——
    const rm = matchMedia('(prefers-reduced-motion: reduce)');
    const updateRm = () => document.getElementById('rm-state').textContent = rm.matches ? '已启用' : '未启用';
    updateRm();
    rm.addEventListener?.('change', updateRm);

    // —— ③ lazy 离屏懒加载：lazy chart 首次进入视口才渲染（IntersectionObserver） ——
    // 设数据但不渲染（lazy=true 时，chart 在不可见状态下保留骨架占位）
    const lazyLine = document.getElementById('lazy-line');
    lazyLine.labels = LINE_DATA.labels;
    lazyLine.series = LINE_DATA.series;
    // 监听 chart 实际渲染时机（首次可见时 chart 会触发一次内部 rerender）
    const lazyObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          document.getElementById('log').textContent = '③ lazy chart 首次进入视口，开始渲染';
          lazyObs.disconnect();
        }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    lazyObs.observe(lazyLine);

    // —— ④ error 态重试流程：点击 chart 内重试按钮 → loading → success ——
    const errBar = document.getElementById('err-bar');
    errBar.addEventListener('af-chart-bar:retry', () => {
      document.getElementById('log').textContent = '④ 接收 af-chart-bar:retry，开始重试';
      errBar.error = '';
      errBar.loading = true;
      setTimeout(() => {
        errBar.loading = false;
        errBar.labels = BAR_DATA.labels;
        errBar.series = BAR_DATA.series;
        document.getElementById('log').textContent = '④ 重试完成，chart 已渲染成功';
      }, 800);
    });

    // —— props 面板（控当前激活 chart，由于 chart 重建，需重新绑定） ——
    // 简化：联动页不接 props 面板，仅放 placeholder 文案
    document.getElementById('props').innerHTML = '<h2 class="subtitle">Props 调节</h2><p class="caption">联动页演示场景组合，单组件 props 调节请见各组件 demo 页</p>';
  </script>
</body>
</html>
```

### 10.4 联动页设计要点

1. **registerCharts() 全量注册**：联动页要用 5 种 chart，失去 Tree Shaking 无所谓（demo 站，非生产）。简化代码 1 行替代 5 行 `customElements.define`。
2. **af-tabs:change 事件驱动 chart 重建**：原设计曾考虑 `renderPanel` + side-effect 挂 chart，但 `af-tabs._renderPanels` 会在 mounted 时一次性执行所有 tab 的 renderPanel 函数，导致 5 个 chart 都被实例化（虽然只有当前 tab 面板可见，但其他 4 个 chart 也被创建和赋值，浪费性能且 CHART_HOST 只保留最后一个）。改用 `af-tabs:change` 事件驱动：tabs 只负责切换 UI，独立的 `#chart-host` 容器在事件回调中 `innerHTML = ''` + 重建当前 tab 对应 chart，更清晰且只实例化 1 个 chart。
3. **主题切换验证**：点击按钮 → `toggleTheme()` → `data-theme=dark` → chart-theme.js 监听 `themechange` → 缓存失效 + 重绘，颜色从 `--c-brand` 取 dark 主题值。
4. **reduced-motion 验证**：devtools 切到 reduce 媒体查询 → chart 内核统一 CSS 覆盖 → 入场动画消失。状态文案实时显示当前 matchMedia 状态。
5. **联动页 props 面板**：**不接** props 面板（chart 重建会让 props 面板的 target 引用失效）。改放说明文案。
6. **lazy 懒加载验证**：lazy chart + 1000px 占位区 → chart 在视口外时仅骨架占位（IntersectionObserver 监听），首次进入视口才触发 `_render`。demo 端再叠一个 IntersectionObserver 监听 chart 的进入视口时机，日志提示"首次渲染"。**注意**：lazy 是 chart 内核自带能力（`render.js` 的 `bindLazy`），demo 不重复实现，只展示效果。
7. **error 重试流程**：`<af-chart-bar id="err-bar" error="...">` 初始即 error 态，chart 内部"重试"按钮点击派发 `af-chart-bar:retry`，demo 监听后清 error → 设 loading → 800ms 后注入 data 完成流。验证 `:retry` 事件 + 五态切换。

---

## 11. 共享 Mock 数据集

### 11.1 设计原则

- 全部 mock 内联在各页 `<script>` 顶部，不抽公共文件（避免 demo 站模块依赖）
- 数据贴近真实业务：电商转化、月活趋势、KPI 卡、能力画像、流量来源——禁止 `A/B/C` 这种无意义标签
- 数值大小合理：折线 100-130 范围（月活万级 / KPI 百万级用 fmtNum 自动缩写为 1.28M）
- 多序列对比数据有可读趋势（去年 vs 今年同向上扬）
- 散点图 20 点带轻微相关性（i*2.5 + 噪声）

### 11.2 mock 与 chart 组件的 fmtNum 联动

chart 组件内置 `fmtNum`（详见 `lib/geometry.js`）会自动缩写：
- 12000 → "12K"
- 1280000 → "1.28M"
- 0.32 → "0.32"

因此 mock 数值无需手工格式化，直接给原始数即可。设计时已校验所有 mock 数值在 fmtNum 后可读。

### 11.3 mock 复用关系

| mock key | 用于 | 字段 |
|---|---|---|
| `monthly` | line.html A/B/C 区、焦点组件 | labels(12月) + series(单序列) |
| `compare` | line.html B/D 区 | labels(12月) + series(双序列：今年 vs 去年) |
| `revenue` | line.html E/F 区 | labels(8月) + series(营收单序列) |
| `revenue_2y` | line.html G 区 | labels(8月) + series(双序列：今年 vs 去年营收) |
| `scatter` | line.html H 区 | labels(20点) + series(20值，带相关性) |
| `spark` / `spark_dau/rev/cvr` | line.html I 区、联动页① | labels(7日) + series |
| `empty` | line.html L 区 / bar J / pie J / radar L / funnel J | `[]` 或 `{labels:[],series:[]}` |
| `cat_sales` | bar.html A 区、焦点组件 | 6 类目单序列 |
| `long_rank` | bar.html B 区 | 10 长类目单序列 |
| `stacked_q` | bar.html C/D 区 | 4 季度 × 3 产品线多序列 |
| `grouped_long` / `stacked_long` | bar.html E/F 区 | 4 长类目 × 3 产品线多序列（水平形态） |
| `over_30` | bar.html G 区 | 35 类目（验证 max-count 截断） |
| `traffic` | pie.html A/B/F 区、焦点组件 | 5 渠道 |
| `completion` | pie.html C 区 | 75/25 二分（完成度） |
| `category_diff` | pie.html D 区 | 6 类目数值差异大 |
| `over_10` | pie.html E 区 | 10 块（验证 >6 聚合） |
| `custom_color` | pie.html G 区 | 5 项带 color 字段覆盖 seriesColor |
| `ability_6d` | radar.html A/B/C/I 区、焦点组件 | 6 维能力（max=100 统一） |
| `prev_period` / `this_period` | radar.html C/E/I 区 | 双主体序列（本期 vs 上期） |
| `long_label_5d` | radar.html D 区 | 5 维 4 字+标签 |
| `radar_3d` | radar.html F 区 | 3 维（最少兜底） |
| `radar_8d` | radar.html G 区 | 8 维（最多上限） |
| `custom_max` | radar.html H 区 | 5 维各 max 不同（100/200/500/50/20 等） |
| `ec_conversion` | funnel.html A/B/D 区、焦点组件 | 5 步电商转化 |
| `hr_funnel` | funnel.html C 区 | 4 步招聘 |
| `unsorted` | funnel.html D 区 | 4 步乱序输入（验证自动降序） |
| `funnel_3_step` | funnel.html E 区 | 3 层（最短可读） |
| `funnel_8_step` | funnel.html F 区 | 8 层（最长上限） |
| `funnel_custom_color` | funnel.html G 区 | 5 层带 color 字段覆盖 seriesColor |

---

## 12. 无障碍与 reduced-motion

### 12.1 chart 组件自带无障碍能力（无需 demo 补）

来自 `chart-base.js` + 各组件 `_summary` / `_srRows`：

| 能力 | 来源 | demo 演示方式 |
|---|---|---|
| `<svg role="img" aria-label>` 摘要 | `AfChart._render` | 静默生效，开发者 devtools 可查看 |
| 视觉隐藏数据表 `.sr-table` | `AfChart._render` 调 `_srRows()` | 同上 |
| tooltip `aria-live="polite"` | `tooltip.js createTooltip` | 触摸即出 |
| loading `aria-busy="true"` | `AfChart._render` | 五态演示同步生效 |
| reduced-motion 全局覆盖 | 内核 CSS 末尾 `@media` | 联动页验证 |

### 12.2 demo 站额外补充（联动页）

联动页 §10.3 已加：
- `matchMedia('(prefers-reduced-motion: reduce)')` 实时状态显示
- 主题切换按钮（验证 chart 颜色跟随 `var(--c-*)`）

### 12.3 不做的无障碍项（chart 组件本身就不做）

- 图表本体不做 roving tabindex（数据表承担可达性，上游 §6 明确）
- 不模拟键盘 select 事件（chart 是只读可视化）
- 不加 ARIA live region 重复声明数值变化（tooltip 的 polite 已足够）

---

## 13. 验收标准

### 13.1 视觉与功能验收（人工跑 `npm run demo`）

| # | 验收项 | 通过条件（对齐 §5-§10 扩展后的演示矩阵，每页 A-J/L 全覆盖） |
|---|---|---|
| 1 | demo/index.html 主入口 | 新增"图表组件" section，6 个入口可点击跳转 |
| 2 | af-chart-line.html（A-L 12 区） | A 单序列/B 多序列/C 平滑单序列/D 平滑多序列 4 种 line 形态对比；E 面积/F 平滑面积/G 面积多序列 3 种 area 形态；H 散点 20 点无连线；I sparkline 嵌 KPI 卡无轴 + 末点强调；J/K/L 五态切换；props 面板切 variant 实时生效；touch 数据点出 tooltip，松手派发 select；retry 按钮触发 K 区 error → loading → success 流 |
| 3 | af-chart-bar.html（A-J 10 区） | A 垂直柱 6 类目；B 长类目横向可读；C 垂直堆叠逐段累加；D 垂直分组并排对比；E 水平分组 bar+grouped 长类目多序列并排；F 水平堆叠 bar+stacked 长类目逐段累加；G 35 类目 → 前 4 + "其他"聚合；H/I/J 五态切换；props 切 variant/maxCount 实时生效 |
| 4 | af-chart-pie.html（A-J 10 区） | A 饼图 5 渠道；B donut 中心"合计 {total}"占位符替换为"合计 10.7K"；C 半环 center-text="75%"；D 玫瑰半径 ∝ sqrt(v) 面积正比；E 10 块 → 前 5 + "其他"聚合；F innerRadius=30/60/90 三实例同数据内径对比；G 5 项 data.color 覆盖 seriesColor 轮转；H/I/J 五态切换 |
| 5 | af-chart-radar.html（A-L 12 区） | A polygon 单主体；B circle 单主体网格切换；C polygon 双主体半透明 + 描边区分；D 维度标签超长截断 4 字 + 省略号；E >2 序列控制台 console.warn 提示且仅渲染前 2 个；F 3 维兜底三角形雷达；G 8 维标签密集可读性上限；H 5 维各 max 不同归一化渲染；I circle + 双主体对比 C 区 polygon 形态；J/K/L 五态切换 |
| 6 | af-chart-funnel.html（A-J 10 区） | A 默认带转化率标注（2400/4800=50%）；B showRate=false 无标注；C 4 步招聘场景；D 乱序输入自动降序为 浏览→加购→下单→支付；E 3 层最短可读；F 8 层最长上限标签密集可读性验证；G 5 层 data.color 覆盖 seriesColor 轮转；H/I/J 五态切换 |
| 7 | scenarios/af-chart.html（①-④ 联动场景） | ① 3 张 KPI 卡 sparkline 渲染（月活/营收/转化率）；② tabs 切换 5 chart 类型（funnel/bar/line/pie/radar）正常；③ 向下滚动 1000px 后 lazy chart 首次进入视口才渲染（IntersectionObserver 提示日志）；④ err-bar 内重试按钮 → loading → 800ms 后 success 完整流 |
| 8 | 主题切换 | 联动页 + 各组件页用 devtools 切 data-theme=dark，chart 颜色跟随 var(--c-*) 变化 |
| 9 | reduced-motion | 联动页切 devtools reduced-motion 媒体查询后，chart 入场动画消失（状态文案实时显示已启用/未启用） |
| 10 | 浏览器控制台 | 各页 F12 控制台无未捕获异常（radar.html E 区 console.warn 是预期行为，非错误） |

### 13.2 工程验收（不跑 CI 自检，但需人工核对）

| # | 项 | 通过条件 |
|---|---|---|
| 1 | 文件清单 | §3.1 的 6 个 HTML 文件全部新增；§3.2 的 demo/index.html 改动生效 |
| 2 | 不改 src/ | `git status` 显示 src/ 目录无变更（charts 子库源码零改动） |
| 3 | 不动 whitelist / 类型 | `git diff eslint-plugin-af-mobile/utils/whitelist-v1.json` / `src/charts/index.d.ts` / `src/index.d.ts` 均为空 |
| 4 | chart 体积不变 | `npm run size` 输出 chartsTotal 仍为 10.18KB（demo 不影响 src） |

### 13.3 不跑的自检（理由）

| 命令 | 不跑理由 |
|---|---|
| `npx eslint src/ test/ scripts/` | demo/ 不在 lint 范围（`eslint.config.js` 没把 demo/ 纳入） |
| `npx vitest run` | demo 文件无对应单测（demo 是人工验收产物） |
| `npm run size` | 跑一次确认 chart 体积不变即可，不阻断 |
| `npm run whitelist:check` / `types:check` / `aria:check` / `prompt:check` | demo 不动 src/，三源不变，无需重跑 |

---

## 14. 明确不做清单

| 不做 | 理由 |
|---|---|
| 在 demo 端引入 ECharts 与 chart 组件对比 | demo 站体积膨胀；chart 子库本身已与 ECharts 做过对比论证（上游详设 §2） |
| 改 chart 组件源码加 demo 专用 props | 违反"最小改动"；demo 必须用现有 API 实现 |
| 把联动页做成 scenario 模块（`af-chart.js`） | scenario 模式 schema 限单 tag 单 main selector，无法表达多组件组合 |
| 在 demo 端做 SSR/DSD 预渲染演示 | chart 是客户端渲染产物（同 af-calendar），上游 §10 已明确 |
| 加图例交互（点选隐藏序列） | 上游 §10 明确 v1 只读图例，留 v1.1 |
| 加 dataZoom / 拖拽缩放 | 上游 §10 明确不做，移动端用 af-tabs 切时间粒度替代 |
| 在联动页接 props 面板 | chart 实例每次 tab 切换都重建，props 面板的 target 引用会失效；简化为说明文案 |
| 新增 chart 组件类型 | 上游 §0.3 / §10 已明确不在范围 |
| 给 demo 加 i18n 切换 | demo 站本身是中文单语；chart 组件 i18n 已在源码内（"其他"/"暂无数据"走 `static i18n`） |
| 把 5 个组件 demo 合一页 | 违反用户决策（已选 5 页独立对齐现有模式） |

---

## 附录 A：与上游详设的对照

| 本设计章节 | 上游 [charts-sublibrary-detailed-design.md](./charts-sublibrary-detailed-design.md) 章节 |
|---|---|
| §1.1 charts API | §1 架构与目录结构 / §4 共享契约 |
| §1.2 5 组件 API | §5 组件逐个详设 |
| §5-§9 各组件 demo | §5.1-§5.5 对应组件 |
| §11 mock 数据 | —（上游无规定，本设计自定） |
| §12 无障碍 | §6 无障碍设计 |
| §14 不做清单 | §10 明确不做清单 |
