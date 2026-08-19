// 沙盒场景：af-chart-bar（柱状/条形/堆叠/分组）
// 组件属独立子库 src/charts，未被 registerAll 注册，需在模块内自定义元素。
import { AfChartBar } from '../../src/charts/components/af-chart-bar.js';
if (!customElements.get('af-chart-bar')) customElements.define('af-chart-bar', AfChartBar);

export default {
  tag: 'af-chart-bar',
  name: '柱状/条形图',
  scenarios: [
    {
      name: '基础',
      html: '<af-chart-bar id="demo" legend></af-chart-bar>',
      main: { selector: '#demo' },
      props: [
        { prop: 'variant', label: '形态', type: 'select', options: ['column', 'bar', 'stacked', 'grouped'] },
        { prop: 'legend', label: '图例', type: 'boolean' },
        { prop: 'maxCount', label: '类目上限', type: 'number', min: 3, max: 30, step: 1 },
        { prop: 'height', label: '高度(px)', type: 'number', min: 160, max: 400, step: 20 },
        { prop: 'loading', label: 'loading 态', type: 'boolean' },
        { prop: 'error', label: 'error 文案', type: 'string' },
      ],
      events: ['af-chart-bar:select', 'af-chart-bar:retry'],
      styleTokens: [
        { token: '--c-border', label: '坐标轴', type: 'color' },
        { token: '--c-muted', label: '标签', type: 'color' },
        { token: '--c-brand', label: '主序列色', type: 'color' },
      ],
      init() {
        const el = document.getElementById('demo');
        el.labels = ['手机', '笔记本', '平板', '手表', '耳机', '音箱'];
        el.series = [{ name: '销量', values: [1280, 960, 540, 420, 680, 310] }];
      },
    },
  ],
};
