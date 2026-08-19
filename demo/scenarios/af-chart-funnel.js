// 沙盒场景：af-chart-funnel（漏斗，梯形堆叠 + 层间转化率）
import { AfChartFunnel } from '../../src/charts/components/af-chart-funnel.js';
if (!customElements.get('af-chart-funnel')) customElements.define('af-chart-funnel', AfChartFunnel);

export default {
  tag: 'af-chart-funnel',
  name: '漏斗图',
  scenarios: [
    {
      name: '基础',
      html: '<af-chart-funnel id="demo"></af-chart-funnel>',
      main: { selector: '#demo' },
      props: [
        { prop: 'showRate', label: '显示转化率', type: 'boolean' },
        { prop: 'height', label: '高度(px)', type: 'number', min: 160, max: 400, step: 20 },
        { prop: 'loading', label: 'loading 态', type: 'boolean' },
        { prop: 'error', label: 'error 文案', type: 'string' },
      ],
      events: ['af-chart-funnel:select', 'af-chart-funnel:retry'],
      styleTokens: [
        { token: '--c-border', label: '边框', type: 'color' },
        { token: '--c-muted', label: '标签', type: 'color' },
        { token: '--c-brand', label: '主色', type: 'color' },
      ],
      init() {
        const el = document.getElementById('demo');
        el.data = [
          { label: '曝光', value: 10000 },
          { label: '点击', value: 6200 },
          { label: '加购', value: 3100 },
          { label: '下单', value: 1400 },
          { label: '支付', value: 980 },
        ];
      },
    },
  ],
};
