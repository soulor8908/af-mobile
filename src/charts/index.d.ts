// af-mobile UI —— charts 图表子库类型声明（@af-mobile/ui/charts）
// ⚠️ 手工维护：新增图表组件时须同步追加 class 声明，CI 的 types-sync 检查会校验一致
// 详见 docs/design/charts-sublibrary-detailed-design.md

/// <reference lib="dom" />

import type { AfElement } from '../index';

/** 图表数据点（单序列） */
export interface ChartDatum {
  /** 类目标签（line/bar 的 x 轴 / pie 的扇区名） */
  label?: string;
  /** 数值 */
  value?: number;
  /** 显式色值（缺省走序列色轮转 var(--c-*)） */
  color?: string;
}

/** 多序列（仅 line/bar） */
export interface ChartSeries {
  /** 序列名（图例/tooltip 展示） */
  name?: string;
  /** 数值序列（与 labels 对齐） */
  values?: number[];
}

/** 图表通用属性（五态 + 布局） */
export interface ChartCommonProps {
  /** 图表高度 px（spark 变体默认 60，其余 240） */
  height?: number;
  /** 显示图例（色点 + 名称，只读） */
  legend?: boolean;
  /** loading 态（图表形骨架 + aria-busy） */
  loading?: boolean;
  /** error 态文案（非空即错误态，含重试按钮 → af-chart-{x}:retry） */
  error?: string;
  /** 离屏懒渲染（IntersectionObserver 首次可见才绘制） */
  lazy?: boolean;
}

/** 数据点选择事件 detail（tap 数据点/扇区时派发） */
export interface ChartSelectDetail {
  /** 数据点索引 */
  index: number;
  /** 序列索引（单序列恒 0） */
  seriesIndex: number;
  /** 类目标签 */
  label?: string;
  /** 数值 */
  value?: number;
}

/** 重试事件 detail（error 态点重试按钮） */
export interface ChartRetryDetail {}

// ============================================================
// af-chart-line：折线/面积/散点/迷你趋势
// ============================================================

