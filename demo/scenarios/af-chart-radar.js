// 沙盒场景：af-chart-radar（雷达，多维能力画像，单/双主体对比）
import { AfChartRadar } from '../../src/charts/components/af-chart-radar.js';
if (!customElements.get('af-chart-radar')) customElements.define('af-chart-radar', AfChartRadar);

export default {
  tag: 'af-chart-radar',
  name: '雷达图',
  scenarios: [
    {
      name: '基础',
      fewshot: {
        html: '<af-chart-radar id="c" shape="circle"></af-chart-radar>',
        js: `import { registerChart } from '../../src/charts/index.js'; // 子库注册，禁主入口 register
await registerChart('af-chart-radar');
const c = document.getElementById('c');
c.data = [{ label: '性能', max: 100 }, { label: '易用', max: 100 }];
c.series = [{ name: '机型 A', values: [90, 75] }];`,
        note: '子库注册（registerChart）；data=[{label, max}] 定维度 + series[{name, values}] 定主体；shape：polygon/circle',
      },
      html: '<af-chart-radar id="demo" legend></af-chart-radar>',
      main: { selector: '#demo' },
      props: [
        { prop: 'shape', label: '网格形态', type: 'select', options: ['polygon', 'circle'] },
        { prop: 'legend', label: '图例', type: 'boolean' },
        { prop: 'height', label: '高度(px)', type: 'number', min: 200, max: 400, step: 20 },
        { prop: 'loading', label: 'loading 态', type: 'boolean' },
        { prop: 'error', label: 'error 文案', type: 'string' },
      ],
      events: ['af-chart-radar:select', 'af-chart-radar:retry'],
      styleTokens: [
        { token: '--c-border', label: '网格', type: 'color' },
        { token: '--c-muted', label: '标签', type: 'color' },
        { token: '--c-brand', label: '主序列色', type: 'color' },
      ],
      init() {
        const el = document.getElementById('demo');
        el.data = [
          { label: '性能', max: 100 },
          { label: '易用', max: 100 },
          { label: '外观', max: 100 },
          { label: '续航', max: 100 },
          { label: '价格', max: 100 },
        ];
        el.series = [
          { name: '机型 A', values: [90, 75, 80, 70, 60] },
          { name: '机型 B', values: [70, 90, 65, 85, 80] },
        ];
      },
    },
    {
      name: '单主体画像',
      html: '<af-chart-radar id="demo2"></af-chart-radar><p class="caption" id="demo2-log">data 值模式：不传 series 时单序列渲染，各维可设不同 max 上限</p>',
      main: { selector: '#demo2' },
      props: [
        { prop: 'shape', label: '网格形态', type: 'select', options: ['polygon', 'circle'] },
        { prop: 'height', label: '高度(px)', type: 'number', min: 200, max: 400, step: 20 },
        { prop: 'loading', label: 'loading 态', type: 'boolean' },
        { prop: 'error', label: 'error 文案', type: 'string' },
      ],
      events: ['af-chart-radar:select', 'af-chart-radar:retry'],
      styleTokens: [
        { token: '--c-border', label: '网格', type: 'color' },
        { token: '--c-muted', label: '标签', type: 'color' },
        { token: '--c-brand', label: '主序列色', type: 'color' },
      ],
      init() {
        const el = document.getElementById('demo2');
        el.data = [
          { label: '性能', value: 92, max: 100 },
          { label: '易用', value: 85, max: 90 },
          { label: '外观', value: 78, max: 100 },
          { label: '续航', value: 88, max: 120 },
          { label: '价格', value: 60, max: 100 },
        ];
      },
    },
  ],
};
