// 沙盒场景：af-chart-line（折线/面积/散点/迷你趋势）
import { AfChartLine } from '../../src/charts/components/af-chart-line.js';
if (!customElements.get('af-chart-line')) customElements.define('af-chart-line', AfChartLine);

export default {
  tag: 'af-chart-line',
  name: '折线/面积图',
  scenarios: [
    {
      name: '基础',
      html: '<af-chart-line id="demo" legend></af-chart-line>',
      main: { selector: '#demo' },
      props: [
        { prop: 'variant', label: '形态', type: 'select', options: ['line', 'area', 'scatter', 'spark'] },
        { prop: 'smooth', label: '平滑曲线', type: 'boolean' },
        { prop: 'showAxis', label: '显示坐标轴', type: 'boolean' },
        { prop: 'legend', label: '图例', type: 'boolean' },
        { prop: 'height', label: '高度(px)', type: 'number', min: 120, max: 400, step: 20 },
        { prop: 'loading', label: 'loading 态', type: 'boolean' },
        { prop: 'error', label: 'error 文案', type: 'string' },
      ],
      events: ['af-chart-line:select', 'af-chart-line:retry'],
      styleTokens: [
        { token: '--c-border', label: '坐标轴', type: 'color' },
        { token: '--c-muted', label: '标签', type: 'color' },
        { token: '--c-brand', label: '主序列色', type: 'color' },
      ],
      init() {
        const el = document.getElementById('demo');
        el.labels = ['1月', '2月', '3月', '4月', '5月', '6月'];
        el.series = [
          { name: '访问量', values: [320, 410, 380, 520, 610, 580] },
          { name: '下单量', values: [80, 110, 95, 140, 170, 160] },
        ];
      },
    },
  ],
};
