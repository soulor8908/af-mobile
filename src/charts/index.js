// af-mobile UI —— charts 图表子库入口（@af-mobile/ui/charts）
// 独立入口：不进主 index.js，不 import 不加载，主库体积预算零影响
// 详见 docs/design/charts-sublibrary-detailed-design.md §1
// ===== gen:entry:start（由 scripts/gen-entry.mjs 自动生成，勿手改；新增组件后跑 npm run entry）
import { AfChartBar } from './components/af-chart-bar.js';
import { AfChartFunnel } from './components/af-chart-funnel.js';
import { AfChartLine } from './components/af-chart-line.js';
import { AfChartPie } from './components/af-chart-pie.js';
import { AfChartRadar } from './components/af-chart-radar.js';

export { AfChartBar, AfChartFunnel, AfChartLine, AfChartPie, AfChartRadar };
// ===== gen:entry:end
// 内核（高级用法 / 自定义图表复用）
export { niceTicks, linear } from './lib/scale.js';
export { linePath, areaPath, arcPath, polar, radarPath, funnelPath, fmtNum } from './lib/geometry.js';
export { svgEl, bindResize, bindLazy } from './lib/render.js';
export { CHART_COLORS, seriesColor, seriesOpacity, CHART_CSS } from './lib/chart-theme.js';
export { createTooltip, nearestIndex } from './lib/tooltip.js';
export { AfChart } from './lib/chart-base.js';

// ===== gen:tags:start（由 scripts/gen-entry.mjs 自动生成，勿手改；新增组件后跑 npm run entry）
// 标签 → 类映射（registerChart 用）
export const CHART_TAGS = {
  'af-chart-bar': AfChartBar,
  'af-chart-funnel': AfChartFunnel,
  'af-chart-line': AfChartLine,
  'af-chart-pie': AfChartPie,
  'af-chart-radar': AfChartRadar,
};
// ===== gen:tags:end

// 注册单个图表组件（保持 Tree Shaking；幂等，重复调用安全）
export function registerChart(tag) {
  const C = CHART_TAGS[tag];
  if (!C) throw new Error(`[af-mobile/charts] 未知图表标签：${tag}`);
  if (!customElements.get(tag)) customElements.define(tag, C);
}

// 注册全部图表组件（失去 Tree Shaking，全量 5 个）
export function registerCharts() {
  for (const tag of Object.keys(CHART_TAGS)) registerChart(tag);
}
