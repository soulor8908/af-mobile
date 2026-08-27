// 沙盒场景：af-chart-pie（饼/环形/半环/玫瑰）
import { AfChartPie } from '../../src/charts/components/af-chart-pie.js';
if (!customElements.get('af-chart-pie')) customElements.define('af-chart-pie', AfChartPie);

export default {
  tag: 'af-chart-pie',
  name: '饼/环形图',
  scenarios: [
    {
      name: '基础',
      html: '<af-chart-pie id="demo" legend></af-chart-pie>',
      main: { selector: '#demo' },
      props: [
        { prop: 'variant', label: '形态', type: 'select', options: ['pie', 'donut', 'half', 'rose'] },
        { prop: 'innerRadius', label: '内半径(%)', type: 'number', min: 0, max: 90, step: 5 },
        { prop: 'centerText', label: '中心文字', type: 'string' },
        { prop: 'legend', label: '图例', type: 'boolean' },
        { prop: 'height', label: '高度(px)', type: 'number', min: 160, max: 400, step: 20 },
        { prop: 'loading', label: 'loading 态', type: 'boolean' },
        { prop: 'error', label: 'error 文案', type: 'string' },
      ],
      events: ['af-chart-pie:select', 'af-chart-pie:retry'],
      styleTokens: [
        { token: '--c-border', label: '坐标轴', type: 'color' },
        { token: '--c-muted', label: '标签', type: 'color' },
        { token: '--c-brand', label: '主序列色', type: 'color' },
      ],
      init() {
        const el = document.getElementById('demo');
        el.data = [
          { label: '直接访问', value: 1048 },
          { label: '搜索引擎', value: 735 },
          { label: '社交媒体', value: 580 },
          { label: '广告投放', value: 484 },
          { label: '其他', value: 300 },
        ];
      },
    },
    {
      name: '环形中心 KPI',
      html: '<af-chart-pie id="demo2" variant="donut" center-text="总访问 {total}" legend></af-chart-pie><p class="caption" id="demo2-log">centerText 支持 {total} 占位符，渲染时替换为合计值</p>',
      main: { selector: '#demo2' },
      props: [
        { prop: 'variant', label: '形态', type: 'select', options: ['pie', 'donut', 'half', 'rose'] },
        { prop: 'innerRadius', label: '内半径(%)', type: 'number', min: 0, max: 90, step: 5 },
        { prop: 'centerText', label: '中心文字', type: 'string' },
        { prop: 'legend', label: '图例', type: 'boolean' },
        { prop: 'height', label: '高度(px)', type: 'number', min: 160, max: 400, step: 20 },
        { prop: 'loading', label: 'loading 态', type: 'boolean' },
        { prop: 'error', label: 'error 文案', type: 'string' },
      ],
      events: ['af-chart-pie:select', 'af-chart-pie:retry'],
      styleTokens: [
        { token: '--c-border', label: '坐标轴', type: 'color' },
        { token: '--c-muted', label: '标签', type: 'color' },
        { token: '--c-brand', label: '主序列色', type: 'color' },
      ],
      init() {
        const el = document.getElementById('demo2');
        el.data = [
          { label: '直接访问', value: 1048 },
          { label: '搜索引擎', value: 735 },
          { label: '社交媒体', value: 580 },
          { label: '广告投放', value: 484 },
          { label: '其他', value: 300 },
        ];
      },
    },
  ],
};