export class AfChartLine extends AfElement implements ChartCommonProps {
  static useShadow: true;
  static tag: 'af-chart-line';
  /** 单序列数据 [{label,value,color?}]（与 labels+series 互斥，series 优先） */
  data?: ChartDatum[];
  /** 多序列类目标签 */
  labels?: string[];
  /** 多序列 [{name,values}]（与 data 互斥，优先） */
  series?: ChartSeries[];
  /** line | area | scatter | spark */
  variant?: 'line' | 'area' | 'scatter' | 'spark';
  /** Catmull-Rom 平滑曲线（line/area 有效） */
  smooth?: boolean;
  /** 显示坐标轴（spark 自动忽略） */
  showAxis?: boolean;
  height?: number;
  legend?: boolean;
  loading?: boolean;
  error?: string;
  lazy?: boolean;
  addEventListener(type: 'af-chart-line:select', listener: (e: CustomEvent<ChartSelectDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'af-chart-line:retry', listener: (e: CustomEvent<ChartRetryDetail>) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-chart-bar：柱状/条形/堆叠/分组
// ============================================================

export class AfChartBar extends AfElement implements ChartCommonProps {
  static useShadow: true;
  static tag: 'af-chart-bar';
  data?: ChartDatum[];
  labels?: string[];
  series?: ChartSeries[];
  /** column（垂直柱）| bar（水平条形）| stacked（堆叠柱）| grouped（分组柱） */
  variant?: 'column' | 'bar' | 'stacked' | 'grouped';
  /** 类目数上限（超出截断为前 N-1 + "其他"聚合，默认 30） */
  maxCount?: number;
  height?: number;
  legend?: boolean;
  loading?: boolean;
  error?: string;
  lazy?: boolean;
  addEventListener(type: 'af-chart-bar:select', listener: (e: CustomEvent<ChartSelectDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'af-chart-bar:retry', listener: (e: CustomEvent<ChartRetryDetail>) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-chart-pie：饼/环形/半环/玫瑰
// ============================================================

export class AfChartPie extends AfElement implements ChartCommonProps {
  static useShadow: true;
  static tag: 'af-chart-pie';
  data?: ChartDatum[];
  /** pie | donut | half（半环）| rose（半径映射数值，面积正比） */
  variant?: 'pie' | 'donut' | 'half' | 'rose';
  /** donut 内径百分比（0-99，默认 60） */
  innerRadius?: number;
  /** donut/half 中心 KPI 文案（{total} 占位符替换合计） */
  centerText?: string;
  height?: number;
  legend?: boolean;
  loading?: boolean;
  error?: string;
  lazy?: boolean;
  addEventListener(type: 'af-chart-pie:select', listener: (e: CustomEvent<ChartSelectDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'af-chart-pie:retry', listener: (e: CustomEvent<ChartRetryDetail>) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-chart-radar：雷达（多维能力画像，单/双主体对比）
// ============================================================

/** 雷达维度定义 */
export interface RadarDatum {
  /** 维度名（超长截断 4 字 + 省略号） */
  label?: string;
  /** 数值（series 存在时作为维度名/max 载体） */
  value?: number;
  /** 该维满分（缺省取全体最大值） */
  max?: number;
}

export class AfChartRadar extends AfElement implements ChartCommonProps {
  static useShadow: true;
  static tag: 'af-chart-radar';
  /** 维度定义 [{label,value,max?}]（3-8 维） */
  data?: RadarDatum[];
  /** 对比主体 [{name,values}]（>2 个仅渲染前 2 并 console.warn） */
  series?: ChartSeries[];
  /** polygon（多边形网格）| circle（同心圆网格） */
  shape?: 'polygon' | 'circle';
  height?: number;
  legend?: boolean;
  loading?: boolean;
  error?: string;
  lazy?: boolean;
  addEventListener(type: 'af-chart-radar:select', listener: (e: CustomEvent<ChartSelectDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'af-chart-radar:retry', listener: (e: CustomEvent<ChartRetryDetail>) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-chart-funnel：漏斗（梯形堆叠 + 层间转化率标注）
// ============================================================

export class AfChartFunnel extends AfElement implements ChartCommonProps {
  static useShadow: true;
  static tag: 'af-chart-funnel';
  /** 层数据 [{label,value}]（自动按 value 降序排，非正值过滤） */
  data?: ChartDatum[];
  /** 层间转化率标注（v[i]/v[i-1] 百分比） */
  showRate?: boolean;
  height?: number;
  legend?: boolean;
  loading?: boolean;
  error?: string;
  lazy?: boolean;
  addEventListener(type: 'af-chart-funnel:select', listener: (e: CustomEvent<ChartSelectDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'af-chart-funnel:retry', listener: (e: CustomEvent<ChartRetryDetail>) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// 注册辅助（保持 Tree Shaking：推荐按需注册）
// ============================================================

/** 标签 → 组件类映射 */
export const CHART_TAGS: {
  'af-chart-line': typeof AfChartLine;
  'af-chart-bar': typeof AfChartBar;
  'af-chart-pie': typeof AfChartPie;
  'af-chart-radar': typeof AfChartRadar;
  'af-chart-funnel': typeof AfChartFunnel;
};

/** 注册图表组件（变参，与主库 register(...tags) 语义一致）：registerChart('af-chart-line', 'af-chart-bar') */
export function registerChart(...tags: Array<keyof typeof CHART_TAGS>): void;

/** 注册全部图表组件（失去 Tree Shaking） */
export function registerCharts(): void;

// ============================================================
// 内核导出（高级用法 / Phase 2 radar、funnel 复用）
// ============================================================

export { niceTicks, linear } from './lib/scale';
export { linePath, areaPath, arcPath, polar, radarPath, funnelPath, fmtNum } from './lib/geometry';
export { svgEl, bindResize, bindLazy } from './lib/render';
export { CHART_COLORS, seriesColor, seriesOpacity, CHART_CSS } from './lib/chart-theme';
export { createTooltip, nearestIndex } from './lib/tooltip';
export { AfChart } from './lib/chart-base';
