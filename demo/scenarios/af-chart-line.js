// 沙盒场景：af-chart-line（折线/面积/散点/迷你趋势）
import { AfChartLine } from '../../src/charts/components/af-chart-line.js';
if (!customElements.get('af-chart-line')) customElements.define('af-chart-line', AfChartLine);

export default {
  tag: 'af-chart-line',
  name: '折线/面积图',
  scenarios: [
    {
      name: '基础',
      fewshot: {
        html: '<af-chart-line id="c" smooth legend></af-chart-line>',
        js: `import { registerChart } from '../../src/charts/index.js'; // 子库注册，禁主入口 register
await registerChart('af-chart-line');
const c = document.getElementById('c');
c.labels = ['周一', '周二', '周三'];
c.series = [{ name: '销售额', values: [1280, 960, 540] }];`,
        note: '子库注册（registerChart）；labels + series[{name, values}]；variant：line/area/scatter/spark，select/retry 事件',
      },
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
    {
      name: '迷你趋势 spark',
      html: `
        <div class="card">
          <div class="cell f aic jcsb"><span class="body">本周访问量</span><span class="stat-num">2,820</span></div>
          <af-chart-line id="demo2" variant="spark" height="96"></af-chart-line>
          <p class="caption">spark 形态：无坐标轴与 tooltip，适合 KPI 卡内嵌；tap 不派发 select</p>
        </div>
      `,
      main: { selector: '#demo2' },
      props: [
        { prop: 'variant', label: '形态', type: 'select', options: ['line', 'area', 'scatter', 'spark'] },
        { prop: 'smooth', label: '平滑曲线', type: 'boolean' },
        { prop: 'height', label: '高度(px)', type: 'number', min: 60, max: 400, step: 12 },
        { prop: 'loading', label: 'loading 态', type: 'boolean' },
        { prop: 'error', label: 'error 文案', type: 'string' },
      ],
      events: ['af-chart-line:retry'],
      styleTokens: [
        { token: '--c-brand', label: '主序列色', type: 'color' },
      ],
      init() {
        const el = document.getElementById('demo2');
        el.labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        el.series = [{ name: '访问量', values: [320, 410, 380, 520, 610, 340, 240] }];
      },
    },
  ],
};
