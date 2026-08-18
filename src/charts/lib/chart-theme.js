// af-mobile UI charts —— 取色策略 + 图表共享 Shadow CSS
// 详见 docs/design/charts-sublibrary-detailed-design.md §3.4
//
// 取色不新增 L1 token：直接引用 var(--c-*)，SVG fill/stroke 属性原生支持 CSS 变量，
// 主题切换（data-theme → themechange）由浏览器自动重解析，组件零重绘。

// 6 色序列：前 5 个语义色轮转，第 6 色起 brand + fill-opacity 分层
export const CHART_COLORS = [
  'var(--c-brand)', 'var(--c-success)', 'var(--c-warn)', 'var(--c-danger)', 'var(--c-muted)',
];

// 序列 i 的填充色（数据项可带 color 字段覆盖，优先级在组件侧处理）
export function seriesColor(i) {
  return CHART_COLORS[i % CHART_COLORS.length];
}

// 序列 i 的透明度（i ≥ 5 后靠透明度阶梯区分，防序列色耗尽）
export function seriesOpacity(i) {
  return i < CHART_COLORS.length ? 1 : Math.max(0.9 - (i - CHART_COLORS.length + 1) * 0.15, 0.35);
}

// 五组件共享 Shadow CSS（宿主布局 / 图例 / tooltip / 五态 / sr-table / reduced-motion）
// wc-shadow-use-token：全部视觉属性用 var(--*)（top/left 用无单位 0）
export const CHART_CSS = `
:host { display: block; width: 100%; }
.chart-wrap { position: relative; }
svg { display: block; width: 100%; overflow: visible; }
.chart-legend { display: flex; flex-wrap: wrap; gap: var(--s-2); padding-top: var(--s-1); }
.chart-legend-item { display: flex; align-items: center; gap: var(--s-1); font-size: var(--t-xs); color: var(--c-muted); }
.chart-legend-dot { width: var(--s-2); height: var(--s-2); border-radius: var(--r-f); }
.chart-tooltip {
  position: absolute; top: 0; left: 0; z-index: 1; pointer-events: none;
  padding: var(--s-1) var(--s-2); font-size: var(--t-xs); line-height: 1.5;
  color: var(--c-text); background: var(--c-card); border: 1px solid var(--c-border);
  border-radius: var(--r-m); box-shadow: var(--shadow-sm); white-space: nowrap;
}
.chart-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--s-2);
  min-height: var(--s-6); color: var(--c-muted); font-size: var(--t-sm); }
.chart-state .chart-retry { border: 1px solid var(--c-border); background: var(--c-card); color: var(--c-brand);
  font-size: var(--t-sm); border-radius: var(--r-m); padding: var(--s-1) var(--s-3); }
.chart-skeleton { width: 100%; border-radius: var(--r-m); animation: chart-shimmer 1.4s ease-in-out infinite; }
@keyframes chart-shimmer { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.sr-table { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
svg .chart-enter { animation: chart-fade 0.5s ease-out; }
@keyframes chart-fade { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .chart-skeleton, svg .chart-enter { animation: none; }
}
`;
