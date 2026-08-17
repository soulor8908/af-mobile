// AIFlow UI —— af-stepper Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-stepper',
  scenarios: [
    {
      name: '数量选择',
      html: `
        <div class="card p-3">
          <div class="cell"><span class="body">购买数量</span><af-stepper id="st" value="2"></af-stepper></div>
          <div class="cell"><span class="body">限购(1-5)</span><af-stepper id="st2" min="1" max="5" value="3"></af-stepper></div>
          <div class="cell"><span class="body">步长 5</span><af-stepper id="st3" step="5" max="100" value="10"></af-stepper></div>
        </div>
      `,
      main: { selector: '#st' },
      props: [
        { prop: 'value', label: '数值', type: 'number', min: 0, max: 99, step: 1 },
        { prop: 'min', label: '最小值', type: 'number', min: -99, max: 99, step: 1 },
        { prop: 'max', label: '最大值', type: 'number', min: 0, max: 999, step: 1 },
        { prop: 'step', label: '步长', type: 'number', min: 1, max: 10, step: 1 },
        { prop: 'disabled', label: '禁用', type: 'boolean' },
      ],
      evts: ['af-stepper:change'],
      tokens: [
        { token: '--c-onbrand', label: '品牌色', type: 'color' },
      ],
    },
  ],
};